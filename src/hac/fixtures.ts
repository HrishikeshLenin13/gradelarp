import type { DistrictId, FixtureCase } from "./types";
/** Original synthetic contract, NOT a captured school page or a verified HAC selector set.
 * Explicit IDs, weights, credits and status mappings make unsupported data fail closed. */
export function fixtureHtml(
  district: DistrictId,
  scenario: FixtureCase = "normal",
) {
  if (scenario === "auth-error")
    return '<html><body><form data-login-error="true">Synthetic sign-in rejected.</form></body></html>';
  if (scenario === "malformed")
    return "<html><body><h1>Unexpected portal maintenance page</h1></body></html>";
  const actualDistrict =
    scenario === "district-mismatch"
      ? district === "lisd"
        ? "rrisd"
        : "lisd"
      : district;
  return `<!doctype html><html><body><main data-fixture="gradelarp-hac-v1" data-district="${actualDistrict}" data-student="sample-2026">
<h1 data-student-name>Jordan · Synthetic student</h1>
<section data-course="algebra" data-name="Algebra II" data-teacher="Taylor Sample" data-level="Honors" data-credits="1" data-term="Fall 2026" data-average="${scenario === "updated" ? 91 : 88}">
<table data-categories><tbody><tr data-id="major" data-weight="60"><td>Major grades</td></tr><tr data-id="daily" data-weight="40"><td>Daily work</td></tr></tbody></table>
<table data-assignments><tbody>${
    scenario === "empty"
      ? ""
      : `
<tr data-id="quiz-1" data-category="major" data-status="graded" data-earned="${scenario === "updated" ? 95 : 85}" data-possible="100" data-due="2026-10-12"><td>Quadratic functions</td></tr>
<tr data-id="practice-1" data-category="daily" data-status="graded" data-earned="18" data-possible="20" data-due="2026-10-13"><td>Practice set 4</td></tr>
<tr data-id="quiz-2" data-category="major" data-status="ungraded" data-earned="" data-possible="100" data-due="2026-10-20"><td>Systems check-in</td></tr>
<tr data-id="practice-2" data-category="daily" data-status="missing" data-earned="" data-possible="10" data-due="2026-10-14"><td>Review reflection</td></tr>`
  }</tbody></table></section>
<section data-course="english" data-name="English II" data-teacher="Casey Sample" data-level="Regular" data-credits="1" data-term="Fall 2026" data-average="92">
<table data-categories><tbody><tr data-id="work" data-weight="100"><td>Coursework</td></tr></tbody></table>
${scenario === "partial" ? "<p data-unavailable>Assignment section unavailable</p>" : `<table data-assignments><tbody><tr data-id="essay" data-category="work" data-status="graded" data-earned="46" data-possible="50" data-due="2026-10-10"><td>Personal narrative</td></tr><tr data-id="reading" data-category="work" data-status="exempt" data-earned="" data-possible="10" data-due="2026-10-11"><td>Reading response</td></tr></tbody></table>`}
</section>
<table data-transcript><tbody><tr data-term="Spring 2026" data-grade="90" data-credits="1"><td>World Geography · Sample</td></tr></tbody></table>
<div data-rank="12" data-cohort="240"></div></main></body></html>`;
}
