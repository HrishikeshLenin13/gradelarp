import {
  newProfile,
  recordState,
  ProfileSchema,
  type Profile,
} from "../product/model";
import { HacError, SnapshotSchema, type HacSnapshot } from "./types";
import type { Course } from "../lib/model";
export const fingerprint = (course: Course) => JSON.stringify(course);
export function newSandbox(snapshot: HacSnapshot): Profile {
  const p = newProfile(`${snapshot.district.toUpperCase()} · HAC sandbox`);
  p.state.demo = true;
  p.hac = {
    mode: "mock",
    district: snapshot.district,
    studentId: snapshot.studentId,
    lastImport: null,
    lastCompleteImport: null,
    imported: {},
    ignored: [],
  };
  return p;
}
export type ImportDecision = {
  remoteId: string;
  name: string;
  action: "add" | "update" | "unchanged" | "conflict" | "ignored";
};
export function previewImport(
  profile: Profile,
  raw: HacSnapshot,
): ImportDecision[] {
  const snapshot = SnapshotSchema.parse(raw),
    connection = profile.hac;
  if (
    !connection ||
    !profile.state.demo ||
    connection.district !== snapshot.district ||
    connection.studentId !== snapshot.studentId
  )
    throw new HacError(
      "PROFILE_MISMATCH",
      "Choose the matching HAC sandbox. Manual profiles are never import targets.",
    );
  return snapshot.courses.map(({ remoteId, course }) => {
    const owned = connection.imported[remoteId],
      local = profile.state.courses.find((c) => c.id === course.id);
    let action: ImportDecision["action"] = "add";
    if (connection.ignored.includes(remoteId)) action = "ignored";
    else if (
      local &&
      (!owned ||
        owned.courseId !== local.id ||
        fingerprint(local) !== owned.fingerprint)
    )
      action = "conflict";
    else if (!local && owned)
      action = "conflict"; // Local deletion must not be resurrected by refresh.
    else if (local)
      action =
        fingerprint(local) === fingerprint(course) ? "unchanged" : "update";
    return { remoteId, name: course.name, action };
  });
}
export function applyImport(profile: Profile, snapshot: HacSnapshot) {
  const decisions = previewImport(profile, snapshot),
    next = structuredClone(profile),
    hac = next.hac!;
  let changes = 0;
  for (const item of snapshot.courses) {
    const decision = decisions.find((d) => d.remoteId === item.remoteId)!;
    if (decision.action === "ignored" || decision.action === "conflict")
      continue;
    if (decision.action === "add") {
      next.state.courses.push(item.course);
      changes++;
    }
    if (decision.action === "update") {
      next.state.courses = next.state.courses.map((c) =>
        c.id === item.course.id ? item.course : c,
      );
      changes++;
    }
    hac.imported[item.remoteId] = {
      courseId: item.course.id,
      fingerprint: fingerprint(item.course),
      reportedAverage: item.reportedAverage,
    };
  }
  hac.lastImport = snapshot.fetchedAt;
  if (
    snapshot.status === "complete" &&
    decisions.every((d) => d.action !== "conflict" && d.action !== "ignored")
  )
    hac.lastCompleteImport = snapshot.fetchedAt;
  if (changes) next.state = recordState(next.state);
  return { profile: ProfileSchema.parse(next), decisions, changes };
}
/** Stop managing a source record. Saved scenarios and unrelated records are retained. */
export function removeImported(
  profile: Profile,
  remoteId: string,
  deleteCourse: boolean,
): Profile {
  const next = structuredClone(profile),
    owned = next.hac?.imported[remoteId];
  if (!owned || !next.hac)
    throw new HacError(
      "RECORD_MISSING",
      "This imported record is no longer available.",
    );
  if (deleteCourse)
    next.state.courses = next.state.courses.filter(
      (c) => c.id !== owned.courseId,
    );
  delete next.hac.imported[remoteId];
  next.hac.ignored = [...new Set([...next.hac.ignored, remoteId])];
  return ProfileSchema.parse(next);
}
