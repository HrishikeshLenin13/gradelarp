"use client";
import { useEffect } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  Clock,
  GraduationCap,
  GripVertical,
  ListChecks,
  Target,
  TrendingUp,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  motion,
  animate,
  useMotionValue,
  useTransform,
  useReducedMotion,
} from "motion/react";
import { Button } from "./ui/button";
import {
  assignmentChanges,
  averageGrade,
  courseGrade,
  gpa,
  gradeLetter,
  semesterProgress,
} from "@/lib/calculations";
import type {
  AppState,
  Course,
  GpaPolicy,
  Settings,
  Widget,
} from "@/lib/model";
import { formatGrade } from "@/lib/utils";
export function SummaryCards({
  courses,
  policy,
  settings,
}: {
  courses: Course[];
  policy: GpaPolicy;
  settings: Settings;
}) {
  const weighted = gpa(courses, policy);
  const avg = averageGrade(courses);
  const onTrack = courses.filter(
    (c) => courseGrade(c) !== null && (courseGrade(c) ?? 0) >= c.target,
  ).length;
  const progress = semesterProgress(
    settings.semesterStart,
    settings.semesterEnd,
  );
  const cards = [
    {
      label: "Weighted GPA",
      value: weighted?.value.toFixed(2) ?? "—",
      unit: "",
      icon: <GraduationCap size={18} />,
      footer: (
        <>
          <span className="small-pill">Custom scale</span>
          <span>Hypothetical estimate</span>
        </>
      ),
    },
    {
      label: "Average grade",
      value: formatGrade(avg),
      unit: "%",
      icon: <BookOpen size={17} />,
      footer: (
        <>
          <span className="mint-text">
            <Check size={12} />
            {avg !== null && avg >= 90 ? "A-range average" : "Course average"}
          </span>
          <span>Across {courses.length} courses</span>
        </>
      ),
    },
    {
      label: "On track",
      value: String(onTrack).padStart(2, "0"),
      unit: `/ ${courses.length}`,
      icon: <Target size={17} />,
      footer: (
        <>
          <span className="mint-text">
            <span className="status-dot" />
            Meeting your targets
          </span>
          <span>{courses.length - onTrack} to focus on</span>
        </>
      ),
    },
    {
      label: "Semester progress",
      value: progress.toFixed(0),
      unit: "%",
      icon: <Clock size={17} />,
      footer: (
        <>
          <span>Keep your momentum.</span>
          <div className="mini-progress">
            <i style={{ width: `${progress}%` }} />
          </div>
        </>
      ),
    },
  ];
  return (
    <div className="summary-grid">
      {cards.map((card, i) => (
        <motion.section
          key={card.label}
          className="stat-card"
          initial={settings.motion === "none" ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: settings.motion === "full" ? 0.5 : 0.25,
            delay: i * 0.04,
          }}
        >
          <div className="stat-label">
            <span>{card.label}</span>
            {card.icon}
          </div>
          <div className="stat-value">
            <AnimatedValue value={card.value} intensity={settings.motion} />
            <small>{card.unit}</small>
          </div>
          <div className="stat-footer">{card.footer}</div>
        </motion.section>
      ))}
    </div>
  );
}
function AnimatedValue({
  value,
  intensity,
}: {
  value: string;
  intensity: Settings["motion"];
}) {
  const reduced = useReducedMotion();
  const numeric = Number(value),
    valid = Number.isFinite(numeric);
  const counter = useMotionValue(0);
  const text = useTransform(counter, (n) =>
    value.includes(".")
      ? n.toFixed(value.split(".")[1].length)
      : String(Math.round(n)).padStart(value.length, "0"),
  );
  useEffect(() => {
    if (!valid) return;
    const control = animate(counter, numeric, {
      duration: !reduced && intensity === "full" ? 0.6 : 0,
      ease: "easeOut",
    });
    return () => control.stop();
  }, [counter, numeric, valid, intensity, reduced]);
  return valid ? <motion.span>{text}</motion.span> : <span>{value}</span>;
}
export function SortableWidget({
  id,
  children,
}: {
  id: Widget;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  return (
    <section
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
        opacity: isDragging ? 0.8 : 1,
      }}
      className={`panel dashboard-widget widget-${id}`}
    >
      <button
        ref={setActivatorNodeRef}
        title="Drag to reorder, or use Space and arrow keys"
        className="widget-grip"
        aria-label={`Reorder ${id} widget`}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={15} />
      </button>
      {children}
    </section>
  );
}
export function CourseWidget({
  courses,
  policy,
  onOpen,
  onView,
  onAdd,
}: {
  courses: Course[];
  policy: GpaPolicy;
  onOpen: (c: Course) => void;
  onView: () => void;
  onAdd: () => void;
}) {
  return (
    <>
      <div className="panel-title">
        <div className="flex">
          <h3>Your courses</h3>
          <span className="count-badge">{courses.length}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onView}>
          View all
          <ArrowUpRight size={14} />
        </Button>
      </div>
      <div className="course-table-head">
        <span>COURSE</span>
        <span>PROGRESS TO 100%</span>
        <span>GRADE</span>
      </div>
      {courses.map((c, i) => (
        <button className="course-row" key={c.id} onClick={() => onOpen(c)}>
          <div className="course-row-info">
            <div
              className="course-icon"
              style={{ color: c.color, background: `${c.color}13` }}
            >
              {i % 3 === 0 ? (
                <GraduationCap size={19} />
              ) : (
                <BookOpen size={18} />
              )}
            </div>
            <div>
              <strong>{c.name}</strong>
              <span>
                {c.teacher || "Your course"} <i /> {c.level}
              </span>
            </div>
          </div>
          <div className="course-row-progress">
            <div className="progress">
              <i
                style={{
                  width: `${courseGrade(c) ?? 0}%`,
                  background: c.color,
                }}
              />
            </div>
            <span>
              {c.assignments.filter((a) => a.status === "graded").length} graded
              · goal {c.target}%
            </span>
          </div>
          <div className="course-row-score">
            <strong>
              {formatGrade(courseGrade(c))}
              <small>%</small>
            </strong>
            <span style={{ color: c.color, background: `${c.color}15` }}>
              {gradeLetter(courseGrade(c), policy)}
            </span>
            <ChevronRight size={14} />
          </div>
        </button>
      ))}
      {!courses.length && (
        <div className="empty-state">
          <BookOpen />
          <h3>Make room for your courses.</h3>
          <p>Your first assignment is a fresh start.</p>
          <Button onClick={onAdd}>Add a course</Button>
        </div>
      )}
      <div className="panel-bottom">
        <span className="status-dot" />
        <span>Calculated from your assignments.</span>
        <Button variant="ghost" size="sm" onClick={onAdd}>
          + Add course
        </Button>
      </div>
    </>
  );
}
export function DistributionWidget({
  courses,
  policy,
  settings,
}: {
  courses: Course[];
  policy: GpaPolicy;
  settings: Settings;
}) {
  const reduced = useReducedMotion();
  const letters = [...policy.scale]
    .sort((a, b) => b.min - a.min)
    .map((s) => s.letter);
  const data = letters.map((letter) => ({
    letter,
    count: courses.filter((c) => gradeLetter(courseGrade(c), policy) === letter)
      .length,
  }));
  const graded = courses.filter((c) => courseGrade(c) !== null).length;
  const atarget = courses.filter(
    (c) => (courseGrade(c) ?? -1) >= c.target,
  ).length;
  return (
    <>
      <div className="panel-title">
        <h3>Grade distribution</h3>
        <span className="tiny-label">CURRENT</span>
      </div>
      <div className="distribution-highlight">
        <strong>
          {data[0]?.count ?? 0}
          <small>/ {graded}</small>
        </strong>
        <span>
          courses in the
          <br />
          <b>{letters[0] ?? "top"} range</b>
        </span>
        <div className="distribution-symbol">
          <GraduationCap size={27} />
        </div>
      </div>
      <div
        className="distribution-chart"
        role="img"
        aria-label={`Grade distribution: ${data.map((d) => `${d.letter}: ${d.count} courses`).join(", ")}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 12, right: 0, left: -28, bottom: 0 }}
            barSize={29}
          >
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeDasharray="3 5"
            />
            <XAxis
              dataKey="letter"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--muted)", fontSize: 12 }}
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--muted)", fontSize: 10 }}
              domain={[0, Math.max(...data.map((d) => d.count), 3)]}
            />
            <Tooltip
              cursor={{ fill: "var(--hover)" }}
              contentStyle={{
                background: "var(--panel)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--text)",
                fontSize: 12,
              }}
              formatter={(value) => [value, "Courses"]}
            />
            <Bar
              dataKey="count"
              fill="var(--accent)"
              radius={[4, 4, 0, 0]}
              isAnimationActive={!reduced && settings.motion === "full"}
              animationDuration={600}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="distribution-footer">
        <span className="mint-text">
          <Target size={14} />
          {atarget} of {courses.length} on target
        </span>
        <p>A little progress adds up.</p>
      </div>
    </>
  );
}
export function upcoming(courses: Course[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return courses
    .flatMap((c) =>
      c.assignments
        .filter(
          (a) =>
            (a.status === "future" ||
              a.status === "ungraded" ||
              a.status === "missing") &&
            new Date(a.due + "T23:59:59").getTime() >= today.getTime(),
        )
        .map((a) => ({ ...a, course: c })),
    )
    .sort((a, b) => a.due.localeCompare(b.due));
}
export function UpcomingWidget({
  courses,
  onOpen,
  onLab,
}: {
  courses: Course[];
  onOpen: (c: Course) => void;
  onLab: () => void;
}) {
  const items = upcoming(courses).slice(0, 4);
  return (
    <>
      <div className="panel-title">
        <div className="flex">
          <h3>Coming up</h3>
          <span className="count-badge">{upcoming(courses).length}</span>
        </div>
        <span className="tiny-label">NEXT ASSIGNMENTS</span>
      </div>
      {items.length ? (
        items.map((a) => (
          <button
            className="upcoming-row"
            key={a.id}
            onClick={() => onOpen(a.course)}
          >
            <div className="date-tile">
              <span>
                {new Date(a.due + "T12:00:00").toLocaleDateString(undefined, {
                  month: "short",
                })}
              </span>
              <strong>{new Date(a.due + "T12:00:00").getDate()}</strong>
            </div>
            <div>
              <strong>{a.name}</strong>
              <span>
                <span
                  className="color-dot"
                  style={{ background: a.course.color }}
                />
                {a.course.name}
              </span>
            </div>
            <span className="due-tag">{a.possible} pts</span>
            <ChevronRight size={14} />
          </button>
        ))
      ) : (
        <div className="empty-state small">
          <Check />
          <h3>A little breathing room.</h3>
          <p>No upcoming assignments added.</p>
        </div>
      )}
      <div className="panel-bottom">
        <BeakerIcon />
        <span>Aim for your next best score.</span>
        <Button variant="ghost" size="sm" onClick={onLab}>
          Try what-if
          <ArrowRight size={13} />
        </Button>
      </div>
    </>
  );
}
function BeakerIcon() {
  return <Target size={13} className="accent-text" />;
}
export function ActivityWidget({
  state,
  courses,
  onOpen,
}: {
  state: AppState;
  courses: Course[];
  onOpen: (c: Course) => void;
}) {
  const changes = assignmentChanges(state.snapshots, courses).slice(0, 4);
  const items = courses
    .flatMap((c) =>
      c.assignments
        .filter((a) => a.status === "graded" || a.status === "missing")
        .map((a) => ({ ...a, course: c })),
    )
    .sort((a, b) => b.due.localeCompare(a.due))
    .slice(0, 4);
  return (
    <>
      <div className="panel-title">
        <h3>{changes.length ? "Recent changes" : "Recent assignments"}</h3>
        <ListChecks size={17} className="muted" />
      </div>
      {changes.length ? (
        changes.map((change) => (
          <button
            className="activity-row"
            key={change.id}
            onClick={() => onOpen(change.course)}
          >
            <div
              className="activity-check"
              style={{
                color: change.course.color,
                background: `${change.course.color}13`,
              }}
            >
              <TrendingUp size={15} />
            </div>
            <div>
              <strong>{change.name}</strong>
              <span>
                {change.course.name} ·{" "}
                {new Date(change.at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
            <b className="accent-text">
              {formatGrade(change.before)} → {formatGrade(change.after)}
              {change.after !== null ? "%" : ""}
            </b>
          </button>
        ))
      ) : items.length ? (
        items.map((a) => (
          <button
            className="activity-row"
            key={a.id}
            onClick={() => onOpen(a.course)}
          >
            <div
              className="activity-check"
              style={{
                color: a.course.color,
                background: `${a.course.color}13`,
              }}
            >
              <Check size={15} />
            </div>
            <div>
              <strong>{a.name}</strong>
              <span>{a.course.name}</span>
            </div>
            <b className={a.status === "missing" ? "amber-text" : "mint-text"}>
              {a.status === "missing"
                ? "Missing"
                : `${formatGrade(((a.earned ?? 0) / a.possible) * 100)}%`}
            </b>
          </button>
        ))
      ) : (
        <div className="empty-state small">
          <ListChecks />
          <h3>The details live here.</h3>
          <p>Add graded assignments to see them.</p>
        </div>
      )}
      <div className="panel-bottom">
        <span className="tiny-label">
          {changes.length
            ? "FROM ACTUAL RECORDED SNAPSHOTS"
            : state.demo
              ? "LABELED DEMO ASSIGNMENTS"
              : "SORTED BY ASSIGNMENT DUE DATE"}
        </span>
      </div>
    </>
  );
}
