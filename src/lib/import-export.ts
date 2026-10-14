import Papa from "papaparse";
import { CourseSchema, StateSchema, type AppState, type Course } from "./model";
import { uid } from "./utils";
export const csvHeaders = [
  "course",
  "teacher",
  "level",
  "semester",
  "credits",
  "mode",
  "category",
  "weight",
  "assignment",
  "earned",
  "possible",
  "status",
  "due",
];
export function exportCsv(courses: Course[]) {
  return Papa.unparse({
    fields: csvHeaders,
    data: courses.flatMap((c) =>
      c.assignments.map((a) => [
        c.name,
        c.teacher,
        c.level,
        c.semester,
        c.credits,
        c.mode,
        c.categories.find((k) => k.id === a.categoryId)?.name,
        c.categories.find((k) => k.id === a.categoryId)?.weight,
        a.name,
        a.earned ?? "",
        a.possible,
        a.status,
        a.due,
      ]),
    ),
  });
}
export function parseCsv(text: string): Course[] {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
  });
  if (result.errors.length) throw new Error(`CSV: ${result.errors[0].message}`);
  const missing = csvHeaders.filter((h) => !result.meta.fields?.includes(h));
  if (missing.length) throw new Error(`Missing columns: ${missing.join(", ")}`);
  if (result.data.length > 10000)
    throw new Error("Import supports at most 10,000 rows.");
  const courses = new Map<string, Course>();
  result.data.forEach((r, i) => {
    const key = `${r.course}\u0000${r.semester}`;
    let c = courses.get(key);
    if (!c) {
      c = {
        id: uid(),
        name: r.course,
        teacher: r.teacher,
        level: r.level as Course["level"],
        semester: r.semester,
        credits: Number(r.credits),
        mode: r.mode as Course["mode"],
        target: 90,
        color: "#ada0ed",
        categories: [],
        assignments: [],
      };
      courses.set(key, c);
    } else if (
      c.teacher !== r.teacher ||
      c.level !== r.level ||
      c.credits !== Number(r.credits) ||
      c.mode !== r.mode
    )
      throw new Error(`Row ${i + 2}: inconsistent course metadata.`);
    let cat = c.categories.find((k) => k.name === r.category);
    if (!cat) {
      cat = { id: uid(), name: r.category, weight: Number(r.weight) };
      c.categories.push(cat);
    } else if (cat.weight !== Number(r.weight))
      throw new Error(`Row ${i + 2}: inconsistent category weight.`);
    c.assignments.push({
      id: uid(),
      name: r.assignment,
      categoryId: cat.id,
      earned: r.earned === "" ? null : Number(r.earned),
      possible: Number(r.possible),
      status: r.status as Course["assignments"][number]["status"],
      due: r.due,
    });
  });
  return Array.from(courses.values()).map((c) => CourseSchema.parse(c));
}
export function parseBackup(text: string): AppState {
  return StateSchema.parse(JSON.parse(text));
}
export function download(
  name: string,
  content: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
