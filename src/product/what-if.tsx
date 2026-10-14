"use client";
import { useState } from "react";
import { Plus, RotateCcw, Save, Trash2, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { courseGrade, requiredScore } from "@/lib/calculations";
import type { Course, Assignment } from "@/lib/model";
import { formatGrade, uid } from "@/lib/utils";
import {
  applyScenario,
  calculationExplanation,
  courseFingerprint,
} from "./engine";
import { localDate, type Scenario } from "./model";

export function WhatIf({
  courses,
  selectedId,
  onSelect,
  scenarios,
  onSave,
  onDelete,
}: {
  courses: Course[];
  selectedId: string;
  onSelect: (id: string) => void;
  scenarios: Scenario[];
  onSave: (s: Scenario) => void;
  onDelete: (id: string) => void;
}) {
  const course = courses.find((c) => c.id === selectedId) ?? courses[0];
  if (!course)
    return (
      <section className="panel product-empty">
        <h2>A little possibility starts with a course.</h2>
        <p>Add your first course before running a simulation.</p>
      </section>
    );
  return (
    <>
      <label className="product-course-picker">
        Simulate course
        <select
          aria-label="Simulate course"
          value={course.id}
          onChange={(e) => onSelect(e.target.value)}
        >
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {c.semester}
            </option>
          ))}
        </select>
      </label>
      <ScenarioEditor
        key={course.id}
        course={course}
        scenarios={scenarios.filter((s) => s.courseId === course.id)}
        onSave={onSave}
        onDelete={onDelete}
      />
    </>
  );
}
function ScenarioEditor({
  course,
  scenarios,
  onSave,
  onDelete,
}: {
  course: Course;
  scenarios: Scenario[];
  onSave: (s: Scenario) => void;
  onDelete: (id: string) => void;
}) {
  const [changes, setChanges] = useState<Scenario["changes"]>([]),
    [additions, setAdditions] = useState<Assignment[]>([]),
    [name, setName] = useState(""),
    [loadedId, setLoadedId] = useState(""),
    [notice, setNotice] = useState("");
  const [target, setTarget] = useState(course.target),
    [solveId, setSolveId] = useState(
      course.assignments.find(
        (a) => a.status === "future" || a.status === "ungraded",
      )?.id ??
        course.assignments[0]?.id ??
        "",
    );
  const draft = { courseId: course.id, changes, additions };
  let projection: Course | null = null,
    error = "";
  try {
    projection = applyScenario(course, draft);
  } catch (e) {
    error = e instanceof Error ? e.message : "Check scenario inputs.";
  }
  const real = courseGrade(course),
    predicted = projection ? courseGrade(projection) : null;
  const explanation = projection ? calculationExplanation(projection) : null;
  const solveAssignment = projection?.assignments.find((a) => a.id === solveId);
  const needed =
    projection &&
    solveAssignment &&
    Number.isFinite(target) &&
    target >= 0 &&
    target <= 100
      ? requiredScore(projection, solveAssignment, target)
      : null;
  function patch(
    a: Assignment,
    part: Partial<Pick<Assignment, "earned" | "status">>,
  ) {
    if (additions.some((x) => x.id === a.id)) {
      setAdditions(
        additions.map((x) => (x.id === a.id ? { ...x, ...part } : x)),
      );
      return;
    }
    const existing = changes.find((x) => x.assignmentId === a.id);
    setChanges([
      ...changes.filter((x) => x.assignmentId !== a.id),
      {
        assignmentId: a.id,
        earned: existing ? existing.earned : a.earned,
        status: existing?.status ?? a.status,
        ...part,
      },
    ]);
  }
  function reset() {
    setChanges([]);
    setAdditions([]);
    setName("");
    setLoadedId("");
    setNotice("Simulation reset. Actual grades are unchanged.");
  }
  const rows = [...course.assignments, ...additions];
  const editingId = scenarios.some((s) => s.id === loadedId) ? loadedId : "";
  return (
    <div className="product-stack">
      <div className="product-scenario-hero">
        <div>
          <p className="product-eyebrow">
            A different outcome. The same real grade.
          </p>
          <h2>What happens if…</h2>
          <p>
            Change several scores, add future work, and see the combined effect.
          </p>
        </div>
        <div className="product-projection">
          <div>
            <span>Actual grade</span>
            <strong data-testid="actual-grade">
              {formatGrade(real)}
              <small>%</small>
            </strong>
          </div>
          <ArrowUpRight aria-hidden="true" />
          <div>
            <span>Projected grade</span>
            <strong data-testid="projected-grade">
              {formatGrade(predicted)}
              <small>%</small>
            </strong>
          </div>
        </div>
      </div>
      <div className="product-toolbar">
        <span className="pill">
          {changes.length + additions.length} hypothetical changes · no real
          grades edited
        </span>
        <Button variant="outline" onClick={reset}>
          <RotateCcw size={15} />
          Reset simulation
        </Button>
      </div>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="helper">
          {notice}
        </p>
      )}
      <section className="panel">
        <div className="panel-title">
          <div>
            <h3>Your scenario gradebook</h3>
            <p className="helper">
              Scores are points earned, not percentages. Missing counts as zero;
              excluded statuses do not count.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              const a: Assignment = {
                id: uid(),
                name: "Hypothetical assignment",
                categoryId: course.categories[0].id,
                earned: 90,
                possible: 100,
                status: "graded",
                due: localDate(),
              };
              setAdditions([...additions, a]);
              setSolveId(a.id);
            }}
          >
            <Plus size={16} />
            Add hypothetical assignment
          </Button>
        </div>
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Hypothetical assignment scores"
        >
          <table className="product-scenario-table">
            <thead>
              <tr>
                <th>Assignment</th>
                <th>Category</th>
                <th>Earned</th>
                <th>Possible</th>
                <th>Status</th>
                <th>Changes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a, i) => {
                const change = changes.find((x) => x.assignmentId === a.id);
                const value = {
                  ...a,
                  ...(change
                    ? { earned: change.earned, status: change.status }
                    : {}),
                };
                const added = additions.some((x) => x.id === a.id);
                return (
                  <tr key={a.id} data-changed={!!change || added}>
                    <td>
                      {added ? (
                        <input
                          aria-label={`Hypothetical ${i + 1} name`}
                          value={a.name}
                          onChange={(e) =>
                            setAdditions(
                              additions.map((x) =>
                                x.id === a.id
                                  ? { ...x, name: e.target.value }
                                  : x,
                              ),
                            )
                          }
                        />
                      ) : (
                        <>
                          <strong>{a.name}</strong>
                          <small className="product-cell-note">
                            Actual:{" "}
                            {a.status === "graded"
                              ? `${a.earned}/${a.possible}`
                              : a.status}
                          </small>
                        </>
                      )}
                    </td>
                    <td>
                      {added ? (
                        <select
                          aria-label={`Hypothetical ${i + 1} category`}
                          value={a.categoryId}
                          onChange={(e) =>
                            setAdditions(
                              additions.map((x) =>
                                x.id === a.id
                                  ? { ...x, categoryId: e.target.value }
                                  : x,
                              ),
                            )
                          }
                        >
                          {course.categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        course.categories.find((c) => c.id === a.categoryId)
                          ?.name
                      )}
                    </td>
                    <td>
                      <input
                        aria-label={`Scenario ${i + 1} earned`}
                        type="number"
                        min="0"
                        max={a.possible}
                        step="any"
                        value={value.earned ?? ""}
                        onChange={(e) =>
                          patch(a, {
                            earned:
                              e.target.value === ""
                                ? null
                                : Number(e.target.value),
                            status:
                              e.target.value === "" ? "ungraded" : "graded",
                          })
                        }
                      />
                    </td>
                    <td>
                      {added ? (
                        <input
                          aria-label={`Hypothetical ${i + 1} possible`}
                          type="number"
                          min="0.01"
                          step="any"
                          value={a.possible}
                          onChange={(e) =>
                            setAdditions(
                              additions.map((x) =>
                                x.id === a.id
                                  ? { ...x, possible: Number(e.target.value) }
                                  : x,
                              ),
                            )
                          }
                        />
                      ) : (
                        a.possible
                      )}
                    </td>
                    <td>
                      <select
                        aria-label={`Scenario ${i + 1} status`}
                        value={value.status}
                        onChange={(e) =>
                          patch(a, {
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
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {added ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove hypothetical ${i + 1}`}
                          onClick={() =>
                            setAdditions(additions.filter((x) => x.id !== a.id))
                          }
                        >
                          <Trash2 size={16} />
                        </Button>
                      ) : change ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setChanges(
                              changes.filter((x) => x.assignmentId !== a.id),
                            )
                          }
                        >
                          Undo
                        </Button>
                      ) : (
                        <span className="helper">Unchanged</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <div className="two-column">
        <section className="panel">
          <p className="product-eyebrow">Work backward from your goal</p>
          <h3>What score do you need?</h3>
          <div className="form-stack">
            <label>
              Upcoming or existing assignment
              <select
                aria-label="Solve assignment"
                value={solveId}
                onChange={(e) => setSolveId(e.target.value)}
              >
                <option value="">Choose assignment</option>
                {rows.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Target course grade
              <input
                aria-label="Target course grade"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
              />
            </label>
          </div>
          <div className="product-required" data-testid="required-score">
            {!solveAssignment ? (
              "Choose an assignment to solve."
            ) : target < 0 || target > 100 ? (
              "Target must be between 0 and 100%."
            ) : needed === null ? (
              "Not with this assignment alone."
            ) : (
              <>
                <strong>{needed.toFixed(2)}%</strong>
                <span>Minimum score with your other hypothetical changes.</span>
              </>
            )}
          </div>
          <p className="helper">
            The solver replaces the selected assignment score and holds all
            other scenario changes fixed. A result over 100% is unattainable
            under this gradebook’s rules.
          </p>
        </section>
        <section className="panel">
          <p className="product-eyebrow">Transparent by design</p>
          <h3>Behind the number</h3>
          <p className="helper">
            {course.mode === "weighted"
              ? "Category earned ÷ possible × normalized category weight. Empty categories are excluded and populated weights are normalized."
              : "Total included points earned ÷ total included possible points × 100."}
          </p>
          {explanation && (
            <div className="product-math-list">
              {explanation.rows.map((r) => (
                <div key={r.id}>
                  <span>
                    {r.name}
                    <small>
                      {r.earned} / {r.possible} points
                      {course.mode === "weighted"
                        ? ` · ${r.effectiveWeight.toFixed(1)}% effective weight`
                        : ""}
                    </small>
                  </span>
                  <strong>{formatGrade(r.grade)}%</strong>
                </div>
              ))}
            </div>
          )}
          <p className="helper">
            No rounding before calculation. Missing work contributes zero.
            Future, ungraded, dropped, and exempt work is excluded. Extra credit
            above possible points is not supported.
          </p>
        </section>
      </div>
      <section className="panel">
        <div className="panel-title">
          <h3>Keep a possibility.</h3>
          <span className="pill">Saved locally</span>
        </div>
        <div className="product-inline-form">
          <label>
            Scenario name
            <input
              maxLength={160}
              value={name}
              placeholder="e.g. Strong finish"
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <Button
            disabled={!projection || !name.trim()}
            onClick={() => {
              const id = editingId || uid();
              onSave({
                id,
                name: name.trim(),
                courseId: course.id,
                changes,
                additions,
                createdAt: new Date().toISOString(),
                baseFingerprint: courseFingerprint(course),
              });
              setLoadedId(id);
              setNotice("Scenario saved. Actual grades are unchanged.");
            }}
          >
            <Save size={16} />
            {editingId ? "Update scenario" : "Save scenario"}
          </Button>
        </div>
        {scenarios.length ? (
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Saved scenario comparison"
          >
            <table>
              <thead>
                <tr>
                  <th>Scenario</th>
                  <th>Changes</th>
                  <th>Projection now</th>
                  <th>Difference</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((s) => {
                  let result: number | null = null,
                    problem = "";
                  try {
                    result = courseGrade(applyScenario(course, s));
                  } catch {
                    problem = "Needs revision";
                  }
                  return (
                    <tr key={s.id}>
                      <td>
                        <strong>{s.name}</strong>
                        {s.baseFingerprint !== courseFingerprint(course) && (
                          <small className="product-cell-note">
                            Real data changed; recalculated against current
                            grades.
                          </small>
                        )}
                      </td>
                      <td>{s.changes.length + s.additions.length}</td>
                      <td>{problem || `${formatGrade(result)}%`}</td>
                      <td>
                        {result !== null && real !== null
                          ? `${result >= real ? "+" : ""}${(result - real).toFixed(2)} pts`
                          : "—"}
                      </td>
                      <td>
                        <div className="flex">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setChanges(s.changes);
                              setAdditions(s.additions);
                              setLoadedId(s.id);
                              setName(s.name);
                              setNotice(
                                "Saved scenario loaded. Actual grades remain unchanged.",
                              );
                            }}
                          >
                            Load
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Delete scenario ${s.name}`}
                            onClick={() => {
                              onDelete(s.id);
                            }}
                          >
                            <Trash2 size={15} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="product-empty-note">
            Save two or more scenarios to compare their outcomes here.
          </p>
        )}
      </section>
    </div>
  );
}
