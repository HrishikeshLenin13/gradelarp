import { describe, it, expect } from "vitest";
import { gradebook } from "./fixtures/hac-pages";
import { extractName } from "../src/hac/connector";
import { validationFields } from "../src/hac/errors";
import { LiveSnapshotSchema } from "../src/hac/live-types";
import { parseLiveAssignments } from "../src/hac/live-parser";
const parse = (html: string) =>
  parseLiveAssignments(
    html,
    "https://hac.example.edu/HomeAccess",
    "Test Student",
    "test-student",
  );
describe("school source record compatibility", () => {
  it("preserves relative category weights above 100 instead of rejecting the whole gradebook", () => {
    const s = parse(gradebook().replace("<td>60%</td>", "<td>200</td>"));
    expect(s.courses[0].categories[0].weight).toBe(200);
    expect(s.courses[0].categories[0].weightText).toBe("200");
    expect(s.courses[0].averageText).toBe("88.00");
  });
  it("preserves a long school assignment title without truncation or a schema failure", () => {
    const title = "Teacher-provided assignment instructions ".repeat(20).trim();
    const s = parse(gradebook().replace("Functions test", title));
    expect(s.courses[0].assignments[0].name).toBe(title);
  });

  it("keeps category weight and percentage as distinct school fields", () => {
    const html = gradebook()
      .replace("<th>Weight</th>", "<th>Percent</th><th>Weight</th>")
      .replace("<td>60%</td>", "<td>66.67%</td><td>200</td>")
      .replace("<td>40%</td>", "<td>33.33%</td><td>100</td>");
    expect(parse(html).courses[0].categories[0]).toMatchObject({
      weight: 200,
      weightText: "200",
      percentText: "66.67%",
    });
  });
  it("supports percentage-only tables without inventing a weight label", () => {
    const c = parse(
      gradebook().replace("<th>Weight</th>", "<th>Percentage</th>"),
    ).courses[0].categories[0];
    expect(c).toMatchObject({ weight: 60, percentText: "60%" });
    expect(c.weightText).toBeUndefined();
  });
  it("preserves source total-point notation, grouped numbers and zero/extra-credit denominators", () => {
    const s = parse(
      gradebook({ score: "1,234.50" }).replace(
        "<td>100</td>",
        "<td>1,500.00</td>",
      ),
    );
    expect(s.courses[0].assignments[0]).toMatchObject({
      score: "1,234.50",
      earned: 1234.5,
      possible: 1500,
      possibleText: "1,500.00",
    });
    const z = parse(gradebook().replace("<td>100</td>", "<td>0</td>"))
      .courses[0].assignments[0];
    expect(z).toMatchObject({ possible: null, possibleText: "0" });
  });
  it("does not create Infinity for unusually long source numbers", () => {
    const score = "9".repeat(400);
    const a = parse(gradebook({ score })).courses[0].assignments[0];
    expect(a.score).toBe(score);
    expect(a.earned).toBeNull();
    expect(a.status).toBe("unknown");
  });
  it("prefers the explicit official average over surrounding header text", () => {
    const s = parse(
      gradebook().replace(
        '<span class="sg-header-heading">Class Average: 88.00</span>',
        '<span class="sg-header-heading">Class Average: <span id="plnMain_lblOverallAverage_0">88.00</span></span><span class="sg-header-heading">Other information</span>',
      ),
    );
    expect(s.courses[0].average).toBe(88);
    expect(s.courses[0].averageText).toBe("88.00");
  });
  it("uses the assignment anchor rather than script/help text in its cell", () => {
    const s = parse(
      gradebook().replace(
        "</a></td><td>Major",
        "</a><script>private script not a title</script><span>Help text</span></td><td>Major",
      ),
    );
    expect(s.courses[0].assignments[0].name).toBe("Functions test");
  });
  it("recognizes the HAC EXC mark without converting it to a numeric grade", () => {
    expect(
      parse(gradebook({ score: "EXC" })).courses[0].assignments[0],
    ).toMatchObject({ score: "EXC", earned: null, status: "exempt" });
  });
  it("prioritizes explicit student identity fields over generic earlier menu text", () => {
    expect(
      extractName(
        '<div class="sg-banner-menu-container"><span>Menu text</span></div><span id="plnMain_lblRegStudentName">Verified Student</span>',
      ),
    ).toBe("Verified Student");
    expect(
      extractName(
        '<div class="sg-banner-menu-container"><span>Account</span><span>Help</span></div>',
      ),
    ).toBe("");
  });
  it("round-trips the expanded source records through profile sync and backup schemas", async () => {
    const { applyLiveSnapshot } = await import("../src/hac/live-sync");
    const { newProfile, parseProductBackup } =
      await import("../src/product/model");
    const p = newProfile("Manual");
    const source = parse(gradebook().replace("<td>60%</td>", "<td>200</td>"));
    const data = applyLiveSnapshot(
      {
        format: "gradelarp-product",
        version: 2,
        activeProfileId: p.id,
        profiles: [p],
      },
      source,
    );
    expect(
      data.profiles[1].hacLive?.snapshot.courses[0].categories[0].weightText,
    ).toBe("200");
    expect(
      parseProductBackup(JSON.stringify(data)).profiles[1].hacLive?.snapshot,
    ).toEqual(source);
    expect(data.profiles[0].state.courses).toEqual([]);
  });
  it("emits only schema field names and codes when a genuinely unsupported record remains", () => {
    try {
      parseLiveAssignments(
        gradebook(),
        "https://hac.example.edu/HomeAccess",
        "x".repeat(400),
        "test-student",
      );
      throw Error("expected validation failure");
    } catch (error) {
      expect(error).toMatchObject({
        code: "SOURCE_VALIDATION",
        details: {
          stage: "parse-records",
          validation: ["studentName:too_big"],
        },
      });
      expect(JSON.stringify(error)).not.toContain("xxx");
    }
    expect(
      validationFields([
        { path: ["private-account", "password", 0, "score"], code: "custom" },
      ]),
    ).toEqual(["field.field[].score:custom"]);
  });
  it("keeps identity and finite-number constraints, independent of display text compatibility", () => {
    const value = parse(gradebook());
    value.courses[0].categories[0].weight = Infinity;
    expect(LiveSnapshotSchema.safeParse(value).success).toBe(false);
    value.courses[0].categories[0].weight = -1;
    expect(LiveSnapshotSchema.safeParse(value).success).toBe(false);
  });
});
