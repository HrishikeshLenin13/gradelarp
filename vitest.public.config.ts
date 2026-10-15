import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { include: ["tests/hac-public.integration.ts"], testTimeout: 25000 },
});
