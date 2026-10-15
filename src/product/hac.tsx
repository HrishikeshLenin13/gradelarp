"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { z } from "zod";
import {
  ArrowRight,
  BookOpen,
  Check,
  Eye,
  EyeOff,
  GraduationCap,
  Link2,
  RefreshCw,
  ShieldCheck,
  Unplug,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  LiveResponseSchema,
  type LiveSession,
  type LiveSnapshot,
} from "@/hac/live-types";
import { districts } from "@/hac/districts";
import { type Profile } from "./model";
import { Confirm } from "./forms";
class ConnectionError extends Error {
  constructor(
    message: string,
    public code: string,
    public databases?: { id: string; name: string }[],
  ) {
    super(message);
  }
}
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
      .object({
        error: z.object({
          code: z.string(),
          message: z.string(),
          details: z
            .object({
              databases: z
                .array(z.object({ id: z.string(), name: z.string() }))
                .optional(),
            })
            .optional(),
        }),
      })
      .safeParse(body);
    throw new ConnectionError(
      error.success
        ? error.data.error.message
        : "The HAC server returned an unexpected response.",
      error.success ? error.data.error.code : "RESPONSE",
      error.success ? error.data.error.details?.databases : undefined,
    );
  }
  return LiveResponseSchema.parse(body);
}
export function HacLogin({
  onSync,
  onManual,
  compact = false,
}: {
  onSync: (s: LiveSnapshot) => void;
  onManual?: () => void;
  compact?: boolean;
}) {
  const [district, setDistrict] = useState("lisd"),
    [portal, setPortal] = useState("");
  const [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [show, setShow] = useState(false),
    [database, setDatabase] = useState("");
  const [databases, setDatabases] = useState<{ id: string; name: string }[]>(
      [],
    ),
    [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const preset = districts.find((d) => d.id === district);
  const destination = preset
    ? `https://${preset.host}/HomeAccess`
    : portal.trim();
  async function connect(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const secret = password;
    setPassword("");
    try {
      const result = await request({
        action: "connect",
        portal: destination,
        username,
        password: secret,
        ...(database ? { database } : {}),
      });
      if (!result.snapshot)
        throw new Error("HAC returned no gradebook. No records were saved.");
      onSync(result.snapshot);
    } catch (e) {
      if (e instanceof ConnectionError && e.databases)
        setDatabases(e.databases);
      setError(
        e instanceof Error ? e.message : "The connection failed. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className={`hac-login-card ${compact ? "is-compact" : ""}`}
      aria-labelledby="hac-login-title"
    >
      <div className="hac-login-mark">
        <Link2 size={21} />
      </div>
      <h2 id="hac-login-title">Your grades, connected.</h2>
      <p>Sign in with your school’s Home Access Center account.</p>
      <form onSubmit={connect} aria-busy={busy}>
        <label className="field">
          <span>School district</span>
          <select
            aria-label="School district"
            value={district}
            disabled={busy}
            onChange={(e) => {
              setDistrict(e.target.value);
              setDatabase("");
              setDatabases([]);
              setError("");
              setConfirmed(false);
            }}
          >
            <option value="lisd">Leander ISD · LISD</option>
            <option value="rrisd">Round Rock ISD · RRISD</option>
            <option value="other">Another HAC district</option>
          </select>
        </label>
        {district === "other" && (
          <>
            <label className="field">
              <span>Official HAC portal address</span>
              <input
                type="url"
                inputMode="url"
                placeholder="https://your-district.org/HomeAccess"
                required
                value={portal}
                disabled={busy}
                autoComplete="url"
                onChange={(e) => {
                  setPortal(e.target.value);
                  setConfirmed(false);
                  setError("");
                }}
              />
            </label>
            <label className="hac-confirm">
              <input
                type="checkbox"
                checked={confirmed}
                required
                disabled={busy}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              <span>I checked this is my district’s official HAC address.</span>
            </label>
          </>
        )}
        <div className="hac-destination">
          <ShieldCheck size={15} />
          <span>
            Direct to {preset?.host ?? "the HAC portal you select"}. No
            third-party grade API.
          </span>
        </div>
        {databases.length > 0 && (
          <label className="field">
            <span>District database</span>
            <select
              required
              value={database}
              disabled={busy}
              onChange={(e) => setDatabase(e.target.value)}
            >
              <option value="">Choose your district database</option>
              {databases.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="field">
          <span>HAC username</span>
          <input
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            maxLength={200}
            value={username}
            disabled={busy || checking}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label className="field">
          <span>HAC password</span>
          <span className="hac-password">
            <input
              name="password"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              required
              maxLength={500}
              value={password}
              disabled={busy || checking}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              aria-label={show ? "Hide password" : "Show password"}
              aria-pressed={show}
              onClick={() => setShow(!show)}
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </span>
        </label>
        {error && (
          <p className="hac-login-error" role="alert">
            {error}
            {diagnostic && (
              <small style={{ display: "block", marginTop: 8 }}>
                Connection details: {diagnostic}
              </small>
            )}
          </p>
        )}
        <Button
          type="submit"
          disabled={busy || checking}
          className="hac-connect-button"
        >
          {busy ? (
            <>
              <RefreshCw size={17} />
              Signing in and syncing…
            </>
          ) : (
            <>
              Sign in & sync
              <ArrowRight size={17} />
            </>
          )}
        </Button>
      </form>
      <p className="hac-login-footnote">
        Your password is used for this sign-in, not saved by Gradelarp. Synced
        grades stay in this browser. District verification steps may require the
        official HAC website.
      </p>
      {onManual && (
        <button
          className="hac-manual-link"
          disabled={busy || checking}
          onClick={onManual}
        >
          Continue with manual grades instead
        </button>
      )}
    </section>
  );
}
export function HacWelcome({
  onSync,
  onManual,
}: {
  onSync: (s: LiveSnapshot) => void;
  onManual: () => void;
}) {
  return (
    <main className="hac-entry" data-testid="hac-entry">
      <header className="hac-entry-header">
        <Link href="/" aria-label="Gradelarp home">
          g<span>gradelarp.</span>
        </Link>
        <span>A little clarity. A lot of potential.</span>
      </header>
      <div className="hac-entry-layout">
        <section className="hac-entry-story">
          <span className="hac-entry-kicker">
            Your semester, in perspective.
          </span>
          <h1>
            Less checking.
            <br />
            More understanding.
          </h1>
          <p>
            A calmer home for your grades. Connect HAC to see what your school
            reports, keep track of assignments, and make room for what comes
            next.
          </p>
          <ul>
            <li>
              <BookOpen size={20} />
              <div>
                <strong>Your grades, together</strong>
                <span>
                  Course averages and assignment scores from your school.
                </span>
              </div>
            </li>
            <li>
              <GraduationCap size={20} />
              <div>
                <strong>Plan with perspective</strong>
                <span>
                  Manual what-if tools and custom GPA planning, without changing
                  school records.
                </span>
              </div>
            </li>
            <li>
              <ShieldCheck size={20} />
              <div>
                <strong>A direct connection</strong>
                <span>
                  Your sign-in goes to your district’s HAC portal. Your password
                  isn’t stored.
                </span>
              </div>
            </li>
          </ul>
          <p className="hac-entry-note">
            No sample grades. No invented progress. Just your school’s data and
            your own plans.
          </p>
        </section>
        <HacLogin onSync={onSync} onManual={onManual} />
      </div>
      <footer className="hac-entry-footer">
        <span>gradelarp.</span>
        <span>
          School-reported grades stay distinct from planning estimates.
        </span>
      </footer>
    </main>
  );
}
export function SchoolConnection({
  profile,
  onSync,
  onManual,
}: {
  profile: Profile;
  onSync: (s: LiveSnapshot) => void;
  onManual?: () => void;
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
        if (!c.signal.aborted) setError(connectionMessage(e));
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
      setError(connectionMessage(e));
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
