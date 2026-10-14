"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  Calculator,
  Check,
  ChevronRight,
  Plus,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  categoryBreakdown,
  courseGrade,
  gpa,
  gradeLetter,
  included,
  requiredScore,
  semesterProgress,
} from "@/lib/calculations";
import type { Assignment, Course } from "@/lib/model";
import { cn, formatGrade } from "@/lib/utils";
import type { ConceptProps } from "./types";
import styles from "./precision.module.css";

function futureWork(courses: Course[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return courses
    .flatMap((course) =>
      course.assignments
        .filter(
          (assignment) =>
            ["future", "ungraded", "missing"].includes(assignment.status) &&
            new Date(`${assignment.due}T23:59:59`).getTime() >= today.getTime(),
        )
        .map((assignment) => ({ ...assignment, course })),
    )
    .sort((a, b) => a.due.localeCompare(b.due));
}

function dateLabel(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function deadlineLabel(date: string) {
  const day = new Date(`${date}T12:00:00`);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (day.toDateString() === today.toDateString()) return "Today";
  if (day.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return day.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function statusLabel(assignment: Assignment) {
  if (assignment.status === "missing") return "Missing";
  if (assignment.status === "ungraded") return "Awaiting score";
  return "Not graded yet";
}

export function PrecisionOverview(props: ConceptProps) {
  const {
    state,
    selectedCourseId,
    onSelectCourse,
    onOpenCourse,
    onWhatIf,
    onNavigate,
    onAddCourse,
    onAddAssignment,
  } = props;
  const courses = state.courses;
  const selected =
    courses.find((course) => course.id === selectedCourseId) ?? courses[0];
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const weighted = gpa(courses, state.policy);
  const unweighted = gpa(courses, state.policy, false);
  const scheduled = futureWork(courses);
  const graded = courses.filter((course) => courseGrade(course) !== null);
  const onTrack = graded.filter(
    (course) => (courseGrade(course) ?? 0) >= course.target,
  );
  const needsFocus = graded
    .filter((course) => (courseGrade(course) ?? 0) < course.target)
    .sort(
      (a, b) =>
        (courseGrade(a) ?? 0) - a.target - ((courseGrade(b) ?? 0) - b.target),
    );
  const progress = semesterProgress(
    state.settings.semesterStart,
    state.settings.semesterEnd,
  );
  const breakdown = selected ? categoryBreakdown(selected) : [];
  const selectedCategory =
    breakdown.find((category) => category.id === selectedCategoryId) ??
    breakdown[0];
  const selectedGrade = selected ? courseGrade(selected) : null;
  const next = selected
    ? scheduled.find((assignment) => assignment.course.id === selected.id)
    : undefined;
  const needed =
    selected && next ? requiredScore(selected, next, selected.target) : null;
  const evidence = selected
    ? selected.assignments
        .filter(
          (assignment) =>
            included(assignment) &&
            assignment.categoryId === selectedCategory?.id,
        )
        .sort((a, b) => b.due.localeCompare(a.due))
    : [];

  return (
    <div className={cn(styles.overview, "precision-dashboard")}>
      <div className={styles.intro}>
        <div>
          <h1 className={styles.pageTitle}>Semester overview</h1>
          <p className={styles.introText}>
            Your courses, targets, and next deadlines.
          </p>
        </div>
        <button
          type="button"
          className={styles.gpaSummary}
          onClick={() => onNavigate("gpa")}
          aria-label="View weighted and unweighted GPA estimates"
        >
          <span className={styles.gpaLabel}>GPA estimate</span>
          <span className={styles.gpaPair}>
            <span>
              <strong>{weighted?.value.toFixed(2) ?? "—"}</strong>
              <small>Weighted</small>
            </span>
            <span className={styles.gpaDivider} aria-hidden="true" />
            <span>
              <strong>{unweighted?.value.toFixed(2) ?? "—"}</strong>
              <small>Unweighted</small>
            </span>
            <ChevronRight size={16} aria-hidden="true" />
          </span>
        </button>
      </div>

      <section
        className={styles.ledger}
        aria-labelledby="precision-courses-heading"
      >
        <div className={styles.ledgerToolbar}>
          <div className={styles.ledgerTitle}>
            <h2 id="precision-courses-heading">Course ledger</h2>
            <span>
              {courses.length} {courses.length === 1 ? "course" : "courses"}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={styles.smallButton}
            onClick={onAddCourse}
          >
            <Plus size={15} aria-hidden="true" /> Add course
          </Button>
        </div>
        {courses.length ? (
          <table className={styles.courseTable}>
            <thead>
              <tr>
                <th scope="col">Course</th>
                <th scope="col" className={styles.gradeHeader}>
                  Current grade
                </th>
                <th scope="col">Target</th>
                <th scope="col">Next deadline</th>
                <th scope="col">
                  <span className={styles.srOnly}>Open course</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => {
                const grade = courseGrade(course);
                const gap = grade === null ? null : grade - course.target;
                const assignment = scheduled.find(
                  (work) => work.course.id === course.id,
                );
                const active = selected?.id === course.id;
                return (
                  <tr
                    key={course.id}
                    className={cn(
                      styles.courseRow,
                      active && styles.selectedRow,
                    )}
                  >
                    <td className={styles.courseCell}>
                      <button
                        type="button"
                        data-testid="course-select"
                        className={styles.courseSelect}
                        onClick={() => {
                          onSelectCourse(course.id);
                          setSelectedCategoryId(null);
                        }}
                        aria-pressed={active}
                        aria-label={`Analyze ${course.name}`}
                      >
                        <span
                          className={cn(
                            styles.selectionMark,
                            active && styles.selectionMarkActive,
                          )}
                          aria-hidden="true"
                        >
                          {active && <Check size={12} />}
                        </span>
                        <span className={styles.courseIdentity}>
                          <strong>{course.name}</strong>
                          <small>
                            {course.teacher || course.semester}
                            <span>
                              {course.credits}{" "}
                              {course.credits === 1 ? "credit" : "credits"}
                            </span>
                          </small>
                        </span>
                      </button>
                    </td>
                    <td className={styles.gradeCell}>
                      <span className={styles.gradeValue}>
                        {formatGrade(grade)}
                        {grade !== null && <small>%</small>}
                      </span>
                      <span className={styles.letter}>
                        {gradeLetter(grade, state.policy)}
                      </span>
                    </td>
                    <td className={styles.targetCell}>
                      <span className={styles.targetValue}>
                        {course.target}%
                      </span>
                      <span
                        className={cn(
                          styles.targetState,
                          gap !== null && gap < 0 && styles.belowTarget,
                        )}
                      >
                        {gap === null ? (
                          "No score yet"
                        ) : gap >= 0 ? (
                          <>
                            <span className={styles.statusDot} /> On target
                          </>
                        ) : (
                          `${Math.abs(gap).toFixed(1)} pts away`
                        )}
                      </span>
                    </td>
                    <td className={styles.deadlineCell}>
                      {assignment ? (
                        <>
                          <strong>{deadlineLabel(assignment.due)}</strong>
                          <span title={assignment.name}>{assignment.name}</span>
                        </>
                      ) : (
                        <span className={styles.noDeadline}>
                          Nothing scheduled
                        </span>
                      )}
                    </td>
                    <td className={styles.openCell}>
                      <button
                        type="button"
                        data-testid="course-open"
                        data-course-id={course.id}
                        data-grade={grade ?? "ungraded"}
                        className={styles.openButton}
                        aria-label={`Open ${course.name}`}
                        onClick={() => onOpenCourse(course)}
                      >
                        <span>Open</span>
                        <ArrowUpRight size={15} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className={styles.emptyState}>
            <h3>Your semester starts here.</h3>
            <p>Add a course to see its grades, target, and next deadline.</p>
            <Button className={styles.primaryButton} onClick={onAddCourse}>
              Add your first course
            </Button>
          </div>
        )}
        {courses.length > 0 && (
          <div className={styles.ledgerFooter} data-testid="concept-goals">
            <span className={styles.targetSummary}>
              <Target size={15} aria-hidden="true" />
              <strong>
                {onTrack.length} of {graded.length}
              </strong>{" "}
              graded courses on target
            </span>
            <div
              className={styles.targetSegments}
              aria-label={`${onTrack.length} of ${graded.length} graded courses meet their targets`}
            >
              {courses.map((course) => (
                <span
                  key={course.id}
                  className={cn(
                    styles.targetSegment,
                    courseGrade(course) !== null &&
                      (courseGrade(course) ?? 0) >= course.target &&
                      styles.targetSegmentMet,
                  )}
                  title={`${course.name}: ${formatGrade(courseGrade(course))}% / ${course.target}% target`}
                />
              ))}
            </div>
            <span className={styles.footerHint}>
              Select a course to inspect the evidence
            </span>
          </div>
        )}
      </section>

      {selected && (
        <div className={styles.detailGrid}>
          <section
            className={styles.evidencePanel}
            data-testid="concept-analytics"
            aria-labelledby="precision-evidence-heading"
          >
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.contextLabel}>Selected course</span>
                <h2 id="precision-evidence-heading">{selected.name}</h2>
              </div>
              <button
                type="button"
                className={styles.textButton}
                onClick={() => onOpenCourse(selected)}
              >
                Course details
                <ArrowUpRight size={15} aria-hidden="true" />
              </button>
            </div>
            <div className={styles.courseReading}>
              <div>
                <strong>
                  {formatGrade(selectedGrade)}
                  <small>{selectedGrade !== null ? "%" : ""}</small>
                </strong>
                <span>Current grade</span>
              </div>
              <div className={styles.courseTarget}>
                <span>
                  Target <strong>{selected.target}%</strong>
                </span>
                <span
                  className={cn(
                    selectedGrade !== null && selectedGrade < selected.target
                      ? styles.belowTarget
                      : styles.onTarget,
                  )}
                >
                  {selectedGrade === null
                    ? "Awaiting a score"
                    : selectedGrade >= selected.target
                      ? `${(selectedGrade - selected.target).toFixed(1)} points above target`
                      : `${(selected.target - selectedGrade).toFixed(1)} points to target`}
                </span>
              </div>
            </div>
            <div className={styles.categoryHeading}>
              <h3>Where the grade comes from</h3>
              <span>
                {selected.mode === "weighted"
                  ? "Category weighted"
                  : "Total points"}
              </span>
            </div>
            <div className={styles.categoryRows}>
              {breakdown.map((category) => {
                const active = selectedCategory?.id === category.id;
                return (
                  <button
                    type="button"
                    key={category.id}
                    className={cn(
                      styles.categoryButton,
                      active && styles.activeCategory,
                    )}
                    aria-pressed={active}
                    onClick={() => setSelectedCategoryId(category.id)}
                    aria-label={`Inspect ${category.name}: ${formatGrade(category.grade)} percent`}
                  >
                    <span className={styles.categoryTop}>
                      <span>
                        <strong>{category.name}</strong>
                        <small>
                          {selected.mode === "weighted"
                            ? `${category.weight}% of grade`
                            : `${category.possible} possible points`}
                        </small>
                      </span>
                      <b>
                        {formatGrade(category.grade)}
                        <small>{category.grade !== null && "%"}</small>
                      </b>
                    </span>
                    <span className={styles.categoryTrack} aria-hidden="true">
                      <span
                        className={styles.categoryFill}
                        style={{
                          width: `${Math.min(100, Math.max(0, category.grade ?? 0))}%`,
                        }}
                      />
                      <i style={{ left: `${selected.target}%` }} />
                    </span>
                  </button>
                );
              })}
            </div>
            <div className={styles.categoryLegend}>
              <span>
                <i /> Course target
              </span>
              <span>
                {selected.assignments.filter(included).length} recorded
                assignments
              </span>
            </div>
            {selectedCategory && (
              <div className={styles.evidenceList}>
                <div className={styles.evidenceTitle}>
                  <span>Recent {selectedCategory.name.toLowerCase()}</span>
                  <span>Points</span>
                </div>
                {evidence.length ? (
                  evidence.slice(0, 3).map((assignment) => (
                    <div key={assignment.id} className={styles.evidenceItem}>
                      <span>
                        {assignment.name}
                        {assignment.status === "missing" && (
                          <small>Missing</small>
                        )}
                      </span>
                      <strong>
                        {assignment.status === "missing"
                          ? 0
                          : assignment.earned}{" "}
                        <span>/ {assignment.possible}</span>
                      </strong>
                    </div>
                  ))
                ) : (
                  <p className={styles.noEvidence}>
                    No graded work in this category yet.
                  </p>
                )}
              </div>
            )}
            <div className={styles.nextScore}>
              <Calculator size={20} aria-hidden="true" />
              <div>
                <strong>
                  {next
                    ? needed === null
                      ? "One score will not reach the target"
                      : `Next score to ${selectedGrade !== null && selectedGrade >= selected.target ? "keep" : "reach"} ${selected.target}%`
                    : "Explore a possible score"}
                </strong>
                <p>
                  {next ? (
                    needed === null ? (
                      `Model ${next.name} and another assignment together.`
                    ) : (
                      <>
                        <b>{needed.toFixed(2)}%</b> on {next.name}
                      </>
                    )
                  ) : (
                    "Add a hypothetical assignment and see the effect."
                  )}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className={styles.outlineButton}
                onClick={() => onWhatIf(selected.id)}
              >
                What-if calculator
              </Button>
            </div>
          </section>

          <aside className={styles.workColumn}>
            <section
              className={styles.upcomingPanel}
              data-testid="concept-upcoming"
              aria-labelledby="precision-upcoming-heading"
            >
              <div className={styles.panelHeader}>
                <div>
                  <h2 id="precision-upcoming-heading">Coming up</h2>
                  <p>
                    {scheduled.length}{" "}
                    {scheduled.length === 1 ? "assignment" : "assignments"}{" "}
                    scheduled
                  </p>
                </div>
                <button
                  type="button"
                  className={styles.textButton}
                  onClick={() => onNavigate("planner")}
                >
                  Planner
                  <ChevronRight size={15} aria-hidden="true" />
                </button>
              </div>
              {scheduled.length ? (
                <div className={styles.deadlineList}>
                  {scheduled.slice(0, 4).map((assignment) => (
                    <button
                      type="button"
                      key={assignment.id}
                      className={styles.deadlineItem}
                      onClick={() => onOpenCourse(assignment.course)}
                      aria-label={`Open ${assignment.name} in ${assignment.course.name}`}
                    >
                      <span className={styles.dateTile}>
                        <small>
                          {new Date(
                            `${assignment.due}T12:00:00`,
                          ).toLocaleDateString("en-US", { month: "short" })}
                        </small>
                        <strong>
                          {new Date(`${assignment.due}T12:00:00`).getDate()}
                        </strong>
                      </span>
                      <span className={styles.deadlineIdentity}>
                        <strong>{assignment.name}</strong>
                        <span>{assignment.course.name}</span>
                        <small>
                          {deadlineLabel(assignment.due)}{" "}
                          <span>{statusLabel(assignment)}</span>
                        </small>
                      </span>
                      <ChevronRight size={15} aria-hidden="true" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className={styles.upcomingEmpty}>
                  <p>No upcoming assignments.</p>
                  <Button
                    variant="outline"
                    className={styles.outlineButton}
                    onClick={() => onAddAssignment(selected)}
                  >
                    Add an assignment
                  </Button>
                </div>
              )}
            </section>
            <section
              className={styles.focusPanel}
              aria-labelledby="precision-focus-heading"
            >
              <div className={styles.focusHeader}>
                <Target size={18} aria-hidden="true" />
                <h2 id="precision-focus-heading">A place to focus</h2>
              </div>
              {needsFocus.length ? (
                needsFocus.slice(0, 2).map((course) => (
                  <div key={course.id} className={styles.focusItem}>
                    <strong>{course.name}</strong>
                    <p>
                      <b>
                        {(course.target - (courseGrade(course) ?? 0)).toFixed(
                          1,
                        )}{" "}
                        points
                      </b>{" "}
                      below your {course.target}% target.
                    </p>
                    <button
                      type="button"
                      className={styles.focusAction}
                      onClick={() => {
                        onSelectCourse(course.id);
                        onWhatIf(course.id);
                      }}
                    >
                      Find the score you need
                      <ChevronRight size={16} aria-hidden="true" />
                    </button>
                  </div>
                ))
              ) : (
                <div className={styles.focusItem}>
                  <strong>
                    {graded.length
                      ? "All recorded grades meet their targets."
                      : "Your targets are ready."}
                  </strong>
                  <p>
                    {graded.length
                      ? "Use a what-if to check how your next assignment could change that."
                      : "Add a score to begin measuring your progress."}
                  </p>
                  <button
                    type="button"
                    className={styles.focusAction}
                    onClick={() => onWhatIf(selected.id)}
                  >
                    Explore a what-if
                    <ChevronRight size={16} aria-hidden="true" />
                  </button>
                </div>
              )}
            </section>
            <div className={styles.semesterStatus}>
              <div>
                <span>Semester progress</span>
                <strong>{progress.toFixed(0)}%</strong>
              </div>
              <div
                className={styles.semesterTrack}
                role="progressbar"
                aria-label="Semester progress"
                aria-valuenow={Math.round(progress)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span style={{ width: `${progress}%` }} />
              </div>
              <p>
                {dateLabel(state.settings.semesterStart)}
                <span>Ends {dateLabel(state.settings.semesterEnd)}</span>
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
