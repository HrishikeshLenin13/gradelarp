import { describe, expect, it } from "vitest";
import {
  workspaceViews,
  workspaceHref,
  workspaceViewFromHash,
  workspaceShortcuts,
} from "../src/product/workspace-routes";
describe("real workspace destinations", () => {
  it.each(workspaceViews)("round trips the %s tool", (view) => {
    const href = workspaceHref(view);
    expect(href.startsWith("/app")).toBe(true);
    expect(
      workspaceViewFromHash(new URL(href, "https://example.test").hash),
    ).toBe(view);
  });
  it.each([
    "",
    "#",
    "#unknown",
    "#<script>",
    "#%77hatif",
    "#whatif/else",
    "#constructor",
  ])("falls back to overview for an invalid fragment: %s", (hash) => {
    expect(workspaceViewFromHash(hash)).toBe("overview");
  });
  it("exposes distinct shortcuts backed by real views", () => {
    expect(new Set(workspaceShortcuts.map((s) => s.view)).size).toBe(4);
    for (const shortcut of workspaceShortcuts)
      expect(workspaceViews).toContain(shortcut.view);
  });
});
