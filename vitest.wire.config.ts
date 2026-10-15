import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { include: ["tests/hac-wire.integration.ts"], testTimeout: 45000 },
});
