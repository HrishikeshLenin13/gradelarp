import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { ProductSchema, migrateLegacy, type ProductData } from "./model";
export const PRODUCT_DATABASE = "gradelarp-product-v2";
interface Envelope {
  revision: number;
  data: ProductData;
}
interface ProductDB extends DBSchema {
  workspace: { key: string; value: Envelope };
  preservation: { key: string; value: unknown };
}
let database: Promise<IDBPDatabase<ProductDB>> | null = null;
function db() {
  return (database ??= openDB<ProductDB>(PRODUCT_DATABASE, 1, {
    upgrade(d) {
      d.createObjectStore("workspace");
      d.createObjectStore("preservation");
    },
    blocking() {
      database?.then((d) => d.close());
      database = null;
    },
  }).catch((e) => {
    database = null;
    throw e;
  }));
}
async function legacyRaw(): Promise<unknown | null> {
  const legacy = await openDB("gradelarp", 1, {
    upgrade(d) {
      d.createObjectStore("workspace");
    },
  });
  try {
    return (await legacy.get("workspace", "state")) ?? null;
  } finally {
    legacy.close();
  }
}
export const productProvider = {
  async load(): Promise<Envelope> {
    const d = await db();
    const existing = await d.get("workspace", "current");
    if (existing) {
      const parsed = ProductSchema.parse(existing.data),
        clean = removeDemonstrations(parsed);
      if (clean !== parsed) {
        const tx = d.transaction("workspace", "readwrite");
        const latest = await tx.store.get("current");
        if (latest && latest.revision === existing.revision) {
          const next = { revision: existing.revision + 1, data: clean };
          await tx.store.put(next, "current");
          await tx.done;
          return next;
        }
        await tx.done;
        return this.load();
      }
      return { ...existing, data: clean };
    }
    const raw = await legacyRaw();
    const data = migrateLegacy(raw);
    const tx = d.transaction(["workspace", "preservation"], "readwrite");
    const concurrent = await tx.objectStore("workspace").get("current");
    if (concurrent) {
      await tx.done;
      return { ...concurrent, data: ProductSchema.parse(concurrent.data) };
    }
    const envelope = { revision: 0, data };
    if (raw !== null && !(raw as { demo?: boolean }).demo)
      await tx.objectStore("preservation").put(raw, "legacy-original");
    await tx.objectStore("workspace").put(envelope, "current");
    await tx.done;
    return envelope;
  },
  async save(data: ProductData, expectedRevision: number): Promise<number> {
    const valid = removeDemonstrations(ProductSchema.parse(data));
    const d = await db();
    const tx = d.transaction("workspace", "readwrite");
    const current = await tx.store.get("current");
    if (current && current.revision !== expectedRevision) {
      await tx.done;
      throw new Error(
        "Another tab saved newer data. Export your unsaved backup, then reload to continue.",
      );
    }
    const revision = expectedRevision + 1;
    await tx.store.put({ revision, data: valid }, "current");
    await tx.done;
    return revision;
  },
  async preservedLegacy() {
    return (await db()).get("preservation", "legacy-original");
  },
};
