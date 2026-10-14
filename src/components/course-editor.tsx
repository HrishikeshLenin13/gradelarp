"use client";
import { useState } from "react";
import { Plus, Trash2, BookOpen, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { CourseSchema, type Course, type Assignment } from "@/lib/model";
import { courseGrade, categoryBreakdown } from "@/lib/calculations";
import { formatGrade, uid } from "@/lib/utils";
export function newCourse(semester: string): Course {
  return {
    id: uid(),
    name: "",
    teacher: "",
    level: "Regular",
    credits: 0.5,
    semester,
    mode: "weighted",
    target: 90,
    color: "#ada0ed",
    categories: [
      { id: uid(), name: "Major grades", weight: 60 },
      { id: uid(), name: "Daily work", weight: 40 },
    ],
    assignments: [],
  };
}
export function CourseEditor({
  initial,
  onSave,
  onClose,
  onDelete,
}: {
  initial: Course;
  onSave: (course: Course) => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  const [course, setCourse] = useState(initial);
  const [tab, setTab] = useState<"assignments" | "details">("assignments");
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const update = (part: Partial<Course>) => setCourse({ ...course, ...part });
  const patchAssignment = (id: string, part: Partial<Assignment>) =>
    update({
      assignments: course.assignments.map((a) =>
        a.id === id ? { ...a, ...part } : a,
      ),
    });
  function save() {
    const parsed = CourseSchema.safeParse(course);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    onSave(parsed.data);
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="course-dialog">
        <div className="dialog-heading">
          <div
            className="course-icon"
            style={{ color: course.color, background: `${course.color}15` }}
          >
            <BookOpen size={23} />
          </div>
          <div>
            <DialogTitle>{initial.name || "Add a course"}</DialogTitle>
            <DialogDescription>
              Make your gradebook your own. Changes save on this device.
            </DialogDescription>
          </div>
        </div>
        <div className="editor-grade">
          <span>Current calculated grade</span>
          <strong>
            {formatGrade(courseGrade(course))}
            <small>%</small>
          </strong>
        </div>
        <div className="segmented tabs">
          <button
            onClick={() => setTab("assignments")}
            aria-pressed={tab === "assignments"}
          >
            Assignments
          </button>
          <button
            onClick={() => setTab("details")}
            aria-pressed={tab === "details"}
          >
            Course & grading
          </button>
        </div>
        {tab === "details" ? (
          <div className="form-grid">
            <label className="span-2">
              Course name
              <input
                aria-label="Course name"
                value={course.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="e.g. AP Calculus AB"
              />
            </label>
            <label>
              Teacher
              <input
                value={course.teacher}
                onChange={(e) => update({ teacher: e.target.value })}
                placeholder="Optional"
              />
            </label>
            <label>
              Semester
              <input
                value={course.semester}
                onChange={(e) => update({ semester: e.target.value })}
              />
            </label>
            <label>
              Course level
              <select
                value={course.level}
                onChange={(e) =>
                  update({ level: e.target.value as Course["level"] })
                }
              >
                <option>Regular</option>
                <option>Honors</option>
                <option>AP</option>
              </select>
            </label>
            <label>
              Credits
              <input
                aria-label="Course credits"
                type="number"
                min="0.01"
                max="20"
                step="0.5"
                value={course.credits}
                onChange={(e) => update({ credits: Number(e.target.value) })}
              />
            </label>
            <label>
              Grading method
              <select
                aria-label="Grading method"
                value={course.mode}
                onChange={(e) =>
                  update({ mode: e.target.value as Course["mode"] })
                }
              >
                <option value="weighted">Weighted categories</option>
                <option value="points">Total points</option>
              </select>
            </label>
            <label>
              Target grade (%)
              <input
                type="number"
                min="0"
                max="100"
                value={course.target}
                onChange={(e) => update({ target: Number(e.target.value) })}
              />
            </label>
            <label>
              Course color
              <input
                aria-label="Course color"
                type="color"
                value={course.color}
                onChange={(e) => update({ color: e.target.value })}
              />
            </label>
            <div className="span-2">
              <h4>
                Assignment categories{" "}
                <small>
                  {course.mode === "weighted"
                    ? "Weights must total 100%"
                    : "Weights are not used in point-based grading"}
                </small>
              </h4>
              {course.categories.map((cat, i) => (
                <div className="category-edit" key={cat.id}>
                  <input
                    aria-label={`Category ${i + 1} name`}
                    value={cat.name}
                    onChange={(e) =>
                      update({
                        categories: course.categories.map((c) =>
                          c.id === cat.id ? { ...c, name: e.target.value } : c,
                        ),
                      })
                    }
                  />
                  <input
                    aria-label={`Category ${i + 1} weight`}
                    type="number"
                    min="0"
                    max="100"
                    value={cat.weight}
                    onChange={(e) =>
                      update({
                        categories: course.categories.map((c) =>
                          c.id === cat.id
                            ? { ...c, weight: Number(e.target.value) }
                            : c,
                        ),
                      })
                    }
                  />
                  <span>%</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete category ${cat.name}`}
                    disabled={
                      course.categories.length === 1 ||
                      course.assignments.some((a) => a.categoryId === cat.id)
                    }
                    onClick={() =>
                      update({
                        categories: course.categories.filter(
                          (c) => c.id !== cat.id,
                        ),
                      })
                    }
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  update({
                    categories: [
                      ...course.categories,
                      { id: uid(), name: "New category", weight: 0 },
                    ],
                  })
                }
              >
                <Plus size={14} />
                Add category
              </Button>
            </div>
          </div>
        ) : (
          <div className="assignment-editor">
            <div className="breakdown-mini">
              {categoryBreakdown(course).map((cat) => (
                <div key={cat.id}>
                  <span>
                    {cat.name}{" "}
                    <small>
                      {course.mode === "weighted" ? `${cat.weight}%` : ""}
                    </small>
                  </span>
                  <strong>{formatGrade(cat.grade)}%</strong>
                </div>
              ))}
            </div>
            {!course.assignments.length && (
              <div className="empty-state">
                <BookOpen size={30} />
                <h3>A fresh start.</h3>
                <p>Add your first assignment, or set up course details.</p>
                <Button variant="secondary" onClick={() => setTab("details")}>
                  Set up course
                </Button>
              </div>
            )}
            {course.assignments.map((a, i) => (
              <div className="assignment-edit" key={a.id}>
                <div className="assignment-edit-head">
                  <span className="tiny-label">ASSIGNMENT {i + 1}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete assignment ${a.name}`}
                    onClick={() =>
                      update({
                        assignments: course.assignments.filter(
                          (x) => x.id !== a.id,
                        ),
                      })
                    }
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
                <input
                  aria-label={`Assignment ${i + 1} name`}
                  value={a.name}
                  onChange={(e) =>
                    patchAssignment(a.id, { name: e.target.value })
                  }
                />
                <div className="assignment-fields">
                  <label>
                    Category
                    <select
                      value={a.categoryId}
                      onChange={(e) =>
                        patchAssignment(a.id, { categoryId: e.target.value })
                      }
                    >
                      {course.categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Earned
                    <input
                      aria-label={`Assignment ${i + 1} earned`}
                      type="number"
                      min="0"
                      max={a.possible}
                      disabled={a.status !== "graded"}
                      value={a.earned ?? ""}
                      placeholder="—"
                      onChange={(e) =>
                        patchAssignment(a.id, {
                          earned:
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label>
                    Possible
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={a.possible}
                      onChange={(e) =>
                        patchAssignment(a.id, {
                          possible: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label>
                    Status
                    <select
                      aria-label={`Assignment ${i + 1} status`}
                      value={a.status}
                      onChange={(e) =>
                        patchAssignment(a.id, {
                          status: e.target.value as Assignment["status"],
                        })
                      }
                    >
                      {[
                        "graded",
                        "missing",
                        "ungraded",
                        "future",
                        "dropped",
                        "exempt",
                      ].map((s) => (
                        <option key={s} value={s}>
                          {s[0].toUpperCase() + s.slice(1)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Due date
                    <input
                      type="date"
                      value={a.due}
                      onChange={(e) =>
                        patchAssignment(a.id, { due: e.target.value })
                      }
                    />
                  </label>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              className="full-width"
              onClick={() =>
                update({
                  assignments: [
                    ...course.assignments,
                    {
                      id: uid(),
                      name: "New assignment",
                      categoryId: course.categories[0].id,
                      earned: null,
                      possible: 100,
                      status: "ungraded",
                      due: new Date().toISOString().slice(0, 10),
                    },
                  ],
                })
              }
            >
              <Plus size={16} />
              Add assignment
            </Button>
            <p className="helper">
              Missing work counts as zero. Ungraded, future, dropped, and exempt
              work is excluded.
            </p>
          </div>
        )}
        {error && (
          <p role="alert" className="error-message">
            {error}
          </p>
        )}
        <div className="dialog-footer">
          {confirmDelete ? (
            <>
              <span className="error-message">Delete this course?</span>
              <Button variant="destructive" size="sm" onClick={onDelete}>
                Confirm deletion
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(false)}
              >
                Keep course
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                className="delete-course"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 size={15} />
                Delete course
              </Button>
              <div className="flex">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={save}>
                  <Save size={15} />
                  Save course
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
