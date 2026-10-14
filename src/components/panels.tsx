"use client";
import { useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import {
  ArrowRight,
  ArrowUpRight,
  Beaker,
  BookOpen,
  Camera,
  Check,
  Download,
  FileSpreadsheet,
  HardDrive,
  Info,
  Plus,
  ShieldCheck,
  Target,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import {
  averageGrade,
  categoryBreakdown,
  courseGrade,
  cumulativeGpa,
  gpa,
  gradeLetter,
  requiredScore,
  scenarioCourse,
} from "@/lib/calculations";
import {
  PolicySchema,
  type AppState,
  type Course,
  type GpaPolicy,
  type Assignment,
} from "@/lib/model";
import {
  download,
  exportCsv,
  parseBackup,
  parseCsv,
  csvHeaders,
} from "@/lib/import-export";
import { formatGrade } from "@/lib/utils";
export function CoursesPanel({
  courses,
  policy,
  onOpen,
  onAdd,
}: {
  courses: Course[];
  policy: GpaPolicy;
  onOpen: (c: Course) => void;
  onAdd: () => void;
}) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name");
  const filtered = courses
    .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) =>
      sort === "grade"
        ? (courseGrade(b) ?? -1) - (courseGrade(a) ?? -1)
        : a.name.localeCompare(b.name),
    );
  return (
    <>
      <div className="panel-toolbar">
        <input
          aria-label="Search courses"
          placeholder="Find a course…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="Sort courses"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="name">Name: A → Z</option>
          <option value="grade">Highest grade</option>
        </select>
        <Button onClick={onAdd}>
          <Plus size={16} />
          Add course
        </Button>
      </div>
      <div className="course-grid">
        {filtered.map((c) => (
          <button
            className="course-card"
            style={{ "--course-color": c.color } as React.CSSProperties}
            key={c.id}
            onClick={() => onOpen(c)}
          >
            <div className="course-card-top">
              <div
                className="course-icon"
                style={{ color: c.color, background: `${c.color}15` }}
              >
                <BookOpen size={22} />
              </div>
              <span className="level-badge">{c.level}</span>
              <ArrowUpRight size={17} className="muted" />
            </div>
            <h3>{c.name}</h3>
            <p>
              {c.teacher || "No teacher added"} · {c.credits} credits
            </p>
            <div className="course-card-grade">
              <strong style={{ color: c.color }}>
                {formatGrade(courseGrade(c))}
                <small>%</small>
              </strong>
              <span className="letter-badge">
                {gradeLetter(courseGrade(c), policy)}
              </span>
            </div>
            <div className="progress">
              <i
                style={{
                  width: `${courseGrade(c) ?? 0}%`,
                  background: c.color,
                }}
              />
            </div>
            <div className="course-card-footer">
              <span>
                {c.assignments.filter((a) => a.status === "graded").length}{" "}
                graded assignments
              </span>
              <span>Target {c.target}%</span>
            </div>
          </button>
        ))}
      </div>
      {!filtered.length && (
        <Empty
          icon={<BookOpen />}
          title={
            courses.length ? "No matches." : "Your next chapter starts here."
          }
          description={
            courses.length
              ? "Try a different course name."
              : "Add a course and your assignments. We’ll take care of the math."
          }
          action={
            <Button onClick={onAdd}>
              <Plus size={16} />
              Add your first course
            </Button>
          }
        />
      )}
    </>
  );
}
export function Empty({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      {icon}
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function WhatIfPanel({ courses }: { courses: Course[] }) {
  const [id, setId] = useState(courses[0]?.id ?? "");
  const course = courses.find((c) => c.id === id) ?? courses[0];
  if (!course)
    return (
      <Empty
        icon={<Beaker />}
        title="Something to work toward."
        description="Add a course first, then explore how your next score could change your grade."
      />
    );
  return (
    <>
      <div className="page-intro">
        <div className="intro-icon">
          <Beaker size={23} />
        </div>
        <div>
          <h3>A little “what if” goes a long way.</h3>
          <p>Explore the possibilities without changing a single real grade.</p>
        </div>
        <span className="pill">Hypothetical</span>
      </div>
      <div className="panel-toolbar">
        <label className="flex">
          Course
          <select
            aria-label="What-if course"
            value={course.id}
            onChange={(e) => setId(e.target.value)}
          >
            {courses.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Scenario key={course.id} course={course} />
    </>
  );
}
function Scenario({ course }: { course: Course }) {
  const [assignmentId, setAssignmentId] = useState(
    course.assignments.find((a) => a.status === "future")?.id ?? "new",
  );
  const [score, setScore] = useState(90);
  const [target, setTarget] = useState(course.target);
  const [category, setCategory] = useState(course.categories[0].id);
  const [possible, setPossible] = useState(100);
  const assignment: Assignment = course.assignments.find(
    (a) => a.id === assignmentId,
  ) ?? {
    id: "scenario-new",
    name: "Hypothetical assignment",
    categoryId: category,
    earned: null,
    possible: Math.max(0.01, possible),
    status: "future",
    due: new Date().toISOString().slice(0, 10),
  };
  const valid =
    Number.isFinite(possible) &&
    possible > 0 &&
    Number.isFinite(target) &&
    target >= 0 &&
    target <= 100;
  const current = courseGrade(course),
    projected = courseGrade(scenarioCourse(course, assignment, score)),
    needed = valid ? requiredScore(course, assignment, target) : null;
  return (
    <div className="two-column scenario-layout">
      <section className="panel">
        <div className="panel-title">
          <h3>Your scenario</h3>
          <span className="tiny-label">NOT SAVED TO GRADES</span>
        </div>
        <div className="form-stack">
          <label>
            Assignment
            <select
              aria-label="Scenario assignment"
              value={assignmentId}
              onChange={(e) => setAssignmentId(e.target.value)}
            >
              <option value="new">+ New hypothetical assignment</option>
              {course.assignments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.status})
                </option>
              ))}
            </select>
          </label>
          {assignmentId === "new" && (
            <div className="form-grid">
              <label>
                Category
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {course.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Possible points
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={possible}
                  onChange={(e) => setPossible(Number(e.target.value))}
                />
              </label>
            </div>
          )}
          <div className="score-label">
            <span>What if I score…</span>
            <strong>
              {score}
              <small>%</small>
            </strong>
          </div>
          <input
            className="score-range"
            type="range"
            aria-label="Hypothetical score"
            min="0"
            max="100"
            step="1"
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
          />
          <div className="range-labels">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
          <div className="score-presets">
            {[70, 80, 90, 100].map((n) => (
              <Button
                key={n}
                variant={score === n ? "secondary" : "outline"}
                size="sm"
                onClick={() => setScore(n)}
              >
                {n}%
              </Button>
            ))}
          </div>
          <label>
            My target course grade (%)
            <input
              aria-label="Target course grade"
              type="number"
              min="0"
              max="100"
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
            />
          </label>
        </div>
      </section>
      <section className="panel projection">
        <div className="panel-title">
          <h3>The bigger picture</h3>
          <Target size={17} className="accent-text" />
        </div>
        <div className="projection-values">
          <div>
            <span>Current grade</span>
            <strong>
              {formatGrade(current)}
              <small>%</small>
            </strong>
          </div>
          <ArrowRight className="muted" />
          <div>
            <span>Projected grade</span>
            <strong className="accent-text" data-testid="projected-grade">
              {formatGrade(projected)}
              <small>%</small>
            </strong>
          </div>
        </div>
        <div className="comparison-bars">
          <div>
            <span>Current</span>
            <div className="progress">
              <i
                style={{
                  width: `${current ?? 0}%`,
                  background: "var(--muted)",
                }}
              />
            </div>
          </div>
          <div>
            <span>Projected</span>
            <div className="progress">
              <i style={{ width: `${projected ?? 0}%` }} />
            </div>
          </div>
        </div>
        <div className="target-result">
          <span className="tiny-label">TO REACH {target}% IN THIS COURSE</span>
          <h3>
            {!valid ? (
              "Check your inputs"
            ) : needed === null ? (
              "Not with this assignment alone."
            ) : needed === 0 ? (
              "You’ve got room to breathe."
            ) : (
              <>
                Aim for <span>{needed.toFixed(2)}%</span>
              </>
            )}
          </h3>
          <p>
            {!valid
              ? "Use positive possible points and a target between 0 and 100."
              : needed === null
                ? "Even a perfect score falls short. Try another assignment or a different target."
                : `That’s ${needed === 0 ? "0" : ((needed / 100) * assignment.possible).toFixed(2)} out of ${assignment.possible} points on ${assignment.name.toLowerCase()}.`}
          </p>
        </div>
        <details className="calculation-details" open>
          <summary>How the math works</summary>
          <p>
            {course.mode === "weighted"
              ? "Each category uses earned ÷ possible points. Its percentage is multiplied by its weight; only graded categories contribute."
              : "All included earned points are divided by all included possible points."}{" "}
            This scenario replaces the selected score, or adds one hypothetical
            assignment.
          </p>
          {categoryBreakdown(scenarioCourse(course, assignment, score)).map(
            (c) => (
              <div key={c.id}>
                <span>
                  {c.name} {course.mode === "weighted" ? `(${c.weight}%)` : ""}
                </span>
                <strong>
                  {c.earned.toFixed(1)} / {c.possible} → {formatGrade(c.grade)}%
                </strong>
              </div>
            ),
          )}
        </details>
      </section>
    </div>
  );
}
export function GpaPanel({
  courses,
  policy,
  onPolicy,
}: {
  courses: Course[];
  policy: GpaPolicy;
  onPolicy: (p: GpaPolicy) => void;
}) {
  const [edit, setEdit] = useState(false);
  const weighted = gpa(courses, policy),
    unweighted = gpa(courses, policy, false),
    cumulative = cumulativeGpa(courses, policy);
  return (
    <>
      <div className="inline-notice">
        <Info size={16} />
        <span>
          Your GPA, estimated—not official. This uses your custom scale, not a
          verified district policy.
        </span>
        <Button variant="ghost" size="sm" onClick={() => setEdit(true)}>
          Edit grading policy
          <ArrowRight size={14} />
        </Button>
      </div>
      <div className="gpa-stat-grid">
        {[
          [
            "Weighted GPA",
            weighted?.value,
            "Includes configured course bonuses",
          ],
          ["Unweighted GPA", unweighted?.value, "Before AP and honors bonuses"],
          [
            "Cumulative estimate",
            cumulative,
            "Current + entered prior credits",
          ],
        ].map(([label, value, caption]) => (
          <div className="panel gpa-stat" key={String(label)}>
            <span>{label}</span>
            <strong>
              {typeof value === "number" ? value.toFixed(2) : "—"}
            </strong>
            <p>{caption}</p>
          </div>
        ))}
      </div>
      <section className="panel">
        <div className="panel-title">
          <h3>Every course counts.</h3>
          <span className="pill">{policy.name}</span>
        </div>
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Course GPA breakdown"
        >
          <table>
            <thead>
              <tr>
                <th>Course</th>
                <th>Level</th>
                <th>Grade</th>
                <th>Credits</th>
                <th>Weighted points</th>
                <th>Quality points</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => {
                const value = gpa([c], policy);
                return (
                  <tr key={c.id}>
                    <td>
                      <span
                        className="color-dot"
                        style={{ background: c.color }}
                      />
                      {c.name}
                    </td>
                    <td>{c.level}</td>
                    <td>
                      {formatGrade(courseGrade(c))}% ·{" "}
                      {gradeLetter(courseGrade(c), policy)}
                    </td>
                    <td>{c.credits}</td>
                    <td>{value?.value.toFixed(2) ?? "—"}</td>
                    <td>{value?.qualityPoints.toFixed(2) ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>Included credits & quality points</td>
                <td>{weighted?.credits ?? 0}</td>
                <td>GPA = quality points ÷ credits</td>
                <td>{weighted?.qualityPoints.toFixed(2) ?? "—"}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
      <div className="two-column">
        <section className="panel">
          <div className="panel-title">
            <h3>Your grading scale</h3>
            <Button variant="ghost" size="sm" onClick={() => setEdit(true)}>
              Customize
              <ArrowRight size={14} />
            </Button>
          </div>
          <div className="grading-scale">
            {[...policy.scale]
              .sort((a, b) => b.min - a.min)
              .map((s) => (
                <div key={s.min}>
                  <strong>{s.letter}</strong>
                  <span>{s.min}% and up</span>
                  <b>{s.points.toFixed(1)}</b>
                </div>
              ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-title">
            <h3>Good to know</h3>
            <ShieldCheck size={18} className="mint-text" />
          </div>
          <div className="form-stack helper">
            <p>
              AP bonus: <strong>+{policy.apBonus}</strong> · Honors bonus:{" "}
              <strong>+{policy.honorsBonus}</strong>
              <br />
              Bonuses apply only at {policy.bonusMinimum}% or above.
            </p>
            <p>
              Prior credits: <strong>{policy.priorCredits}</strong> · Prior
              weighted GPA: <strong>{policy.priorGpa.toFixed(2)}</strong>
            </p>
            <p>
              Grades are not rounded before mapping to the scale. Ungraded
              courses do not contribute. Only courses in the selected semester
              are included in the current GPA.
            </p>
            <p>
              LISD is not listed: district-specific policies require official
              verification before integration.
            </p>
          </div>
        </section>
      </div>
      {edit && (
        <PolicyEditor
          initial={policy}
          onSave={(p) => {
            onPolicy(p);
            setEdit(false);
          }}
          onClose={() => setEdit(false)}
        />
      )}
    </>
  );
}
export function PolicyEditor({
  initial,
  onSave,
  onClose,
}: {
  initial: GpaPolicy;
  onSave: (p: GpaPolicy) => void;
  onClose: () => void;
}) {
  const [policy, setPolicy] = useState(initial);
  const [error, setError] = useState("");
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogTitle>Make the scale make sense.</DialogTitle>
        <DialogDescription>
          Enter your grading rules. This profile is a personal estimate.
        </DialogDescription>
        <div className="form-stack policy-editor">
          <label>
            Policy name
            <input
              value={policy.name}
              onChange={(e) => setPolicy({ ...policy, name: e.target.value })}
            />
          </label>
          <div className="scale-edit">
            <div className="scale-row tiny-label">
              <span>LETTER</span>
              <span>MINIMUM %</span>
              <span>GPA POINTS</span>
              <span />
            </div>
            {policy.scale.map((s, i) => (
              <div className="scale-row" key={i}>
                <input
                  aria-label={`Scale ${i + 1} letter`}
                  value={s.letter}
                  onChange={(e) =>
                    setPolicy({
                      ...policy,
                      scale: policy.scale.map((x, j) =>
                        j === i ? { ...x, letter: e.target.value } : x,
                      ),
                    })
                  }
                />
                <input
                  aria-label={`Scale ${i + 1} minimum`}
                  type="number"
                  min="0"
                  max="100"
                  value={s.min}
                  onChange={(e) =>
                    setPolicy({
                      ...policy,
                      scale: policy.scale.map((x, j) =>
                        j === i ? { ...x, min: Number(e.target.value) } : x,
                      ),
                    })
                  }
                />
                <input
                  aria-label={`Scale ${i + 1} points`}
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={s.points}
                  onChange={(e) =>
                    setPolicy({
                      ...policy,
                      scale: policy.scale.map((x, j) =>
                        j === i ? { ...x, points: Number(e.target.value) } : x,
                      ),
                    })
                  }
                />
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Remove scale row ${i + 1}`}
                  disabled={policy.scale.length === 1}
                  onClick={() =>
                    setPolicy({
                      ...policy,
                      scale: policy.scale.filter((_, j) => i !== j),
                    })
                  }
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setPolicy({
                  ...policy,
                  scale: [
                    ...policy.scale,
                    { min: 0, points: 0, letter: "New" },
                  ],
                })
              }
            >
              <Plus size={14} />
              Add threshold
            </Button>
          </div>
          <div className="form-grid">
            {(
              [
                "apBonus",
                "honorsBonus",
                "bonusMinimum",
                "priorCredits",
                "priorGpa",
              ] as const
            ).map((key) => (
              <label key={key}>
                {
                  {
                    apBonus: "AP bonus",
                    honorsBonus: "Honors bonus",
                    bonusMinimum: "Bonus minimum (%)",
                    priorCredits: "Prior credits",
                    priorGpa: "Prior weighted GPA",
                  }[key]
                }
                <input
                  aria-label={
                    {
                      apBonus: "AP bonus",
                      honorsBonus: "Honors bonus",
                      bonusMinimum: "Bonus minimum",
                      priorCredits: "Prior credits",
                      priorGpa: "Prior weighted GPA",
                    }[key]
                  }
                  type="number"
                  min="0"
                  step="0.1"
                  value={policy[key]}
                  onChange={(e) =>
                    setPolicy({ ...policy, [key]: Number(e.target.value) })
                  }
                />
              </label>
            ))}
          </div>
          <p className="helper">
            Prior GPA and credits must use the same scale as your current
            weighted calculation. Do not include the current semester in prior
            credits.
          </p>
        </div>
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-footer">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const p = PolicySchema.safeParse(policy);
              if (!p.success) setError(p.error.issues[0].message);
              else onSave(p.data);
            }}
          >
            Save policy
            <Check size={14} />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
export function TrendsPanel({
  state,
  semester,
  onSnapshot,
}: {
  state: AppState;
  semester: string;
  onSnapshot: () => void;
}) {
  const reduced = useReducedMotion();
  const [now] = useState(() => Date.now());
  const [range, setRange] = useState("all");
  const [selected, setSelected] = useState("average");
  const [selectedAssignment, setSelectedAssignment] = useState("");
  const courses = state.courses.filter((c) => c.semester === semester);
  const snapshots = state.snapshots.filter(
    (s) =>
      s.semester === semester &&
      (range === "all" || now - Date.parse(s.at) <= Number(range) * 86400000),
  );
  const points = snapshots.map((s) => {
    const vals = Object.values(s.grades).filter((g): g is number => g !== null);
    return {
      at: s.at,
      value:
        selected === "average"
          ? vals.length
            ? vals.reduce((a, b) => a + b, 0) / vals.length
            : null
          : selectedAssignment
            ? (s.assignments?.[selected]?.[selectedAssignment]?.percent ?? null)
            : (s.grades[selected] ?? null),
    };
  });
  const semesters = [...new Set(state.courses.map((c) => c.semester))];
  return (
    <>
      <div className="panel-toolbar">
        <div className="flex">
          <select
            aria-label="Trend course"
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              setSelectedAssignment("");
            }}
          >
            <option value="average">Course average</option>
            {courses.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {selected !== "average" && (
            <select
              aria-label="Trend assignment"
              value={selectedAssignment}
              onChange={(e) => setSelectedAssignment(e.target.value)}
            >
              <option value="">Course grade</option>
              {courses
                .find((c) => c.id === selected)
                ?.assignments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
          )}
          <select
            aria-label="Trend date range"
            value={range}
            onChange={(e) => setRange(e.target.value)}
          >
            <option value="all">All snapshots</option>
            <option value="30">Last 30 days</option>
            <option value="7">Last 7 days</option>
          </select>
        </div>
        <Button variant="secondary" onClick={onSnapshot}>
          <Camera size={16} />
          Record snapshot
        </Button>
      </div>
      <section className="panel">
        <div className="panel-title">
          <h3>Your progress, over time.</h3>
          <span className="pill">
            {snapshots.length} real snapshot{snapshots.length !== 1 ? "s" : ""}
          </span>
        </div>
        {snapshots.length < 2 ? (
          <Empty
            icon={<Camera />}
            title="Your story is still unfolding."
            description="We won’t invent a trend. Grade edits record real snapshots; add a second snapshot to see your progress."
            action={
              <Button variant="outline" onClick={onSnapshot}>
                Record current grades
              </Button>
            }
          />
        ) : (
          <>
            <div className="trend-chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={points}
                  margin={{ top: 15, right: 25, bottom: 10, left: 0 }}
                >
                  <defs>
                    <linearGradient id="trend-fill" x1="0" x2="0" y1="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="var(--accent)"
                        stopOpacity={0.2}
                      />
                      <stop
                        offset="100%"
                        stopColor="var(--accent)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    vertical={false}
                    stroke="var(--border)"
                    strokeDasharray="3 5"
                  />
                  <XAxis
                    dataKey="at"
                    tickFormatter={(v) =>
                      new Date(v).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })
                    }
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--muted)", fontSize: 11 }}
                    minTickGap={40}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "var(--muted)", fontSize: 11 }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--panel)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      color: "var(--text)",
                    }}
                    labelFormatter={(label) =>
                      new Date(String(label)).toLocaleString()
                    }
                    formatter={(v) => [`${Number(v).toFixed(2)}%`, "Grade"]}
                  />
                  <ReferenceLine
                    y={90}
                    stroke="var(--muted)"
                    strokeDasharray="4 6"
                  />
                  <Area
                    dataKey="value"
                    type="linear"
                    connectNulls={false}
                    stroke="var(--accent)"
                    strokeWidth={2.5}
                    fill="url(#trend-fill)"
                    dot={{ r: 4 }}
                    isAnimationActive={
                      !reduced && state.settings.motion !== "none"
                    }
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <details className="calculation-details">
              <summary>View snapshot data as a table</summary>
              <div
                className="table-scroll"
                tabIndex={0}
                role="region"
                aria-label="Recorded snapshot data"
              >
                <table>
                  <thead>
                    <tr>
                      <th>Recorded at</th>
                      <th>Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {points.map((p, i) => (
                      <tr key={i}>
                        <td>{new Date(p.at).toLocaleString()}</td>
                        <td>{formatGrade(p.value)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        )}
      </section>
      <div className="two-column">
        <section className="panel">
          <div className="panel-title">
            <h3>Semester comparison</h3>
            <span className="tiny-label">ENTERED COURSE DATA</span>
          </div>
          {semesters.map((s) => (
            <div className="semester-row" key={s}>
              <span>{s}</span>
              <strong>
                {formatGrade(
                  averageGrade(state.courses.filter((c) => c.semester === s)),
                )}
                %
              </strong>
              <small>
                {gpa(
                  state.courses.filter((c) => c.semester === s),
                  state.policy,
                )?.value.toFixed(2) ?? "—"}{" "}
                GPA estimate
              </small>
            </div>
          ))}
        </section>
        <section className="panel">
          <div className="panel-title">
            <h3>Where you’re headed</h3>
            <Target size={18} className="accent-text" />
          </div>
          {courses.map((c) => (
            <div className="goal-row" key={c.id}>
              <span>{c.name}</span>
              <strong
                className={
                  (courseGrade(c) ?? -1) >= c.target
                    ? "mint-text"
                    : "amber-text"
                }
              >
                {formatGrade(courseGrade(c))}%
              </strong>
              <small>goal {c.target}%</small>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
export function DataPanel({
  state,
  onImport,
  onClear,
  onDemo,
  notify,
}: {
  state: AppState;
  onImport: (s: AppState) => void;
  onClear: () => void;
  onDemo: () => void;
  notify: (m: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{
    courses?: Course[];
    backup?: AppState;
    name: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [replace, setReplace] = useState(true);
  const [confirm, setConfirm] = useState(false);
  async function load(file: File) {
    setError("");
    if (file.size > 10 * 1024 * 1024) {
      setError("Choose a file smaller than 10 MB.");
      return;
    }
    try {
      const text = await file.text();
      if (
        file.name.toLowerCase().endsWith(".json") ||
        text.trimStart().startsWith("{")
      )
        setPending({ backup: parseBackup(text), name: file.name });
      else {
        const courses = parseCsv(text);
        if (!courses.length) throw new Error("This CSV has no assignments.");
        setPending({ courses, name: file.name });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "The file could not be read.");
    }
  }
  return (
    <>
      <div className="inline-notice">
        <ShieldCheck size={17} />
        <span>
          Your data stays in your browser. No account. No school passwords. No
          cloud uploads.
        </span>
        <span className="pill">
          <span className="status-dot" />
          Local-first
        </span>
      </div>
      <div className="two-column">
        <section className="panel data-card">
          <div className="data-icon">
            <Upload />
          </div>
          <h3>Bring your grades along.</h3>
          <p>
            Import assignments from a CSV, or restore a complete gradelarp JSON
            backup.
          </p>
          <input
            type="file"
            aria-label="Import CSV or backup"
            accept=".csv,.json"
            ref={ref}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void load(file);
              e.target.value = "";
            }}
          />
          <Button onClick={() => ref.current?.click()}>
            <Upload size={16} />
            Choose a file
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              download(
                "gradelarp-template.csv",
                csvHeaders.join(",") +
                  "\nBiology,Ms. Smith,Regular,Fall 2026,0.5,weighted,Major grades,60,Unit 1 test,92,100,graded,2026-10-12\nBiology,Ms. Smith,Regular,Fall 2026,0.5,weighted,Daily work,40,Lab notebook,45,50,graded,2026-10-13\n",
                "text/csv",
              )
            }
          >
            Download CSV template
            <Download size={13} />
          </Button>
        </section>
        <section className="panel data-card">
          <div className="data-icon">
            <Download />
          </div>
          <h3>Always yours to keep.</h3>
          <p>
            Export assignment data, or make a full backup with your courses,
            settings, scale, and real snapshots.
          </p>
          <div className="flex">
            <Button
              variant="secondary"
              onClick={() => {
                download(
                  "gradelarp-backup.json",
                  JSON.stringify(state, null, 2),
                );
                notify("Full backup downloaded.");
              }}
            >
              <HardDrive size={16} />
              Full backup
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                download(
                  "gradelarp-grades.csv",
                  exportCsv(state.courses),
                  "text/csv",
                );
                notify("Assignment CSV exported.");
              }}
            >
              <FileSpreadsheet size={16} />
              Export CSV
            </Button>
          </div>
          <p className="helper">
            CSV exports assignments only. JSON preserves the complete workspace.
          </p>
        </section>
      </div>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      <section className="panel">
        <div className="panel-title">
          <h3>One device. One little workspace.</h3>
          <ShieldCheck size={18} className="mint-text" />
        </div>
        <div className="data-summary">
          <div>
            <span>Courses</span>
            <strong>{state.courses.length}</strong>
          </div>
          <div>
            <span>Assignments</span>
            <strong>
              {state.courses.reduce((n, c) => n + c.assignments.length, 0)}
            </strong>
          </div>
          <div>
            <span>Snapshots</span>
            <strong>{state.snapshots.length}</strong>
          </div>
          <div>
            <span>Data source</span>
            <strong>{state.demo ? "Demo" : "Manual / imported"}</strong>
          </div>
        </div>
        <p className="helper">
          Browser storage may be cleared by private browsing, device cleanup, or
          browser settings. Keep a backup for anything important. HAC and cloud
          sync are not connected.
        </p>
      </section>
      <section className="panel danger-zone">
        <div>
          <h3>A fresh page.</h3>
          <p>
            Clear your data to start from scratch, or reload the sample courses
            to explore.
          </p>
        </div>
        <div className="flex">
          <Button variant="outline" onClick={onDemo}>
            Load demo data
          </Button>
          <Button variant="destructive" onClick={() => setConfirm(true)}>
            <Trash2 size={15} />
            Clear all data
          </Button>
        </div>
      </section>
      {pending && (
        <Dialog open onOpenChange={(open) => !open && setPending(null)}>
          <DialogContent>
            <DialogTitle>Ready to bring it in?</DialogTitle>
            <DialogDescription>
              {pending.name} ·{" "}
              {pending.courses?.length ?? pending.backup?.courses.length}{" "}
              courses ·{" "}
              {pending.courses?.reduce((n, c) => n + c.assignments.length, 0) ??
                pending.backup?.courses.reduce(
                  (n, c) => n + c.assignments.length,
                  0,
                )}{" "}
              assignments
            </DialogDescription>
            <div className="import-preview">
              {(pending.courses ?? pending.backup?.courses)?.map((c) => (
                <div key={c.id}>
                  <BookOpen size={16} />
                  <span>{c.name}</span>
                  <strong>{formatGrade(courseGrade(c))}%</strong>
                </div>
              ))}
            </div>
            {pending.backup ? (
              <p className="helper">
                Restoring replaces this workspace, including settings and
                snapshots. Create a backup first if you want to keep it.
              </p>
            ) : (
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={replace}
                  onChange={(e) => setReplace(e.target.checked)}
                />
                Replace existing courses (uncheck to append)
              </label>
            )}
            <div className="dialog-footer">
              <Button variant="outline" onClick={() => setPending(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  onImport(
                    pending.backup ?? {
                      ...state,
                      demo: false,
                      courses: replace
                        ? (pending.courses ?? [])
                        : [...state.courses, ...(pending.courses ?? [])],
                      snapshots: replace ? [] : state.snapshots,
                    },
                  );
                  setPending(null);
                }}
              >
                Confirm import
                <Check size={15} />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {confirm && (
        <Dialog open onOpenChange={setConfirm}>
          <DialogContent>
            <DialogTitle>Start with a clean slate?</DialogTitle>
            <DialogDescription>
              This clears all courses, snapshots, settings, and grading policies
              from this workspace. An exported backup can restore them.
            </DialogDescription>
            <div className="dialog-footer">
              <Button variant="outline" onClick={() => setConfirm(false)}>
                Keep my data
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  onClear();
                  setConfirm(false);
                }}
              >
                Yes, clear everything
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
