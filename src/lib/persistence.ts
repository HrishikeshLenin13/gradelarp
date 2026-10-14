import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { StateSchema, type AppState } from "./model";
/** A replaceable boundary for future approved grade providers. */
export interface DataProvider {
  load(): Promise<AppState | null>;
  save(state: AppState): Promise<void>;
  clear(): Promise<void>;
}
interface WorkspaceDB extends DBSchema {
  workspace: { key: string; value: AppState };
}
export class LocalDataProvider implements DataProvider {
  private database: Promise<IDBPDatabase<WorkspaceDB>> | null = null;
  private db() {
    if (!this.database) {
      this.database = openDB<WorkspaceDB>("gradelarp", 1, {
        upgrade(db) {
          db.createObjectStore("workspace");
        },
        blocking: () => {
          this.database?.then((db) => db.close());
          this.database = null;
        },
      }).catch((error) => {
        this.database = null;
        throw error;
      });
    }
    return this.database;
  }
  async load() {
    const db = await this.db();
    const data = await db.get("workspace", "state");
    return data ? StateSchema.parse(data) : null;
  }
  async save(state: AppState) {
    const db = await this.db();
    await db.put("workspace", StateSchema.parse(state), "state");
  }
  async clear() {
    const db = await this.db();
    await db.clear("workspace");
  }
}
export const provider = new LocalDataProvider();
