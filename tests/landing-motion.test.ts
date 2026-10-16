import { describe, it, expect } from "vitest";
import {
  cameraStops,
  routeTime,
  settleValue,
} from "../src/landing/scene-motion";
import { chapterOpacity, chapterStops } from "../src/landing/study-state";

describe("cinematic motion", () => {
  it("preserves every art-directed camera keyframe", () => {
    cameraStops.forEach((p, i) => expect(routeTime(p)).toBeCloseTo(i / 9, 12));
  });
  it("stays monotone and bounded through the whole story", () => {
    let previous = 0;
    for (let i = 0; i <= 2000; i++) {
      const t = routeTime(i / 2000);
      expect(t).toBeGreaterThanOrEqual(previous);
      expect(t).toBeLessThanOrEqual(1);
      previous = t;
    }
    expect(routeTime(-1)).toBe(0);
    expect(routeTime(2)).toBe(1);
  });
  it("maintains continuous nonzero velocity at interior camera poses", () => {
    const e = 1e-7;
    cameraStops.slice(1, -1).forEach((p) => {
      const left = (routeTime(p) - routeTime(p - e)) / e;
      const right = (routeTime(p + e) - routeTime(p)) / e;
      expect(left).toBeGreaterThan(0);
      expect(Math.abs(left - right)).toBeLessThan(0.0002);
    });
  });
  it("damps at the same rate across 30/60/120 Hz without overshoot", () => {
    const results = [30, 60, 120].map((fps) => {
      let x = 0;
      for (let i = 0; i < fps / 5; i++) {
        x = settleValue(x, 1, 1 / fps);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(1);
      }
      return x;
    });
    expect(results[0]).toBeCloseTo(results[1], 10);
    expect(results[1]).toBeCloseTo(results[2], 10);
  });
  it("snaps exactly to rest so the demand renderer can stop", () => {
    let x = 0;
    for (let i = 0; i < 120; i++) x = settleValue(x, 1, 1 / 60);
    expect(x).toBe(1);
    expect(settleValue(1, 1, 1 / 60)).toBe(1);
    expect(settleValue(0, 1, 0)).toBe(0);
    expect(settleValue(0, 1, 10)).toBe(settleValue(0, 1, 0.05));
  });
  it("never leaves a blank gap between chapters", () => {
    for (let i = 0; i <= 1000; i++) {
      const weights = chapterStops.map((_, index) =>
        chapterOpacity(i / 1000, index),
      );
      expect(weights.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
      expect(Math.max(...weights)).toBeGreaterThanOrEqual(0.5);
    }
    expect(chapterOpacity(0, 0)).toBe(1);
    expect(chapterOpacity(1, 6)).toBe(1);
    expect(chapterOpacity(0.5, 8)).toBe(0);
  });
});
