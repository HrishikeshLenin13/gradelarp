"use client";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatGrade, uid } from "@/lib/utils";
import { download } from "@/lib/import-export";
import { courseGrade } from "@/lib/calculations";
import { profileCourseCatalog } from "./source-records";
import { bellStatus } from "./engine";
import {
  ScheduleSchema,
  AttendanceSchema,
  TranscriptSchema,
  ContactSchema,
  GoalSchema,
  localDate,
  type Profile,
  type Schedule,
  type Attendance,
  type TranscriptRecord,
  type Contact,
  type Goal,
} from "./model";
import { EntityEditor, Confirm, type Field } from "./forms";
const tabs = [
  { id: "schedule", name: "Schedule" },
  { id: "attendance", name: "Attendance" },
  { id: "records", name: "Report cards" },
  { id: "teachers", name: "Teachers" },
  { id: "goals", name: "Goals" },
] as const;
type Tab = (typeof tabs)[number]["id"];
export function Academics({
  profile,
  semester,
  onUpdate,
}: {
  profile: Profile;
  semester: string;
  onUpdate: (p: Profile) => void;
}) {
  const [tab, setTab] = useState<Tab>("schedule");
  return (
    <div className="product-stack">
      {profile.hacLive && (
        <p className="hac-notice">
          HAC supplies your course names and available teacher names here.
          Schedule, attendance, transcript and goal entries are personal records
          you enter; they are not automatically imported from the school.
        </p>
      )}
      <div className="product-tabs" role="group" aria-label="Academic tools">
        {tabs.map((t) => (
          <button
            key={t.id}
            aria-pressed={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.name}
          </button>
        ))}
      </div>
      {tab === "schedule" ? (
        <SchedulePanel
          profile={profile}
          semester={semester}
          onUpdate={onUpdate}
        />
      ) : tab === "attendance" ? (
        <AttendancePanel profile={profile} onUpdate={onUpdate} />
      ) : tab === "records" ? (
        <RecordsPanel profile={profile} onUpdate={onUpdate} />
      ) : tab === "teachers" ? (
        <TeachersPanel profile={profile} onUpdate={onUpdate} />
      ) : (
        <GoalsPanel profile={profile} onUpdate={onUpdate} />
      )}
    </div>
  );
}
type Props = { profile: Profile; onUpdate: (p: Profile) => void };
function coursesField(profile: Profile, optional = false): Field {
  return {
    key: "courseId",
    label: "Course",
    type: "select",
    required: !optional,
    options: [
      ...(optional
        ? [{ value: "", label: "Other / break" }]
        : [{ value: "", label: "Choose a course" }]),
      ...profileCourseCatalog(profile).map((c) => ({
        value: c.id,
        label: `${c.name} · ${c.semester}`,
      })),
    ],
    wide: true,
  };
}
function Actions({
  name,
  onEdit,
  onDelete,
}: {
  name: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex">
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Edit ${name}`}
        onClick={onEdit}
      >
        <Pencil size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Delete ${name}`}
        onClick={onDelete}
      >
        <Trash2 size={16} />
      </Button>
    </div>
  );
}
function SchedulePanel({
  profile,
  semester,
  onUpdate,
}: Props & { semester: string }) {
  const [now, setNow] = useState(() => new Date()),
    [editing, setEditing] = useState<Schedule | null>(null),
    [deleting, setDeleting] = useState<string | null>(null);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const bell = bellStatus(profile.schedules, semester, now),
    days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
  const entries = profile.schedules.filter((s) => s.semester === semester);
  const schema = ScheduleSchema.refine(
    (s) =>
      !profile.schedules.some(
        (x) =>
          x.id !== s.id &&
          x.semester === s.semester &&
          x.day === s.day &&
          x.start < s.end &&
          x.end > s.start,
      ),
    "This block overlaps another class in the same semester.",
  );
  return (
    <>
      <div className="product-bell">
        <div>
          <p className="product-eyebrow">{semester} · device local time</p>
          <h2>
            {bell
              ? bell.kind === "current"
                ? `${bell.block.title} is in session.`
                : `Up next: ${bell.block.title}`
              : "No more scheduled classes today."}
          </h2>
          <p>
            {bell
              ? `${bell.block.start}–${bell.block.end}${bell.block.room ? ` · ${bell.block.room}` : ""}`
              : "Add your recurring weekly classes to start a bell countdown."}
          </p>
        </div>
        <div className="product-countdown" aria-label="Bell countdown">
          <strong>
            {bell
              ? `${Math.floor(bell.seconds / 3600)
                  .toString()
                  .padStart(2, "0")}:${Math.floor((bell.seconds % 3600) / 60)
                  .toString()
                  .padStart(
                    2,
                    "0",
                  )}:${(bell.seconds % 60).toString().padStart(2, "0")}`
              : "—"}
          </strong>
          <span>
            {bell?.kind === "current" ? "until the bell" : "until class starts"}
          </span>
        </div>
      </div>
      <section className="panel">
        <div className="panel-title">
          <h3>Your weekly rhythm</h3>
          <Button
            onClick={() =>
              setEditing({
                id: uid(),
                title: "",
                courseId: "",
                semester,
                day: 1,
                start: "08:30",
                end: "09:20",
                room: "",
              })
            }
          >
            <Plus size={16} />
            Add class block
          </Button>
        </div>
        <p className="helper">
          Manual recurring schedule for the selected semester. Holidays and
          special bell days are not inferred.
        </p>
        {entries.length ? (
          <div className="product-schedule-grid">
            {[1, 2, 3, 4, 5, 6, 0].map((day) => (
              <section key={day}>
                <h4>{days[day]}</h4>
                {entries
                  .filter((s) => s.day === day)
                  .sort((a, b) => a.start.localeCompare(b.start))
                  .map((s) => (
                    <article key={s.id}>
                      <span>
                        {s.start}–{s.end}
                      </span>
                      <strong>{s.title}</strong>
                      <small>{s.room || "No room entered"}</small>
                      <Actions
                        name={s.title}
                        onEdit={() => setEditing(s)}
                        onDelete={() => setDeleting(s.id)}
                      />
                    </article>
                  ))}
              </section>
            ))}
          </div>
        ) : (
          <p className="product-empty-note">
            No class schedule entered for {semester}.
          </p>
        )}
      </section>
      {editing && (
        <EntityEditor
          title="Class block"
          description="Times repeat every week in the selected semester."
          initial={editing}
          schema={schema}
          fields={[
            { key: "title", label: "Block name", required: true, wide: true },
            coursesField(profile, true),
            { key: "semester", label: "Semester", required: true },
            {
              key: "day",
              label: "Weekday",
              type: "select",
              options: days.map((d, i) => ({ value: String(i), label: d })),
            },
            { key: "start", label: "Start time", type: "time", required: true },
            { key: "end", label: "End time", type: "time", required: true },
            { key: "room", label: "Room", wide: true },
          ]}
          onClose={() => setEditing(null)}
          onSave={(s) => {
            onUpdate({
              ...profile,
              schedules: profile.schedules.some((x) => x.id === s.id)
                ? profile.schedules.map((x) => (x.id === s.id ? s : x))
                : [...profile.schedules, s],
            });
            setEditing(null);
          }}
        />
      )}
      {deleting && (
        <Confirm
          title="Delete class block?"
          description="Only this recurring schedule block will be removed."
          onClose={() => setDeleting(null)}
          onConfirm={() =>
            onUpdate({
              ...profile,
              schedules: profile.schedules.filter((x) => x.id !== deleting),
            })
          }
        />
      )}
    </>
  );
}
function AttendancePanel({ profile, onUpdate }: Props) {
  const [editing, setEditing] = useState<Attendance | null>(null),
    [deleting, setDeleting] = useState<string | null>(null),
    [course, setCourse] = useState("all");
  const rows = profile.attendance
    .filter((a) => course === "all" || a.courseId === course)
    .sort((a, b) => b.date.localeCompare(a.date));
  const schema = AttendanceSchema.refine(
    (a) =>
      !profile.attendance.some(
        (x) => x.id !== a.id && x.courseId === a.courseId && x.date === a.date,
      ),
    "An entry already exists for this course on this date. Edit that entry instead.",
  );
  return (
    <>
      <div className="product-kpis">
        {["present", "absent", "tardy", "excused"].map((s) => (
          <div className="panel" key={s}>
            <span>{s[0].toUpperCase() + s.slice(1)}</span>
            <strong>{rows.filter((a) => a.status === s).length}</strong>
            <p>Manually recorded class sessions</p>
          </div>
        ))}
      </div>
      <section className="panel">
        <div className="panel-title">
          <h3>Attendance, accounted for.</h3>
          <Button
            disabled={!profileCourseCatalog(profile).length}
            onClick={() =>
              setEditing({
                id: uid(),
                date: localDate(),
                courseId: profileCourseCatalog(profile)[0]?.id ?? "",
                status: "present",
                note: "",
              })
            }
          >
            <Plus size={16} />
            Record attendance
          </Button>
        </div>
        <label className="product-course-picker">
          Filter attendance course
          <select
            aria-label="Filter attendance course"
            value={course}
            onChange={(e) => setCourse(e.target.value)}
          >
            <option value="all">All courses</option>
            {profileCourseCatalog(profile).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <p className="helper">
          Only explicitly recorded sessions are counted. No absences or
          attendance percentages are inferred from missing dates.
        </p>
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Attendance entries"
        >
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Course</th>
                <th>Status</th>
                <th>Note</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td>{a.date}</td>
                  <td>
                    {profileCourseCatalog(profile).find(
                      (c) => c.id === a.courseId,
                    )?.name ?? "Archived course"}
                  </td>
                  <td>{a.status}</td>
                  <td>{a.note || "—"}</td>
                  <td>
                    <Actions
                      name={`attendance ${a.date}`}
                      onEdit={() => setEditing(a)}
                      onDelete={() => setDeleting(a.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <p className="product-empty-note">
            No attendance records yet. Add a course first if your gradebook is
            empty.
          </p>
        )}
      </section>
      {editing && (
        <EntityEditor
          title="Attendance"
          description="Record one entry per course and date."
          initial={editing}
          schema={schema}
          fields={[
            coursesField(profile),
            {
              key: "date",
              label: "Attendance date",
              type: "date",
              required: true,
            },
            {
              key: "status",
              label: "Attendance status",
              type: "select",
              options: ["present", "absent", "tardy", "excused"].map((s) => ({
                value: s,
                label: s,
              })),
            },
            {
              key: "note",
              label: "Attendance note",
              type: "textarea",
              wide: true,
            },
          ]}
          onClose={() => setEditing(null)}
          onSave={(a) => {
            onUpdate({
              ...profile,
              attendance: profile.attendance.some((x) => x.id === a.id)
                ? profile.attendance.map((x) => (x.id === a.id ? a : x))
                : [...profile.attendance, a],
            });
            setEditing(null);
          }}
        />
      )}
      {deleting && (
        <Confirm
          title="Delete attendance entry?"
          description="This only removes the selected manual attendance record."
          onClose={() => setDeleting(null)}
          onConfirm={() =>
            onUpdate({
              ...profile,
              attendance: profile.attendance.filter((x) => x.id !== deleting),
            })
          }
        />
      )}
    </>
  );
}
function RecordsPanel({ profile, onUpdate }: Props) {
  const [editing, setEditing] = useState<TranscriptRecord | null>(null),
    [deleting, setDeleting] = useState<string | null>(null);
  const records = profile.records;
  const semesters = [
    ...new Set([
      ...profile.state.courses.map((c) => c.semester),
      ...records.map((r) => r.semester),
    ]),
  ];
  function exportRecords() {
    const rows = [
      ["source", "course", "semester", "level", "credits", "grade"],
      ...profile.state.courses.map((c) => [
        "current calculated",
        c.name,
        c.semester,
        c.level,
        c.credits,
        courseGrade(c) ?? "",
      ]),
      ...records.map((r) => [
        "manual final",
        r.course,
        r.semester,
        r.level,
        r.credits,
        r.grade,
      ]),
    ];
    download(
      "gradelarp-transcript.csv",
      rows
        .map((r) =>
          r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","),
        )
        .join("\r\n"),
      "text/csv",
    );
  }
  return (
    <>
      <div className="inline-notice">
        Personal report cards and transcript records, not official school
        documents. Enter only prior courses that are not already in your
        gradebook or prior-credit GPA totals.
      </div>
      <section className="panel product-report">
        <div className="panel-title">
          <div>
            <p className="product-eyebrow">
              {profile.name} · Personal academic record
            </p>
            <h3>Your work, across semesters.</h3>
          </div>
          <div className="flex no-print">
            <Button variant="outline" onClick={exportRecords}>
              <Download size={16} />
              Export transcript
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer size={16} />
              Print report card
            </Button>
          </div>
        </div>
        {semesters.map((s) => (
          <section className="product-record-semester" key={s}>
            <h4>{s}</h4>
            <div
              className="table-scroll"
              tabIndex={0}
              role="region"
              aria-label={`Report card ${s}`}
            >
              <table>
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Level</th>
                    <th>Credits</th>
                    <th>Grade</th>
                    <th>Source</th>
                    <th className="no-print">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.state.courses
                    .filter((c) => c.semester === s)
                    .map((c) => (
                      <tr key={c.id}>
                        <td>{c.name}</td>
                        <td>{c.level}</td>
                        <td>{c.credits}</td>
                        <td>{formatGrade(courseGrade(c))}%</td>
                        <td>Current calculated</td>
                        <td>Gradebook</td>
                      </tr>
                    ))}
                  {records
                    .filter((r) => r.semester === s)
                    .map((r) => (
                      <tr key={r.id}>
                        <td>
                          {r.course}
                          {r.note && (
                            <small className="product-cell-note">
                              {r.note}
                            </small>
                          )}
                        </td>
                        <td>{r.level}</td>
                        <td>{r.credits}</td>
                        <td>{r.grade}%</td>
                        <td>Manual final</td>
                        <td className="no-print">
                          <Actions
                            name={r.course}
                            onEdit={() => setEditing(r)}
                            onDelete={() => setDeleting(r.id)}
                          />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
        {!semesters.length && (
          <p className="product-empty-note">
            Add courses or enter a prior-semester final below.
          </p>
        )}
        <Button
          className="no-print"
          onClick={() =>
            setEditing({
              id: uid(),
              course: "",
              semester: "",
              level: "Regular",
              credits: 0.5,
              grade: 90,
              note: "",
            })
          }
        >
          <Plus size={16} />
          Add transcript record
        </Button>
      </section>
      {editing && (
        <EntityEditor
          title="Transcript record"
          description="A manually entered final from a prior course. Avoid duplicate gradebook or prior-credit entries."
          initial={editing}
          schema={TranscriptSchema}
          fields={[
            {
              key: "course",
              label: "Transcript course",
              required: true,
              wide: true,
            },
            { key: "semester", label: "Transcript semester", required: true },
            {
              key: "level",
              label: "Transcript level",
              type: "select",
              options: ["Regular", "Honors", "AP"].map((s) => ({
                value: s,
                label: s,
              })),
            },
            {
              key: "credits",
              label: "Transcript credits",
              type: "number",
              min: 0.01,
              max: 20,
            },
            {
              key: "grade",
              label: "Final grade percent",
              type: "number",
              min: 0,
              max: 100,
            },
            { key: "note", label: "Record note", type: "textarea", wide: true },
          ]}
          onClose={() => setEditing(null)}
          onSave={(r) => {
            onUpdate({
              ...profile,
              records: records.some((x) => x.id === r.id)
                ? records.map((x) => (x.id === r.id ? r : x))
                : [...records, r],
            });
            setEditing(null);
          }}
        />
      )}
      {deleting && (
        <Confirm
          title="Delete transcript record?"
          description="This removes this manual final and its contribution to your cumulative GPA."
          onClose={() => setDeleting(null)}
          onConfirm={() =>
            onUpdate({
              ...profile,
              records: records.filter((x) => x.id !== deleting),
            })
          }
        />
      )}
    </>
  );
}
function TeachersPanel({ profile, onUpdate }: Props) {
  const [editing, setEditing] = useState<Contact | null>(null),
    [deleting, setDeleting] = useState<string | null>(null);
  return (
    <>
      <div className="product-toolbar">
        <p className="helper">
          Teacher names from your courses appear automatically; contact details
          are entered by you.
        </p>
        <Button
          disabled={!profileCourseCatalog(profile).length}
          onClick={() =>
            setEditing({
              id: uid(),
              courseId: profileCourseCatalog(profile)[0]?.id ?? "",
              name: "",
              email: "",
              room: "",
              hours: "",
              note: "",
            })
          }
        >
          <Plus size={16} />
          Add teacher contact
        </Button>
      </div>
      <div className="product-contact-grid">
        {profileCourseCatalog(profile).map((c) => {
          const contacts = profile.contacts.filter((x) => x.courseId === c.id);
          return (
            <section className="panel" key={c.id}>
              <p className="product-eyebrow">
                {c.name} · {c.semester}
              </p>
              <h3>{c.teacher || "Teacher not entered"}</h3>
              {contacts.map((t) => (
                <div className="product-contact" key={t.id}>
                  <strong>{t.name}</strong>
                  {t.email && <a href={`mailto:${t.email}`}>{t.email}</a>}
                  <p>{t.room ? `Room: ${t.room}` : "Room not entered"}</p>
                  <p>
                    {t.hours
                      ? `Office hours: ${t.hours}`
                      : "Office hours not entered"}
                  </p>
                  {t.note && <p>{t.note}</p>}
                  <Actions
                    name={t.name}
                    onEdit={() => setEditing(t)}
                    onDelete={() => setDeleting(t.id)}
                  />
                </div>
              ))}
              {!contacts.length && (
                <Button
                  variant="outline"
                  onClick={() =>
                    setEditing({
                      id: uid(),
                      courseId: c.id,
                      name: c.teacher,
                      email: "",
                      room: "",
                      hours: "",
                      note: "",
                    })
                  }
                >
                  Add contact details
                </Button>
              )}
            </section>
          );
        })}
      </div>
      {!profileCourseCatalog(profile).length && (
        <div className="panel product-empty">
          <h3>Your people, in one place.</h3>
          <p>Add a course to start your teacher directory.</p>
        </div>
      )}
      {editing && (
        <EntityEditor
          title="Teacher contact"
          description="Contact information is stored only on this device. Email opens your mail app."
          initial={editing}
          schema={ContactSchema}
          fields={[
            coursesField(profile),
            { key: "name", label: "Teacher name", required: true },
            { key: "email", label: "Teacher email", type: "email" },
            { key: "room", label: "Teacher room" },
            { key: "hours", label: "Office hours" },
            {
              key: "note",
              label: "Teacher notes",
              type: "textarea",
              wide: true,
            },
          ]}
          onClose={() => setEditing(null)}
          onSave={(t) => {
            onUpdate({
              ...profile,
              contacts: profile.contacts.some((x) => x.id === t.id)
                ? profile.contacts.map((x) => (x.id === t.id ? t : x))
                : [...profile.contacts, t],
            });
            setEditing(null);
          }}
        />
      )}
      {deleting && (
        <Confirm
          title="Delete teacher contact?"
          description="The course teacher name stays in your gradebook."
          onClose={() => setDeleting(null)}
          onConfirm={() =>
            onUpdate({
              ...profile,
              contacts: profile.contacts.filter((x) => x.id !== deleting),
            })
          }
        />
      )}
    </>
  );
}
function GoalsPanel({ profile, onUpdate }: Props) {
  const [editing, setEditing] = useState<Goal | null>(null),
    [deleting, setDeleting] = useState<string | null>(null);
  return (
    <>
      <section className="panel">
        <div className="panel-title">
          <h3>Small commitments. Real progress.</h3>
          <Button
            onClick={() =>
              setEditing({
                id: uid(),
                title: "",
                date: localDate(),
                done: false,
                note: "",
              })
            }
          >
            <Plus size={16} />
            Add goal
          </Button>
        </div>
        <div className="product-agenda">
          {profile.goals.map((g) => (
            <article key={g.id} data-done={g.done}>
              <input
                aria-label={`Complete goal ${g.title}`}
                type="checkbox"
                checked={g.done}
                onChange={() =>
                  onUpdate({
                    ...profile,
                    goals: profile.goals.map((x) =>
                      x.id === g.id ? { ...x, done: !x.done } : x,
                    ),
                  })
                }
              />
              <div className="product-agenda-title">
                <strong>{g.title}</strong>
                <span>By {g.date}</span>
                <small>{g.note}</small>
              </div>
              <Actions
                name={g.title}
                onEdit={() => setEditing(g)}
                onDelete={() => setDeleting(g.id)}
              />
            </article>
          ))}
        </div>
        {!profile.goals.length && (
          <p className="product-empty-note">
            No personal goals yet. Start with one action you can take this week.
          </p>
        )}
      </section>
      <section className="panel">
        <h3>Course targets</h3>
        <p className="helper">
          Targets come from your course settings and update as real grades
          change.
        </p>
        <div className="product-math-list">
          {profile.state.courses.map((c) => (
            <div key={c.id}>
              <span>
                {c.name}
                <small>
                  {c.semester} · Target {c.target}%
                </small>
              </span>
              <strong>
                {formatGrade(courseGrade(c))}% ·{" "}
                {courseGrade(c) === null
                  ? "No grade"
                  : (courseGrade(c) ?? 0) >= c.target
                    ? "On target"
                    : "Below target"}
              </strong>
            </div>
          ))}
        </div>
      </section>
      {editing && (
        <EntityEditor
          title="Academic goal"
          description="A personal commitment, separate from calculated course targets."
          initial={editing}
          schema={GoalSchema}
          fields={[
            { key: "title", label: "Goal title", required: true, wide: true },
            { key: "date", label: "Goal date", type: "date", required: true },
            { key: "note", label: "Goal plan", type: "textarea", wide: true },
          ]}
          onClose={() => setEditing(null)}
          onSave={(g) => {
            onUpdate({
              ...profile,
              goals: profile.goals.some((x) => x.id === g.id)
                ? profile.goals.map((x) => (x.id === g.id ? g : x))
                : [...profile.goals, g],
            });
            setEditing(null);
          }}
        />
      )}
      {deleting && (
        <Confirm
          title="Delete academic goal?"
          description="Only this personal goal will be removed."
          onClose={() => setDeleting(null)}
          onConfirm={() =>
            onUpdate({
              ...profile,
              goals: profile.goals.filter((x) => x.id !== deleting),
            })
          }
        />
      )}
    </>
  );
}
