import { createHash } from "node:crypto";
import { load } from "cheerio";
import { HacError } from "./types";
import {
  LiveSnapshotSchema,
  type LiveSnapshot,
  type SourceCourse,
} from "./live-types";
export const identity = (value: string) =>
  createHash("sha256").update(value).digest("hex").slice(0, 32);
export const clean = (value: string) =>
  value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const number = (value: string) =>
  /^\d+(?:\.\d+)?\s*%?$/.test(value.trim())
    ? Number(value.replace(/[%\s]/g, ""))
    : null;
export function challenge(html: string) {
  const $ = load(html);
  return (
    $(
      "input[autocomplete='one-time-code'],iframe[src*='captcha'],.g-recaptcha,[name='SAMLRequest']",
    ).length > 0 ||
    /\b(multi-factor authentication|verify your identity|access denied|request unsuccessful|incident id|select a student)\b/i.test(
      $("body").text(),
    )
  );
}
export function loginForm(html: string) {
  return load(html)('input[name="LogOnDetails.Password"]').length > 0;
}
export function parseLiveAssignments(
  html: string,
  portal: string,
  studentName: string,
  studentId: string,
  now = new Date(),
): LiveSnapshot {
  if (Buffer.byteLength(html) > 3_000_000)
    throw new HacError(
      "PAGE_SIZE",
      "The gradebook is too large to process.",
      502,
    );
  if (challenge(html))
    throw new HacError(
      "INTERACTIVE_LOGIN",
      "HAC needs an interactive verification or student selection. Complete it in the official portal.",
      409,
    );
  if (loginForm(html))
    throw new HacError(
      "SESSION_EXPIRED",
      "Your HAC session ended. Sign in again; saved grades remain on this device.",
      401,
    );
  const $ = load(html),
    sections = $(".AssignmentClass"),
    issues: string[] = [],
    courses: SourceCourse[] = [];
  const term = clean(
    $(
      "select[id*='ReportCardRun'] option:selected,select[id*='MarkingPeriod'] option:selected",
    )
      .first()
      .text(),
  );
  if (!sections.length) {
    if (
      /\b(no (?:assignments|classwork|classes|courses)(?: (?:are|were))? (?:available|found|to display)|no data to display)\b/i.test(
        $("p,span,td")
          .toArray()
          .map((el) => $(el).text())
          .join(" "),
      )
    )
      return LiveSnapshotSchema.parse({
        mode: "live",
        portal,
        studentId,
        studentName,
        term,
        fetchedAt: now.toISOString(),
        status: "complete",
        issues: [],
        courses: [],
      });
    throw new HacError(
      "GRADEBOOK_FORMAT",
      "Signed-in gradebook markup was not recognized. No grades were imported; this portal needs a compatible adapter.",
      422,
    );
  }
  if (sections.length > 500)
    throw new HacError(
      "PAGE_SIZE",
      "The gradebook contains too many courses.",
      422,
    );
  const ids = new Set<string>();
  for (const el of sections.toArray()) {
    const section = $(el),
      header = section.find(".sg-header").first();
    const heading = header.find("a.sg-header-heading").first();
    const raw = clean(heading.text());
    const name = raw.replace(/^Course(?:\s+Name)?\s*:\s*/i, "").trim();
    const key =
      heading
        .attr("href")
        ?.match(
          /(?:course(?:section)?(?:id)?|section(?:id)?)=([^&#]+)/i,
        )?.[1] ?? raw;
    if (!name || !key) {
      issues.push("A course header was not recognized; it was not imported.");
      continue;
    }
    const id = identity(`${portal}|${studentId}|${term}|${key}`);
    if (ids.has(id))
      throw new HacError(
        "COURSE_IDENTITY",
        "The source contains ambiguous course identities. No grades were imported.",
        422,
      );
    ids.add(id);
    let averageText = clean(header.find("span.sg-header-heading").text());
    averageText = averageText
      .replace(/^.*?(?:class|course)?\s*average\s*:?\s*/i, "")
      .trim();
    const average = number(averageText);
    if (average !== null && (average < 0 || average > 1000))
      throw new HacError(
        "GRADE_VALUE",
        "A source average is outside the supported range.",
        422,
      );
    const assignments: SourceCourse["assignments"] = [],
      categories: SourceCourse["categories"] = [];
    const table = section.find("table[id*='CourseAssignments']").first();
    if (!table.length)
      issues.push(
        `${name}: assignment table unavailable; any previous assignment records will be retained.`,
      );
    else {
      const rows = table.find("tr");
      const headerRow = rows
        .filter(
          (_, r) =>
            $(r).find("th").length > 0 ||
            $(r).hasClass("sg-asp-table-header-row"),
        )
        .first();
      const headers = headerRow
        .children("th,td")
        .toArray()
        .map((c) =>
          clean($(c).text())
            .toLowerCase()
            .replace(/[^a-z0-9]/g, ""),
        );
      const index = (...keys: string[]) =>
        headers.findIndex((h) => keys.includes(h));
      const ni = index("assignment", "assignmentname", "description"),
        ci = index("category"),
        di = index("datedue", "duedate"),
        si = index("score", "earnedpoints", "pointsearned"),
        pi = index("totalpoints", "possiblepoints", "pointspossible"),
        sti = index("status");
      const dataRows = rows
        .toArray()
        .filter((r) => r !== headerRow[0] && $(r).children("td").length > 1);
      if (dataRows.length && (ni < 0 || si < 0))
        throw new HacError(
          "ASSIGNMENT_COLUMNS",
          `${name}: assignment columns are not recognized. No grade values were guessed.`,
          422,
        );
      for (const row of dataRows) {
        const cells = $(row)
          .children("td")
          .toArray()
          .map((c) => clean($(c).text()));
        if (cells.length < headers.length)
          throw new HacError(
            "ASSIGNMENT_COLUMNS",
            `${name}: an assignment row is incomplete.`,
            422,
          );
        const title = cells[ni];
        if (!title) continue;
        const score = cells[si] ?? "",
          possible = pi < 0 ? null : number(cells[pi] ?? ""),
          earned = number(score);
        const statusText = sti < 0 ? score : (cells[sti] ?? score);
        const status: SourceCourse["assignments"][number]["status"] =
          /^(?:m|missing)$/i.test(statusText)
            ? "missing"
            : /^(?:e|ex|exempt|excused)$/i.test(statusText)
              ? "exempt"
              : /^(?:d|dropped)$/i.test(statusText)
                ? "dropped"
                : earned !== null
                  ? "graded"
                  : score === "" ||
                      /^(?:--|—|ungraded|not graded)$/i.test(score)
                    ? "ungraded"
                    : "unknown";
        const link = $(row).find("a").first(),
          sourceKey =
            link.attr("onclick") ??
            (link.attr("href") &&
            !/^(?:#|javascript:(?:void|;))/i.test(link.attr("href")!)
              ? link.attr("href")
              : undefined) ??
            `${title}|${di < 0 ? "" : cells[di]}|${ci < 0 ? "" : cells[ci]}`;
        const aid = identity(`${id}|${sourceKey}`);
        if (assignments.some((a) => a.id === aid))
          throw new HacError(
            "ASSIGNMENT_IDENTITY",
            `${name}: assignments could not be identified uniquely.`,
            422,
          );
        assignments.push({
          id: aid,
          name: title,
          category: ci < 0 ? "" : (cells[ci] ?? ""),
          due: di < 0 ? null : cells[di] || null,
          score,
          earned,
          possible: possible && possible > 0 ? possible : null,
          status,
        });
      }
    }
    const cat = section.find("table[id*='CourseCategories']").first();
    if (cat.length) {
      const rows = cat.find("tr").toArray();
      const hr = rows.find(
        (r) =>
          $(r).find("th").length > 0 ||
          $(r).hasClass("sg-asp-table-header-row"),
      );
      const heads = hr
        ? $(hr)
            .children("th,td")
            .toArray()
            .map((c) => clean($(c).text()).toLowerCase())
        : [];
      const ni = heads.findIndex((h) => /category/.test(h)),
        wi = heads.findIndex((h) => /weight|percent/.test(h));
      if (ni >= 0)
        for (const row of rows.filter((r) => r !== hr)) {
          const cs = $(row)
            .children("td")
            .toArray()
            .map((c) => clean($(c).text()));
          if (cs[ni] && !/^total$/i.test(cs[ni]))
            categories.push({
              name: cs[ni],
              weight: wi < 0 ? null : number(cs[wi] ?? ""),
            });
        }
    }
    courses.push({
      id,
      name,
      teacher: clean(
        section.find("[id*='Teacher'],.sg-header-teacher").first().text(),
      ),
      average,
      averageText,
      assignmentsAvailable: !!table.length,
      assignments,
      categories,
    });
  }
  if (!courses.length)
    throw new HacError(
      "GRADEBOOK_FORMAT",
      "No course passed source validation. Saved grades are unchanged.",
      422,
    );
  return LiveSnapshotSchema.parse({
    mode: "live",
    portal,
    studentId,
    studentName,
    term,
    fetchedAt: now.toISOString(),
    status: issues.length ? "partial" : "complete",
    issues,
    courses,
  });
}
