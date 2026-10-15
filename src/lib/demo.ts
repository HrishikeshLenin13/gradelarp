import { defaultPolicy, defaultSettings, type AppState } from "./model";
export function emptyState(): AppState {
  return {
    version: 1,
    demo: false,
    courses: [],
    settings: { ...defaultSettings, name: "Student" },
    policy: { ...defaultPolicy },
    snapshots: [],
  };
}
