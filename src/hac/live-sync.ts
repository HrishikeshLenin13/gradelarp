import { LiveSnapshotSchema, type LiveSnapshot } from "./live-types";
import { newProfile, ProductSchema, type ProductData } from "../product/model";
/** Source-reported records remain separate from manual calculations. Unknown
 * credits, GPA policy, dates and category semantics are never invented. */
export function applyLiveSnapshot(
  data: ProductData,
  raw: LiveSnapshot,
): ProductData {
  const snapshot = LiveSnapshotSchema.parse(raw);
  const existing = data.profiles.find(
    (p) =>
      p.hacLive?.portal === snapshot.portal &&
      p.hacLive.studentId === snapshot.studentId,
  );
  if (!existing && data.profiles.length >= 25)
    throw new Error(
      "Remove an unused profile before connecting another student.",
    );
  const profile = existing
    ? structuredClone(existing)
    : newProfile(snapshot.studentName.slice(0, 50));
  if (!existing) {
    const current = data.profiles.find((p) => p.id === data.activeProfileId);
    if (current) profile.preferences = { ...current.preferences };
  }
  if (
    snapshot.status === "partial" &&
    existing?.hacLive &&
    existing.hacLive.snapshot.term === snapshot.term
  ) {
    const previous = existing.hacLive.snapshot.courses;
    snapshot.courses = snapshot.courses.map((c) => {
      const old = previous.find((x) => x.id === c.id);
      return !c.assignmentsAvailable && old
        ? { ...c, assignments: old.assignments }
        : c;
    });
    snapshot.courses.push(
      ...previous.filter((c) => !snapshot.courses.some((x) => x.id === c.id)),
    );
  }
  profile.hacLive = {
    mode: "live",
    portal: snapshot.portal,
    studentId: snapshot.studentId,
    lastSync: snapshot.fetchedAt,
    snapshot,
  };
  return ProductSchema.parse({
    ...data,
    activeProfileId: profile.id,
    profiles: existing
      ? data.profiles.map((p) => (p.id === profile.id ? profile : p))
      : [...data.profiles, profile],
  });
}
