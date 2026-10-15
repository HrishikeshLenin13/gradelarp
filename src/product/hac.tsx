"use client";
import { useEffect, useState } from "react";
import { z } from "zod";
import {
  ArrowRight,
  Check,
  Link2,
  RefreshCw,
  ShieldCheck,
  Unplug,
  School,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { courseGrade } from "@/lib/calculations";
import { districts, districtConfig } from "@/hac/districts";
import {
  HacError,
  SessionSchema,
  SnapshotSchema,
  type HacSession,
  type HacSnapshot,
  type DistrictId,
  type FixtureCase,
} from "@/hac/types";
import {
  applyImport,
  newSandbox,
  previewImport,
  removeImported,
} from "@/hac/sync";
import { type ProductData, type Profile } from "./model";
import { Confirm } from "./forms";
const responseSchema = z.object({
  session: SessionSchema.nullable(),
  snapshot: SnapshotSchema.optional(),
});
async function request(command: unknown, signal?: AbortSignal) {
  const response = await fetch("/api/hac", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(command),
    credentials: "same-origin",
    cache: "no-store",
    signal,
  });
  const body = await response.json();
  if (!response.ok) {
    const error = z
      .object({ error: z.object({ code: z.string(), message: z.string() }) })
      .safeParse(body);
    throw new HacError(
      error.success ? error.data.error.code : "RESPONSE",
      error.success
        ? error.data.error.message
        : "The mock connector returned an invalid response.",
      response.status,
    );
  }
  return responseSchema.parse(body);
}
function time(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "Not imported yet";
}
export function SchoolConnection({
  data,
  profile,
  onChange,
}: {
  data: ProductData;
  profile: Profile;
  onChange: (next: ProductData) => void;
}) {
  const [session, setSession] = useState<LiveSession | null>(null),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [disconnect, setDisconnect] = useState(false);
  useEffect(() => {
    const c = new AbortController();
    request({ action: "status" }, c.signal)
      .then((r) => setSession(r.session))
      .catch((e) => {
        if (!c.signal.aborted)
          setError(
            e instanceof Error ? e.message : "The session check failed.",
          );
      })
      .finally(() => {
        if (!c.signal.aborted) setBusy(false);
      });
    return () => c.abort();
  }, []);
  useEffect(() => {
    if (!session) return;
    const timer = setTimeout(
      () => {
        setSession(null);
        setError(
          "Your HAC session ended. Sign in again to refresh; saved grades remain.",
        );
      },
      Math.max(0, Date.parse(session.expiresAt) - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [session]);
  const source = profile.hacLive;
  async function run(action: "sync" | "disconnect") {
    setBusy(true);
    setError("");
    try {
      const r = await request({ action });
      setSession(r.session);
      if (r.snapshot) onSync(r.snapshot);
    } catch (e) {
      if (e instanceof ConnectionError && e.code === "SESSION_EXPIRED")
        setSession(null);
      setError(e instanceof Error ? e.message : "The HAC request failed.");
    } finally {
      setBusy(false);
    }
  }
  if (!session)
    return (
      <div className="product-stack hac-connect-page">
        {source && (
          <p className="hac-notice">
            Your saved school records are still available. Sign in again to
            refresh them.
          </p>
        )}
        {error && (
          <p className="hac-login-error" role="alert">
            {error}
          </p>
        )}
        <HacLogin onSync={onSync} onManual={onManual} compact />
      </div>
    );
  return (
    <div className="product-stack">
      <section className="panel hac-connected">
        <div>
          <span className="hac-live-tag">
            <Check size={15} />
            Connected to HAC
          </span>
          <h2>{session.studentName}</h2>
          <p>{new URL(session.portal).hostname}</p>
          <p className="helper">
            Session ends {new Date(session.expiresAt).toLocaleTimeString()}.
            Your saved grades remain after disconnecting.
          </p>
        </div>
        <div className="product-actions">
          <Button disabled={busy} onClick={() => run("sync")}>
            <RefreshCw size={16} />
            {busy ? "Syncing…" : "Sync now"}
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => setDisconnect(true)}
          >
            <Unplug size={16} />
            Disconnect
          </Button>
        </div>
      </section>
      {error && (
        <p className="hac-login-error" role="alert">
          {error}
        </p>
      )}
      {source && <SourceGradebook snapshot={source.snapshot} />}
      <details className="hac-account-switch">
        <summary>Connect another HAC account</summary>
        <HacLogin onSync={onSync} compact />
      </details>
      {disconnect && (
        <Confirm
          title="Disconnect HAC?"
          description="This closes Gradelarp’s server session. Synced academic records remain on this device; your school account and school records are unchanged."
          action="Disconnect"
          onConfirm={() => run("disconnect")}
          onClose={() => setDisconnect(false)}
        />
      )}
    </div>
  );
}
export function SourceGradebook({
  snapshot,
  onConnect,
  primary = false,
}: {
  snapshot: LiveSnapshot;
  onConnect?: () => void;
  primary?: boolean;
}) {
  const Heading = primary ? "h1" : "h2";
  const CourseHeading = primary ? "h2" : "h3";
  return (
    <div className="product-stack hac-source-gradebook">
      <header className="hac-source-header">
        <div>
          <span className="hac-live-tag">School-reported records</span>
          <Heading>{snapshot.studentName}’s gradebook</Heading>
          <p>
            {new URL(snapshot.portal).hostname}
            {snapshot.term ? ` · ${snapshot.term}` : ""}
          </p>
          <p className="helper">
            Last {snapshot.status === "partial" ? "partial " : ""}sync:{" "}
            {new Date(snapshot.fetchedAt).toLocaleString()}
          </p>
        </div>
        {onConnect && (
          <Button variant="outline" onClick={onConnect}>
            <RefreshCw size={15} />
            Manage connection
          </Button>
        )}
      </header>
      {snapshot.issues.map((issue, i) => (
        <p className="hac-notice" key={i}>
          {issue}
        </p>
      ))}
      {!snapshot.courses.length && (
        <section className="panel">
          <CourseHeading>No published courses yet.</CourseHeading>
          <p>
            HAC returned an explicitly empty gradebook. Check the official
            portal or sync again later.
          </p>
        </section>
      )}
      {snapshot.courses.map((course) => (
        <section key={course.id} className="panel hac-source-course">
          <div className="hac-source-course-top">
            <div>
              <CourseHeading>{course.name}</CourseHeading>
              {course.teacher && <p>{course.teacher}</p>}
            </div>
            <div className="hac-school-average">
              <strong>{course.averageText || "Not reported"}</strong>
              <span>HAC average</span>
            </div>
          </div>
          {!course.assignmentsAvailable && (
            <p className="hac-notice">
              Assignment data was unavailable on this sync. Any listed
              assignments are from the previous successful sync.
            </p>
          )}
          <details open>
            <summary>
              {course.assignments.length} published assignment
              {course.assignments.length === 1 ? "" : "s"}
            </summary>
            {course.assignments.length ? (
              <ul className="hac-source-assignments">
                {course.assignments.map((a) => (
                  <li key={a.id}>
                    <div>
                      <strong>{a.name}</strong>
                      <span>
                        {[
                          a.category,
                          a.due ? `Due ${a.due}` : "Date not reported",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </div>
                    <div className="hac-source-score">
                      <strong>
                        {a.score || "Not graded"}
                        {a.possible !== null ? ` / ${a.possible}` : ""}
                      </strong>
                      <span>
                        {a.status === "unknown"
                          ? "School mark retained"
                          : a.status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="helper">
                No published assignment rows were returned. No scores were
                filled in.
              </p>
            )}
          </details>
          {course.categories.length > 0 && (
            <p className="helper">
              {course.categories
                .map(
                  (c) =>
                    `${c.name}${c.weight === null ? " (weight not reported)" : ` ${c.weight}%`}`,
                )
                .join(" · ")}
            </p>
          )}
        </section>
      ))}
      <p className="helper hac-accuracy-note">
        Averages above are reported by HAC, not recalculated from visible
        assignments. Unpublished work can affect them. GPA, credits, and course
        policies are not inferred from a course name; manual planning tools use
        only the records and rules you enter.
      </p>
    </div>
  );
}
