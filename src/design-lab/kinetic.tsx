"use client";

import type { CSSProperties } from "react";
import {
  ArrowUpRight,
  Calculator,
  ChevronDown,
  Plus,
  Target,
} from "lucide-react";
import { upcoming } from "@/components/widgets";
import {
  averageGrade,
  categoryBreakdown,
  courseGrade,
  gpa,
  gradeLetter,
  requiredScore,
  scenarioCourse,
  semesterProgress,
} from "@/lib/calculations";
import { cn, formatGrade } from "@/lib/utils";
import type { ConceptProps } from "./types";
import styles from "./kinetic.module.css";

const axisMarks = [70, 80, 90, 100];
const position = (score: number) =>
  Math.max(0, Math.min(100, ((score - 70) / 30) * 100));
const precise = (score: number) =>
  score
    .toFixed(2)
    .replace(/\.00$/, "")
    .replace(/(\.\d)0$/, "$1");
const shortDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
const weekday = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
  });

export function KineticOverview({
  state,
  motionEnabled = true,
  selectedCourseId,
  onSelectCourse,
  onOpenCourse,
  onWhatIf,
  onNavigate,
  onAddCourse,
  onAddAssignment,
}: ConceptProps) {
  const { courses, policy, settings } = state;
  const allowMotion = motionEnabled && settings.motion !== "none";
  const selected =
    courses.find((course) => course.id === selectedCourseId) ?? courses[0];
  const grades = courses.map((course) => ({
    course,
    grade: courseGrade(course),
  }));
  const focus = grades
    .filter((item) => item.grade !== null && item.grade < item.course.target)
    .sort(
      (a, b) =>
        b.course.target - (b.grade ?? 0) - (a.course.target - (a.grade ?? 0)),
    );
  const graded = grades.filter((item) => item.grade !== null);
  const atTarget = graded.filter(
    (item) => (item.grade ?? 0) >= item.course.target,
  ).length;
  const deadlines = upcoming(courses);
  const average = averageGrade(courses);
  const weighted = gpa(courses, policy, true);
  const unweighted = gpa(courses, policy, false);
  const progress = semesterProgress(
    settings.semesterStart,
    settings.semesterEnd,
  );
  const semester = [...new Set(courses.map((course) => course.semester))];
  const selectedGrade = selected ? courseGrade(selected) : null;
  const categories = selected ? categoryBreakdown(selected) : [];
  const nextAssignment = selected
    ? deadlines.find((assignment) => assignment.course.id === selected.id)
    : undefined;
  const needed =
    selected && nextAssignment
      ? requiredScore(selected, nextAssignment, selected.target)
      : null;
  const maxNextGrade =
    selected && nextAssignment
      ? courseGrade(scenarioCourse(selected, nextAssignment, 100))
      : null;

  if (!selected) {
    return (
      <section
        className={cn(styles.dashboard, "kinetic-dashboard")}
        data-motion={allowMotion ? "enabled" : "none"}
      >
        <div className={styles.empty}>
          <h1>Give your semester a starting point.</h1>
          <p>Add a course to map its grade, target, and next assignment.</p>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={onAddCourse}
          >
            <Plus size={16} aria-hidden="true" /> Add a course
          </button>
        </div>
      </section>
    );
  }

  return (
    <div
      className={cn(styles.dashboard, "kinetic-dashboard")}
      data-motion={allowMotion ? "enabled" : "none"}
    >
      <header className={styles.intro}>
        <div>
          <h1>
            {graded.length
              ? `${atTarget} of ${graded.length} ${graded.length === 1 ? "course" : "courses"} at target.`
              : "Your first grade sets the position."}
          </h1>
          <p>
            {focus.length
              ? `${focus[0].course.name} is ${(focus[0].course.target - (focus[0].grade ?? 0)).toFixed(1)} percentage points below target. `
              : ""}
            Choose a course to plan the score its next assignment needs.
          </p>
        </div>
        <button
          type="button"
          className={styles.outlineButton}
          onClick={() => onWhatIf(selected.id)}
        >
          <Calculator size={17} aria-hidden="true" /> Try a score
        </button>
      </header>

      <section className={styles.semesterStrip} aria-label="Semester summary">
        <div className={styles.semesterProgress}>
          <span>{semester.length === 1 ? semester[0] : "Current courses"}</span>
          <span
            className={styles.progressTrack}
            role="progressbar"
            aria-label="Semester elapsed"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
          >
            <i style={{ width: `${progress}%` }} />
          </span>
          <span>{Math.round(progress)}% elapsed</span>
        </div>
        <div className={styles.summaryItem}>
          <span>Average</span>
          <strong>
            {formatGrade(average)}
            {average !== null && "%"}
          </strong>
        </div>
        <div className={styles.summaryItem}>
          <span>At target</span>
          <strong>
            {atTarget} / {courses.length}
          </strong>
        </div>
        <button
          type="button"
          className={styles.gpaSummary}
          onClick={() => onNavigate("gpa")}
          aria-label="View weighted and unweighted GPA estimates"
        >
          <span>GPA estimates</span>
          <strong>
            {weighted?.value.toFixed(2) ?? "—"}
            <small> weighted</small>
          </strong>
          <strong>
            {unweighted?.value.toFixed(2) ?? "—"}
            <small> unweighted</small>
          </strong>
        </button>
      </section>

      <a
        className={styles.mobileWorkbenchJump}
        href="#kinetic-workbench-title"
        aria-label={`View the course workbench for ${selected.name}`}
      >
        <span>
          <strong>{selected.name}</strong>
          <small>
            Current {formatGrade(selectedGrade)}
            {selectedGrade !== null && "%"} · Target {precise(selected.target)}%
          </small>
        </span>
        <span>
          <strong>
            {nextAssignment && needed !== null ? `${precise(needed)}%` : "View"}
          </strong>
          <small>
            {nextAssignment && needed !== null
              ? "Next score needed"
              : "Course workbench"}
          </small>
        </span>
        <ChevronDown size={16} aria-hidden="true" />
      </a>

      <div className={styles.workspace}>
        <section
          className={styles.map}
          data-testid="concept-goals"
          aria-labelledby="kinetic-map-title"
        >
          <header className={styles.sectionHeading}>
            <div>
              <h2 id="kinetic-map-title">Course position</h2>
              <p>Every course has its own target.</p>
            </div>
            <div className={styles.legend} aria-hidden="true">
              <span>
                <i className={styles.legendCurrent} /> Current
              </span>
              <span>
                <i className={styles.legendTarget} /> Target
              </span>
            </div>
          </header>
          <div className={styles.axis} aria-hidden="true">
            <span className={styles.axisLabel}>Course</span>
            <div>
              {axisMarks.map((score) => (
                <span key={score} style={{ left: `${position(score)}%` }}>
                  {score}%
                </span>
              ))}
            </div>
          </div>
          <div className={styles.courseRows}>
            {grades.map(({ course, grade }) => {
              const isSelected = selected.id === course.id;
              const below = grade !== null && grade < course.target;
              const currentPosition = grade === null ? 0 : position(grade);
              const targetPosition = position(course.target);
              const laneStyle = {
                "--grade-position": `${currentPosition}%`,
                "--target-position": `${targetPosition}%`,
                "--gap-start": `${Math.min(currentPosition, targetPosition)}%`,
                "--gap-width": `${Math.abs(currentPosition - targetPosition)}%`,
              } as CSSProperties;
              return (
                <div
                  key={course.id}
                  className={cn(
                    styles.courseRow,
                    isSelected && styles.selectedRow,
                  )}
                >
                  <button
                    type="button"
                    className={styles.courseSelect}
                    data-testid="course-select"
                    aria-pressed={isSelected}
                    aria-label={`Select ${course.name}, current grade ${grade === null ? "not yet graded" : `${formatGrade(grade)} percent`}, target ${course.target} percent${below ? ", below target" : ""}`}
                    onClick={() => onSelectCourse(course.id)}
                  >
                    <span className={styles.courseLabel}>
                      <strong>{course.name}</strong>
                      <small>
                        {course.level}
                        {below ? " · Below target" : ""}
                      </small>
                    </span>
                    <span
                      className={styles.scoreLane}
                      style={laneStyle}
                      aria-hidden="true"
                    >
                      {axisMarks.map((score) => (
                        <i
                          className={styles.gridLine}
                          key={score}
                          style={{ left: `${position(score)}%` }}
                        />
                      ))}
                      {grade !== null && (
                        <i
                          className={cn(
                            styles.gapLine,
                            below && styles.gapBelow,
                          )}
                        />
                      )}
                      <i className={styles.targetMarker} />
                      <span
                        className={cn(
                          styles.gradeMarker,
                          grade !== null && grade >= 95 && styles.rightMarker,
                          grade !== null && grade <= 73 && styles.leftMarker,
                          below && styles.belowMarker,
                        )}
                      >
                        <strong>
                          {formatGrade(grade)}
                          {grade !== null && "%"}
                        </strong>
                        <i />
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className={styles.courseOpen}
                    data-testid="course-open"
                    aria-label={`Open ${course.name}, current grade ${grade === null ? "not yet graded" : `${formatGrade(grade)} percent`}`}
                    title={`Open ${course.name}`}
                    onClick={() => onOpenCourse(course)}
                  >
                    <ArrowUpRight size={17} aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
          <p className={styles.mapFootnote}>
            Select a row to work on that course. Scores below 70% sit at the
            left edge; exact scores always appear.
          </p>
          <div className={styles.focusStrip}>
            <Target size={17} aria-hidden="true" />
            <div>
              <strong>
                {focus.length
                  ? `${focus.length} ${focus.length === 1 ? "course needs" : "courses need"} a next move`
                  : "Your graded courses meet their targets"}
              </strong>
              {focus.length ? (
                <div className={styles.focusCourses}>
                  {focus.map(({ course, grade }) => (
                    <button
                      type="button"
                      key={course.id}
                      onClick={() => onSelectCourse(course.id)}
                    >
                      {course.name}
                      <span>
                        +{(course.target - (grade ?? 0)).toFixed(1)} points to
                        target
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p>
                  {courses.length - graded.length > 0
                    ? "Add grades to see where the remaining courses stand."
                    : "Choose a course to plan its next assignment."}
                </p>
              )}
            </div>
          </div>
        </section>

        <section
          className={styles.workbench}
          data-testid="concept-analytics"
          aria-labelledby="kinetic-workbench-title"
        >
          <div className={styles.workbenchHeading}>
            <h2 id="kinetic-workbench-title">Course workbench</h2>
            <span className={styles.selectedBadge}>Selected</span>
          </div>
          <div className={styles.selectedCourse}>
            <h3>{selected.name}</h3>
            <p>
              {selected.teacher || selected.level}{" "}
              <span>
                {selected.credits}{" "}
                {selected.credits === 1 ? "credit" : "credits"}
              </span>
            </p>
          </div>
          <div className={styles.gradeComparison}>
            <div>
              <span>Current</span>
              <strong>
                {formatGrade(selectedGrade)}
                <small>{selectedGrade !== null ? "%" : ""}</small>
                <em>{gradeLetter(selectedGrade, policy)}</em>
              </strong>
            </div>
            <div>
              <span>Your target</span>
              <strong>
                {precise(selected.target)}
                <small>%</small>
              </strong>
            </div>
          </div>
          <p
            className={cn(
              styles.targetStatus,
              selectedGrade !== null &&
                selectedGrade < selected.target &&
                styles.needsFocus,
            )}
          >
            {selectedGrade === null
              ? "Add a grade to see your position."
              : selectedGrade < selected.target
                ? `${(selected.target - selectedGrade).toFixed(1)} percentage points to reach your target.`
                : `${(selectedGrade - selected.target).toFixed(1)} percentage points above your target.`}
          </p>
          <div className={styles.categorySection}>
            <div className={styles.categoryHeading}>
              <h4>What builds this grade</h4>
              <span>
                {selected.mode === "weighted"
                  ? "Weighted categories"
                  : "Total points"}
              </span>
            </div>
            <table className={styles.categoryTable}>
              <caption className={styles.srOnly}>
                Grade breakdown for {selected.name}
              </caption>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>{selected.mode === "weighted" ? "Weight" : "Points"}</th>
                  <th>Grade</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id}>
                    <th scope="row">
                      <span>{category.name}</span>
                      <span className={styles.categoryTrack} aria-hidden="true">
                        <i
                          style={{
                            width: `${Math.min(100, category.grade ?? 0)}%`,
                          }}
                        />
                      </span>
                    </th>
                    <td>
                      {selected.mode === "weighted"
                        ? `${category.weight}%`
                        : `${precise(category.earned)} / ${precise(category.possible)}`}
                    </td>
                    <td>
                      {formatGrade(category.grade)}
                      {category.grade !== null && "%"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.nextScore}>
            <div className={styles.nextScoreHeading}>
              <h4>The next score to aim for</h4>
              {nextAssignment && (
                <time dateTime={nextAssignment.due}>
                  {shortDate(nextAssignment.due)}
                </time>
              )}
            </div>
            {nextAssignment ? (
              <>
                <p className={styles.assignmentName}>{nextAssignment.name}</p>
                {needed !== null ? (
                  <div className={styles.neededScore}>
                    <strong>
                      {precise(needed)}
                      <small>%</small>
                    </strong>
                    <p>
                      Minimum needed{" "}
                      {selectedGrade !== null &&
                      selectedGrade >= selected.target
                        ? "to keep"
                        : "to reach"}{" "}
                      {precise(selected.target)}% overall.
                      <span>
                        {precise(
                          Math.ceil(nextAssignment.possible * needed - 1e-8) /
                            100,
                        )}{" "}
                        of {precise(nextAssignment.possible)} points
                      </span>
                    </p>
                  </div>
                ) : (
                  <p className={styles.notEnough}>
                    This assignment alone will not reach{" "}
                    {precise(selected.target)}%. A 100% score would bring the
                    course to {formatGrade(maxNextGrade)}%.
                  </p>
                )}
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => onWhatIf(selected.id)}
                  aria-label={`Calculate a score for ${selected.name}`}
                >
                  <Calculator size={16} aria-hidden="true" /> Calculate a score
                </button>
              </>
            ) : (
              <>
                <p className={styles.notEnough}>
                  No upcoming work is scheduled for this course.
                </p>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => onAddAssignment(selected)}
                >
                  <Plus size={16} aria-hidden="true" /> Add an assignment
                </button>
              </>
            )}
          </div>
          <button
            type="button"
            className={styles.workbenchLink}
            onClick={() => onOpenCourse(selected)}
          >
            Open course details <ArrowUpRight size={15} aria-hidden="true" />
          </button>
        </section>
      </div>

      <section
        className={styles.runway}
        data-testid="concept-upcoming"
        aria-labelledby="kinetic-runway-title"
      >
        <header className={styles.sectionHeading}>
          <div>
            <h2 id="kinetic-runway-title">Deadline runway</h2>
            <p>
              {deadlines.length
                ? `${deadlines.length} upcoming ${deadlines.length === 1 ? "assignment" : "assignments"}, in due-date order.`
                : "Your next assignments will appear here."}
            </p>
          </div>
          <button
            type="button"
            className={styles.textButton}
            onClick={() => onNavigate("planner")}
          >
            Open planner <ArrowUpRight size={15} aria-hidden="true" />
          </button>
        </header>
        {deadlines.length ? (
          <ol className={styles.deadlines}>
            {deadlines.slice(0, 6).map((assignment) => (
              <li
                key={`${assignment.course.id}-${assignment.id}`}
                className={cn(
                  styles.deadline,
                  assignment.course.id === selected.id &&
                    styles.selectedDeadline,
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    onSelectCourse(assignment.course.id);
                    onOpenCourse(assignment.course);
                  }}
                  aria-label={`Open ${assignment.name}, ${assignment.course.name}, due ${shortDate(assignment.due)}`}
                >
                  <span className={styles.deadlineDate}>
                    <time dateTime={assignment.due}>
                      {shortDate(assignment.due)}
                    </time>
                    <span>{weekday(assignment.due)}</span>
                  </span>
                  <span className={styles.deadlineRail} aria-hidden="true">
                    <i />
                  </span>
                  <strong>{assignment.course.name}</strong>
                  <span className={styles.deadlineAssignment}>
                    {assignment.name}
                  </span>
                  <span className={styles.deadlinePoints}>
                    {precise(assignment.possible)} points{" "}
                    <ArrowUpRight size={13} aria-hidden="true" />
                  </span>
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <div className={styles.runwayEmpty}>
            <p>Add upcoming work to see your due dates together.</p>
            <button
              type="button"
              className={styles.outlineButton}
              onClick={() => onAddAssignment(selected)}
            >
              <Plus size={16} aria-hidden="true" /> Add an assignment
            </button>
          </div>
        )}
        {deadlines.length > 6 && (
          <p className={styles.moreDeadlines}>
            {deadlines.length - 6} more assignments in the planner.
          </p>
        )}
      </section>
    </div>
  );
}
