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
  const [district, setDistrict] = useState<DistrictId>(
    profile.hac?.district ?? "lisd",
  );
  const [search, setSearch] = useState("");
  const [session, setSession] = useState<HacSession | null>(null);
  const [snapshot, setSnapshot] = useState<HacSnapshot | null>(null);
  const [scenario, setScenario] = useState<FixtureCase>("normal");
  const [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [pending, setPending] = useState<{
    remoteId: string;
    deleteCourse: boolean;
    name: string;
  } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    request({ action: "status" }, controller.signal)
      .then((r) => setSession(r.session))
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Session check failed.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!session) return;
    const timer = setTimeout(
      () => {
        setSession(null);
        setSnapshot(null);
        setMessage(
          "Your mock session ended. Reconnect to refresh; saved imports are unchanged.",
        );
      },
      Math.max(0, Date.parse(session.expiresAt) - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [session]);
  const config = districtConfig(district);
  const existing =
    (profile.hac?.district === district ? profile : undefined) ??
    data.profiles.find(
      (p) => p.hac?.district === district && p.hac.studentId === "sample-2026",
    );
  const target = snapshot
    ? (existing ?? {
        ...newSandbox(snapshot),
        preferences: { ...profile.preferences },
      })
    : existing;
  const decisions = snapshot && target ? previewImport(target, snapshot) : [];
  const connected = session?.district === district;
  const imported = existing?.hac?.imported ?? {};
  async function run(command: unknown) {
    setBusy(true);
    setError("");
    setMessage("");
    setSnapshot(null);
    try {
      const r = await request(command);
      setSession(r.session);
      if (r.snapshot) {
        setSnapshot(r.snapshot);
        setMessage(
          r.snapshot.status === "partial"
            ? "Partial preview ready. Unavailable courses will be kept unchanged."
            : "Preview ready. Nothing has been imported yet.",
        );
      } else if (r.session)
        setMessage(
          "Mock session connected. Preview the sample records before importing.",
        );
      else
        setMessage(
          "Disconnected. Your imported records remain on this device.",
        );
    } catch (e) {
      if (e instanceof HacError && e.status === 401) setSession(null);
      setError(
        e instanceof Error ? e.message : "The connector request failed.",
      );
    } finally {
      setBusy(false);
    }
  }
  function importPreview() {
    if (!snapshot || !target) return;
    try {
      if (!existing && data.profiles.length >= 25)
        throw new Error(
          "The workspace has 25 profiles. Remove an unused profile before creating a sandbox.",
        );
      const result = applyImport(target, snapshot);
      onChange({
        ...data,
        activeProfileId: result.profile.id,
        profiles: existing
          ? data.profiles.map((p) =>
              p.id === existing.id ? result.profile : p,
            )
          : [...data.profiles, result.profile],
      });
      setSnapshot(null);
      setMessage(
        `${result.changes} course${result.changes === 1 ? "" : "s"} added or updated. Local edits, manual profiles and saved scenarios were preserved.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "The import did not complete.");
    }
  }
  const changes = decisions.filter((d) =>
    ["add", "update"].includes(d.action),
  ).length;
  return (
    <div className="product-stack hac-workspace">
      <section className="hac-intro">
        <div>
          <span className="hac-mode">
            <ShieldCheck size={15} /> Mock connection · no school login
          </span>
          <h2>A clearer connection to your classes.</h2>
          <p>
            Try the whole import experience with a synthetic student. Preview
            courses, explore your grades, and keep your own work untouched.
          </p>
        </div>
        <div className="hac-intro-note">
          <Link2 size={28} />
          <strong>Your school. Your choice.</strong>
          <p>
            Live HAC access stays off. This sandbox never contacts a district or
            asks for a password.
          </p>
        </div>
      </section>
      <div className="hac-layout">
        <section
          className="panel hac-districts"
          aria-labelledby="district-heading"
        >
          <div className="hac-section-title">
            <span className="hac-step">1</span>
            <h3 id="district-heading">Choose your district</h3>
          </div>
          <label className="field">
            <span>Search districts</span>
            <input
              type="search"
              value={search}
              placeholder="Name or abbreviation"
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <div className="hac-district-list">
            {districts
              .filter((d) =>
                `${d.name} ${d.short}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
              .map((d) => (
                <button
                  className="hac-district"
                  key={d.id}
                  aria-pressed={district === d.id}
                  disabled={busy}
                  onClick={() => {
                    setDistrict(d.id);
                    setSnapshot(null);
                    setError("");
                    setMessage("");
                  }}
                >
                  <School size={21} />
                  <span>
                    <strong>{d.name}</strong>
                    <small>{d.short} · Texas</small>
                  </span>
                  {district === d.id && <Check size={18} />}
                </button>
              ))}
            {!districts.some((d) =>
              `${d.name} ${d.short}`
                .toLowerCase()
                .includes(search.toLowerCase()),
            ) && (
              <p className="helper">
                No matching districts. Try LISD or RRISD.
              </p>
            )}
          </div>
          <p className="helper">
            District destinations are fixed, not user-entered.
          </p>
          <a
            className="hac-source"
            href={config.source}
            target="_blank"
            rel="noreferrer"
          >
            Official {config.short} HAC information <ArrowRight size={14} />
          </a>
        </section>
        <section
          className="panel hac-session"
          aria-labelledby="connection-heading"
          aria-busy={busy}
        >
          <div className="hac-section-title">
            <span className="hac-step">2</span>
            <h3 id="connection-heading">Connect a sample student</h3>
          </div>
          <div className="hac-identity">
            <span className="hac-avatar">J</span>
            <div>
              <strong>Jordan · Synthetic student</strong>
              <p>{config.name} sandbox</p>
            </div>
          </div>
          <div className="hac-session-status">
            <span
              className={`hac-status-dot ${connected ? "is-connected" : ""}`}
            />
            <strong>
              {busy
                ? "Checking connection…"
                : connected
                  ? "Mock session connected"
                  : session
                    ? `Connected to ${districtConfig(session.district).short}; select it or reconnect`
                    : "Not connected"}
            </strong>
          </div>
          <p className="helper">
            {connected
              ? `Session expires ${time(session.expiresAt)}. A server restart ends it early; saved imports remain.`
              : "A temporary server session lets you test imports without credentials."}
          </p>
          <div className="product-actions">
            {!connected && (
              <Button
                disabled={busy}
                onClick={() =>
                  run({ action: "connect", mode: "mock", district })
                }
              >
                <Link2 size={16} />
                Connect mock student
              </Button>
            )}
            {session && (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => run({ action: "disconnect" })}
              >
                <Unplug size={16} />
                Disconnect
              </Button>
            )}
            {connected && (
              <Button
                disabled={busy}
                onClick={() => run({ action: "sync", district, scenario })}
              >
                <RefreshCw size={16} />
                Refresh preview
              </Button>
            )}
          </div>
          <details className="hac-fixture-tools">
            <summary>Test fixture conditions</summary>
            <label className="field">
              <span>Preview fixture</span>
              <select
                value={scenario}
                onChange={(e) => {
                  setScenario(e.target.value as FixtureCase);
                  setSnapshot(null);
                }}
                disabled={busy}
              >
                <option value="normal">
                  Normal · 2 courses, 6 assignments
                </option>
                <option value="updated">Updated Algebra score</option>
                <option value="partial">Partial · English unavailable</option>
                <option value="empty">Empty Algebra assignment table</option>
                <option value="malformed">Unrecognized page</option>
                <option value="auth-error">Authentication failure</option>
                <option value="district-mismatch">
                  Wrong district response
                </option>
              </select>
            </label>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                run({
                  action: "connect",
                  mode: "mock",
                  district,
                  scenario: "auth-error",
                })
              }
            >
              Test sign-in failure
            </Button>
            <p className="helper">
              Original synthetic HTML fixtures; current school page
              compatibility is not established.
            </p>
          </details>
        </section>
      </div>
      {error && (
        <div className="hac-notice hac-error" role="alert">
          {error}
        </div>
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
