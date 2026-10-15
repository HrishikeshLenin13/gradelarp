import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { z } from "zod";
import { StateSchema } from "@/lib/model";
import { createDemo } from "@/lib/demo";
import type { Direction } from "./types";
export const LAB_DATABASE = "gradelarp-design-lab-v1";
export const LabPreferencesSchema = z.object({
  appearance: z.enum(["dark", "light", "system"]),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  density: z.enum(["compact", "spacious"]),
  motion: z.enum(["subtle", "none"]),
  sidebar: z.enum(["expanded", "compact"]),
  chart: z.enum(["bars", "dots"]),
  showAnalysis: z.boolean(),
  showUpcoming: z.boolean(),
});
export type LabPreferences = z.infer<typeof LabPreferencesSchema>;
export const LabWorkspaceSchema = z.object({
  state: StateSchema,
  preferences: LabPreferencesSchema,
  completed: z.array(z.string()).default([]),
});
export type LabWorkspaceData = z.infer<typeof LabWorkspaceSchema>;
export function defaultPreferences(direction: Direction): LabPreferences {
  return {
    appearance: direction === "precision" ? "dark" : "light",
    accent:
      direction === "precision"
        ? "#709bdf"
        : direction === "expressive"
          ? "#93536f"
          : "#267467",
    density: direction === "precision" ? "compact" : "spacious",
    motion: "subtle",
    sidebar: direction === "expressive" ? "compact" : "expanded",
    chart: "bars",
    showAnalysis: true,
    showUpcoming: true,
  };
}
export function createLabWorkspace(direction: Direction): LabWorkspaceData {
  return {
    state: emptyState(),
    preferences: defaultPreferences(direction),
    completed: [],
  };
}
interface LabDB extends DBSchema {
  workspaces: { key: Direction; value: LabWorkspaceData };
}
export class DesignLabProvider {
  private connection: Promise<IDBPDatabase<LabDB>> | null = null;
  private db() {
    if (!this.connection)
      this.connection = openDB<LabDB>(LAB_DATABASE, 1, {
        upgrade(db) {
          db.createObjectStore("workspaces");
        },
      }).catch((error) => {
        this.connection = null;
        throw error;
      });
    return this.connection;
  }
  async load(direction: Direction) {
    const db = await this.db();
    const value = await db.get("workspaces", direction);
    return value ? LabWorkspaceSchema.parse(value) : null;
  }
  async save(direction: Direction, value: LabWorkspaceData) {
    const db = await this.db();
    await db.put("workspaces", LabWorkspaceSchema.parse(value), direction);
  }
}
export const labProvider = new DesignLabProvider();
