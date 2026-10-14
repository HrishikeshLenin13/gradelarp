"use client";
import { useState } from "react";
import { Plus, ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uid } from "@/lib/utils";
import type { Course } from "@/lib/model";
import { localDate, TaskSchema, type Profile, type Task } from "./model";
import { EntityEditor, Confirm } from "./forms";
export function Planner({
  profile,
  onUpdate,
  onCourse,
}: {
  profile: Profile;
  onUpdate: (p: Profile) => void;
  onCourse: (c: Course) => void;
}) {
  const [mode, setMode] = useState<"list" | "calendar">("list"),
    [filter, setFilter] = useState("open"),
    [query, setQuery] = useState(""),
    [day, setDay] = useState(""),
    [month, setMonth] = useState(() => localDate().slice(0, 7));
  const [editor, setEditor] = useState<Task | null>(null),
    [deleting, setDeleting] = useState<string | null>(null);
  const today = localDate();
  const manual = profile.tasks.map((t) => ({
    ...t,
    kind: "task" as const,
    course: profile.state.courses.find((c) => c.id === t.courseId),
    key: t.id,
  }));
  const assignments = profile.state.courses.flatMap((c) =>
    c.assignments
      .filter((a) => ["future", "ungraded", "missing"].includes(a.status))
      .map((a) => ({
        id: a.id,
        key: `${c.id}/${a.id}`,
        title: a.name,
        date: a.due,
        priority: a.status === "missing" ? "high" : "normal",
        done: profile.completedAssignments.includes(`${c.id}/${a.id}`),
        notes:
          a.status === "missing"
            ? "Marked missing in gradebook"
            : "Completion here does not edit the gradebook.",
        course: c,
        kind: "assignment" as const,
      })),
  );
  const all = [...manual, ...assignments].sort(
    (a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title),
  );
  const items = all.filter(
    (t) =>
      (filter === "all" || filter === "done"
        ? filter === "all" || t.done
        : !t.done) &&
      (filter !== "overdue" || t.date < today) &&
      (!day || t.date === day) &&
      `${t.title} ${t.course?.name ?? ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  function add(date = day || today) {
    setEditor({
      id: uid(),
      title: "",
      courseId: "",
      date,
      priority: "normal",
      done: false,
      notes: "",
    });
  }
  function toggle(item: (typeof all)[number]) {
    onUpdate(
      item.kind === "task"
        ? {
            ...profile,
            tasks: profile.tasks.map((t) =>
              t.id === item.id ? { ...t, done: !t.done } : t,
            ),
          }
        : {
            ...profile,
            completedAssignments: item.done
              ? profile.completedAssignments.filter((k) => k !== item.key)
              : [...profile.completedAssignments, item.key],
          },
    );
  }
  const date = new Date(month + "-01T12:00:00"),
    start = date.getDay(),
    days = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  function shift(n: number) {
    const d = new Date(month + "-01T12:00:00");
    d.setMonth(d.getMonth() + n);
    setMonth(localDate(d).slice(0, 7));
    setDay("");
  }
  return (
    <div className="product-stack">
      <div className="product-toolbar">
        <div className="segmented">
          <button
            aria-pressed={mode === "list"}
            onClick={() => {
              setMode("list");
              setDay("");
            }}
          >
            Agenda
          </button>
          <button
            aria-pressed={mode === "calendar"}
            onClick={() => setMode("calendar")}
          >
            Calendar
          </button>
        </div>
        <Button onClick={() => add()}>
          <Plus size={16} />
          Add task
        </Button>
      </div>
      <div className="product-planner-stats">
        <span>
          <b>{all.filter((t) => !t.done && t.date < today).length}</b> overdue
        </span>
        <span>
          <b>{all.filter((t) => !t.done && t.date === today).length}</b> due
          today
        </span>
        <span>
          <b>{all.filter((t) => t.done).length}</b> completed
        </span>
      </div>
      {mode === "calendar" && (
        <section className="panel">
          <div className="panel-title">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Previous month"
              onClick={() => shift(-1)}
            >
              <ChevronLeft size={20} />
            </Button>
            <h2>
              {date.toLocaleDateString(undefined, {
                month: "long",
                year: "numeric",
              })}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Next month"
              onClick={() => shift(1)}
            >
              <ChevronRight size={20} />
            </Button>
          </div>
          <div className="product-calendar" aria-label="Homework calendar">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <span key={d} className="product-weekday">
                {d}
              </span>
            ))}
            {Array.from({ length: start }, (_, i) => (
              <span key={`blank-${i}`} aria-hidden="true" />
            ))}
            {Array.from({ length: days }, (_, i) => {
              const key = `${month}-${String(i + 1).padStart(2, "0")}`,
                due = all.filter((t) => t.date === key && !t.done);
              return (
                <button
                  key={key}
                  aria-label={`${key}, ${due.length} open tasks`}
                  aria-pressed={day === key}
                  data-today={key === today}
                  onClick={() => setDay(day === key ? "" : key)}
                >
                  <b>{i + 1}</b>
                  {due.length > 0 && (
                    <>
                      <span>{due[0].title}</span>
                      <small>{due.length} due</small>
                    </>
                  )}
                </button>
              );
            })}
          </div>
          <p className="helper">
            Select a day to filter the agenda below. All dates use your device’s
            local timezone.
          </p>
        </section>
      )}
      <section className="panel">
        <div className="product-toolbar">
          <label className="product-search">
            Search planner
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Assignment or course"
            />
          </label>
          <label>
            Show tasks
            <select
              aria-label="Show tasks"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="open">Open</option>
              <option value="overdue">Overdue</option>
              <option value="done">Completed</option>
              <option value="all">All tasks</option>
            </select>
          </label>
        </div>
        {day && (
          <div className="product-toolbar">
            <h3>
              {new Date(day + "T12:00:00").toLocaleDateString(undefined, {
                dateStyle: "long",
              })}
            </h3>
            <Button variant="ghost" onClick={() => setDay("")}>
              Show all days
            </Button>
          </div>
        )}
        <div className="product-agenda">
          {items.map((t) => (
            <article key={t.key} data-done={t.done}>
              <label className="product-check">
                <input
                  type="checkbox"
                  aria-label={`Complete ${t.title}`}
                  checked={t.done}
                  onChange={() => toggle(t)}
                />
              </label>
              <div className="product-agenda-title">
                <strong>{t.title}</strong>
                <span>
                  {t.course?.name ?? "Personal task"} ·{" "}
                  {t.kind === "assignment"
                    ? "Gradebook deadline"
                    : "Planner task"}
                </span>
                {t.notes && <small>{t.notes}</small>}
              </div>
              <div className="product-agenda-date">
                <b>
                  {new Date(t.date + "T12:00:00").toLocaleDateString(
                    undefined,
                    { month: "short", day: "numeric" },
                  )}
                </b>
                <span>
                  {t.date < today && !t.done
                    ? "Overdue"
                    : t.priority === "high"
                      ? "High priority"
                      : t.date === today
                        ? "Today"
                        : ""}
                </span>
              </div>
              <div className="flex">
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Edit ${t.title}`}
                  onClick={() =>
                    t.kind === "task"
                      ? setEditor(profile.tasks.find((x) => x.id === t.id)!)
                      : onCourse(t.course!)
                  }
                >
                  <Pencil size={16} />
                </Button>
                {t.kind === "task" && (
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Delete task ${t.title}`}
                    onClick={() => setDeleting(t.id)}
                  >
                    <Trash2 size={16} />
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
        {!items.length && (
          <div className="product-empty">
            <h3>A little breathing room.</h3>
            <p>
              No tasks match this view. Add a task or enter an upcoming
              assignment in a course.
            </p>
            <Button variant="outline" onClick={() => add()}>
              Add a task
            </Button>
          </div>
        )}
      </section>
      {editor && (
        <EntityEditor
          title={`${profile.tasks.some((t) => t.id === editor.id) ? "Edit" : "Add"} task`}
          description="Plan your work without changing any grade."
          initial={editor}
          schema={TaskSchema}
          fields={[
            { key: "title", label: "Task title", required: true, wide: true },
            {
              key: "courseId",
              label: "Related course",
              type: "select",
              options: [
                { value: "", label: "Personal task" },
                ...profile.state.courses.map((c) => ({
                  value: c.id,
                  label: `${c.name} · ${c.semester}`,
                })),
              ],
              wide: true,
            },
            { key: "date", label: "Due date", type: "date", required: true },
            {
              key: "priority",
              label: "Priority",
              type: "select",
              options: ["low", "normal", "high"].map((v) => ({
                value: v,
                label: v,
              })),
            },
            { key: "notes", label: "Notes", type: "textarea", wide: true },
          ]}
          onClose={() => setEditor(null)}
          onSave={(t) => {
            onUpdate({
              ...profile,
              tasks: profile.tasks.some((x) => x.id === t.id)
                ? profile.tasks.map((x) => (x.id === t.id ? t : x))
                : [...profile.tasks, t],
            });
            setEditor(null);
          }}
        />
      )}
      {deleting && (
        <Confirm
          title="Delete planner task?"
          description="This removes only the task, not any course or grade."
          onClose={() => setDeleting(null)}
          onConfirm={() =>
            onUpdate({
              ...profile,
              tasks: profile.tasks.filter((t) => t.id !== deleting),
            })
          }
        />
      )}
    </div>
  );
}
