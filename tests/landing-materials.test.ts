import { describe, it, expect } from "vitest";
import {
  paperGeometry,
  surfaceHeight,
  type SurfaceKind,
} from "../src/landing/material-details";
describe("gradebook materials", () => {
  it.each<SurfaceKind>(["cloth", "paper", "wood"])(
    "has deterministic bounded %s surface relief",
    (kind) => {
      const samples = new Set<number>();
      for (let y = 0; y < 30; y++)
        for (let x = 0; x < 30; x++) {
          const height = surfaceHeight(x, y, kind);
          expect(height).toBe(surfaceHeight(x, y, kind));
          expect(height).toBeGreaterThanOrEqual(0);
          expect(height).toBeLessThanOrEqual(1);
          samples.add(height);
        }
      expect(samples.size).toBeGreaterThan(100);
    },
  );
  it("keeps the paper hinge flat and gently curls its free edge", () => {
    const page = paperGeometry();
    const p = page.getAttribute("position");
    const normals = page.getAttribute("normal");
    for (let i = 0; i < p.count; i++) {
      if (p.getX(i) < -2.04) expect(p.getZ(i)).toBeCloseTo(0, 6);
      if (p.getX(i) > 2.04) expect(p.getZ(i)).toBeGreaterThan(0.04);
      expect(Math.abs(p.getZ(i))).toBeLessThan(0.07);
      expect(Number.isFinite(normals.getZ(i))).toBe(true);
    }
    expect(page.getAttribute("uv").count).toBe(p.count);
    page.dispose();
  });
});
