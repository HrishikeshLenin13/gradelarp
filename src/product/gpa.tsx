"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PolicyEditor } from "@/components/panels";
import { gpa, courseGrade, gradeLetter } from "@/lib/calculations";
import { formatGrade } from "@/lib/utils";
import { cumulativeTotals, maximumPoints, requiredFutureGpa } from "./engine";
import type { Profile } from "./model";
export function GpaPlanner({
  profile,
  semester,
  onUpdate,
}: {
  profile: Profile;
  semester: string;
  onUpdate: (p: Profile) => void;
}) {
  const [editing, setEditing] = useState(false),
    [scope, setScope] = useState(semester);
  const { state, gpaPlan } = profile;
  const all = state.courses,
    courses = scope === "all" ? all : all.filter((c) => c.semester === scope);
  const weighted = gpa(courses, state.policy),
    unweighted = gpa(courses, state.policy, false),
    total = cumulativeTotals(all, state.policy, profile.records);
  const projected = all.map((c) =>
    gpaPlan.projectedGrades[c.id] === undefined
      ? c
      : {
          ...c,
          mode: "points" as const,
          categories: [
            { id: "projection", name: "Projected final", weight: 100 },
          ],
          assignments: [
            {
              id: "projection",
              name: "Projected final",
              categoryId: "projection",
              earned: gpaPlan.projectedGrades[c.id],
              possible: 100,
              status: "graded" as const,
              due: "2000-01-01",
            },
          ],
        },
  );
  const forecast = cumulativeTotals(projected, state.policy, profile.records),
    max = maximumPoints(state.policy, gpaPlan.futureLevel);
  let required: ReturnType<typeof requiredFutureGpa> | null = null;
  try {
    required = requiredFutureGpa(
      total.qualityPoints,
      total.credits,
      gpaPlan.target,
      gpaPlan.futureCredits,
      max,
    );
  } catch {}
  function plan(part: Partial<Profile["gpaPlan"]>) {
    onUpdate({ ...profile, gpaPlan: { ...gpaPlan, ...part } });
  }
  return (
    <div className="product-stack">
      <div className="inline-notice">
        <span>
          Custom policy estimate—not an official transcript GPA. LISD and RRISD
          policies are not configured or claimed as verified.
        </span>
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          Edit grading policy
        </Button>
      </div>
      <div className="product-toolbar">
        <label className="product-course-picker">
          GPA period
          <select
            aria-label="GPA period"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
          >
            <option value="all">All entered semesters</option>
            {[...new Set([semester, ...all.map((c) => c.semester)])].map(
              (s) => (
                <option key={s}>{s}</option>
              ),
            )}
          </select>
        </label>
        <span className="pill">{state.policy.name}</span>
      </div>
      <div className="product-kpis">
        {[
          ["Weighted GPA", weighted?.value, "Selected period"],
          ["Unweighted GPA", unweighted?.value, "Selected period, no bonuses"],
          [
            "Cumulative GPA",
            total.value,
            `${total.credits} credits, all semesters + records + prior`,
          ],
          [
            "Projected GPA",
            forecast.value,
            "All semesters, projected finals + prior",
          ],
        ].map(([label, value, note]) => (
          <div className="panel" key={String(label)}>
            <span>{label}</span>
            <strong
              data-testid={
                label === "Cumulative GPA"
                  ? "cumulative-gpa"
                  : label === "Projected GPA"
                    ? "projected-gpa"
                    : undefined
              }
            >
              {typeof value === "number" ? value.toFixed(2) : "—"}
            </strong>
            <p>{note}</p>
          </div>
        ))}
      </div>
      <section className="panel">
        <div className="panel-title">
          <div>
            <p className="product-eyebrow">Plan the finish</p>
            <h3>Your courses, credit by credit.</h3>
          </div>
          <Button variant="ghost" onClick={() => plan({ projectedGrades: {} })}>
            Reset projections
          </Button>
        </div>
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="GPA course projections"
        >
          <table>
            <thead>
              <tr>
                <th>Course / semester</th>
                <th>Level</th>
                <th>Actual grade</th>
                <th>Credits</th>
                <th>Weighted points</th>
                <th>Projected final %</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.name}</strong>
                    <small className="product-cell-note">{c.semester}</small>
                  </td>
                  <td>{c.level}</td>
                  <td>
                    {formatGrade(courseGrade(c))}% ·{" "}
                    {gradeLetter(courseGrade(c), state.policy)}
                  </td>
                  <td>{c.credits}</td>
                  <td>{gpa([c], state.policy)?.value.toFixed(2) ?? "—"}</td>
                  <td>
                    <input
                      aria-label={`Projected final ${c.name}`}
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      placeholder="Use actual"
                      value={gpaPlan.projectedGrades[c.id] ?? ""}
                      onChange={(e) => {
                        const projectedGrades = { ...gpaPlan.projectedGrades };
                        if (e.target.value === "") delete projectedGrades[c.id];
                        else projectedGrades[c.id] = Number(e.target.value);
                        plan({ projectedGrades });
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!courses.length && (
          <p className="product-empty-note">No courses in this period yet.</p>
        )}
        <p className="helper">
          Projected finals never edit actual assignments. A blank final uses the
          current calculated grade; a grade-free course is excluded unless you
          supply a projection.
        </p>
      </section>
      <div className="two-column">
        <section className="panel">
          <p className="product-eyebrow">A goal with a plan</p>
          <h3>What GPA comes next?</h3>
          <div className="form-grid">
            <label>
              Goal cumulative GPA
              <input
                type="number"
                min="0"
                max="15"
                step="0.01"
                value={gpaPlan.target}
                onChange={(e) => plan({ target: Number(e.target.value) })}
              />
            </label>
            <label>
              Future credits
              <input
                type="number"
                min="0.01"
                max="1000"
                step="0.5"
                value={gpaPlan.futureCredits}
                onChange={(e) =>
                  plan({ futureCredits: Number(e.target.value) })
                }
              />
            </label>
            <label className="span-2">
              Future course level
              <select
                aria-label="Future course level"
                value={gpaPlan.futureLevel}
                onChange={(e) =>
                  plan({
                    futureLevel: e.target
                      .value as Profile["gpaPlan"]["futureLevel"],
                  })
                }
              >
                <option>Regular</option>
                <option>Honors</option>
                <option>AP</option>
              </select>
            </label>
          </div>
          <div className="product-required" data-testid="future-gpa">
            {required ? (
              <>
                <strong>{required.value.toFixed(2)}</strong>
                <span>
                  {required.alreadySecured
                    ? "Goal secured even with zero future quality points."
                    : required.possible
                      ? "Average weighted GPA required on the future credits."
                      : `Not attainable at this course level (maximum ${max.toFixed(2)}).`}
                </span>
              </>
            ) : (
              "Enter positive future credits."
            )}
          </div>
          <p className="helper">
            Required GPA = [goal × (current + future credits) − current quality
            points] ÷ future credits. Uses actual cumulative grades, not your
            hypothetical projections.
          </p>
        </section>
        <section className="panel">
          <p className="product-eyebrow">Know what counts</p>
          <h3>No mystery math.</h3>
          <div className="product-math-list">
            {[...state.policy.scale]
              .sort((a, b) => b.min - a.min)
              .map((s) => (
                <div key={s.min}>
                  <span>
                    {s.letter} · {s.min}% and above
                  </span>
                  <strong>{s.points.toFixed(2)} points</strong>
                </div>
              ))}
          </div>
          <p className="helper">
            AP +{state.policy.apBonus}; Honors +{state.policy.honorsBonus};
            bonuses apply at {state.policy.bonusMinimum}% and above. No rounding
            before scale lookup. GPA = Σ(points × credits) ÷ Σcredits.
          </p>
          <p className="helper">
            Cumulative includes every entered semester, {profile.records.length}{" "}
            manually entered transcript records, and {state.policy.priorCredits}{" "}
            prior credits at {state.policy.priorGpa.toFixed(2)} weighted GPA. Do
            not enter the same course in both a gradebook and a transcript
            record, or include it again in prior credits.
          </p>
        </section>
      </div>
      {editing && (
        <PolicyEditor
          initial={state.policy}
          onClose={() => setEditing(false)}
          onSave={(policy) => {
            onUpdate({ ...profile, state: { ...state, policy } });
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}
