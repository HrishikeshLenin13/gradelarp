import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  readableAccent,
  onAccent,
} from "../src/design-lab/contrast";

describe("design-lab accent contrast", () => {
  for (const theme of ["light", "dark"] as const) {
    for (const accent of [
      "#ffffff",
      "#000000",
      "#ff0000",
      "#00ff00",
      "#0000ff",
      "#93536f",
      "#267467",
      "#709bdf",
    ]) {
      it(`${theme} ${accent} keeps readable text and button foreground`, () => {
        const result = readableAccent(accent, theme);
        expect(result).toMatch(/^#[0-9a-f]{6}$/i);
        expect(
          contrastRatio(result, theme === "light" ? "#edf0f3" : "#26303b"),
        ).toBeGreaterThanOrEqual(5);
        expect(contrastRatio(result, onAccent(result))).toBeGreaterThanOrEqual(
          4.5,
        );
      });
    }
  }
  it("uses WCAG black-white extremes", () => {
    expect(contrastRatio("#ffffff", "#000000")).toBe(21);
    expect(contrastRatio("#123456", "#123456")).toBe(1);
    expect(onAccent("#000000")).toBe("#ffffff");
    expect(onAccent("#ffffff")).toBe("#171c24");
  });
});
