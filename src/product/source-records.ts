import type { Profile } from "./model";
/** Full source dates only. Never infer a missing year or normalize an invalid day. */
export function sourceDate(raw: string | null): string | null {
  if (!raw) return null;
  const value = raw.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  if (!iso && !us) return null;
  const [year, month, day] = iso
    ? [Number(iso[1]), Number(iso[2]), Number(iso[3])]
    : [Number(us![3]), Number(us![1]), Number(us![2])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    year < 1900 ||
    year > 2200 ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
export function profileCourseCatalog(profile: Profile) {
  return profile.hacLive
    ? profile.hacLive.snapshot.courses.map((c) => ({
        id: c.id,
        name: c.name,
        teacher: c.teacher,
        semester: profile.hacLive!.snapshot.term || "School-reported term",
      }))
    : profile.state.courses;
}
export function sourcePlannerAssignments(profile: Profile) {
  return (profile.hacLive?.snapshot.courses ?? []).flatMap((course) =>
    course.assignments
      .filter((a) => a.status === "missing" || a.status === "ungraded")
      .map((a) => ({
        id: a.id,
        key: `hac:${course.id}/${a.id}`,
        title: a.name,
        date: sourceDate(a.due) ?? "",
        sourceDate: a.due,
        priority: a.status === "missing" ? "high" : "normal",
        done: profile.completedAssignments.includes(`hac:${course.id}/${a.id}`),
        notes: `${course.stale || !course.assignmentsAvailable ? "Saved from an earlier sync. " : ""}School status: ${a.status}. Personal completion does not change HAC.`,
        course,
        kind: "source" as const,
      })),
  );
}
