"use client";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  ChevronRight,
  Check,
  Target,
} from "lucide-react";
import {
  assignmentChanges,
  averageGrade,
  categoryBreakdown,
  courseGrade,
  gpa,
  gradeLetter,
  requiredScore,
} from "@/lib/calculations";
import { upcoming } from "@/components/widgets";
import { formatGrade, cn } from "@/lib/utils";
import type { ConceptProps } from "@/design-lab/types";
import type { Widget } from "@/lib/model";
import { DashboardWidgets, GradeDistribution } from "./dashboard-widgets";
import styles from "@/design-lab/expressive.module.css";
export function ExpressiveDashboard({
  state,
  selectedCourseId,
  onSelectCourse,
  onOpenCourse,
  onWhatIf,
  onNavigate,
  onAddCourse,
  onAddAssignment,
  onAppearance,
  motionEnabled = true,
  onReorder,
}: ConceptProps & { onReorder: (order: Widget[]) => void }) {
  const reduced = useReducedMotion();
  const courses = state.courses;
  const selected = courses.find((c) => c.id === selectedCourseId) ?? courses[0];
  const weighted = gpa(courses, state.policy),
    unweighted = gpa(courses, state.policy, false),
    avg = averageGrade(courses);
  const attention = courses.filter((c) => (courseGrade(c) ?? 100) < c.target);
  const upcomingWork = upcoming(courses);
  const next = upcomingWork.find((a) => a.course.id === selected?.id);
  const grade = selected ? courseGrade(selected) : null;
  const needed =
    selected && next ? requiredScore(selected, next, selected.target) : null;
  const categories = selected ? categoryBreakdown(selected) : [];
  const changes = assignmentChanges(state.snapshots, courses).slice(0, 3);
  if (!selected)
    return (
      <section className={styles.empty}>
        <h1>A workspace for your semester.</h1>
        <p>Add your first course and assignment. The rest begins here.</p>
        <button onClick={onAddCourse}>Add course</button>
      </section>
    );
  return (
    <div className={styles.dashboard}>
      <header className={styles.intro}>
        <div>
          <p>{selected.semester} / Semester overview</p>
          <h1>
            {courses.every((c) => courseGrade(c) === null)
              ? "A fresh start for your semester."
              : attention.length
                ? `${attention.length} ${attention.length === 1 ? "course needs" : "courses need"} your attention.`
                : "Your courses are on target."}
          </h1>
        </div>
        <button className={styles.gpa} onClick={() => onNavigate("gpa")}>
          <span>
            Weighted GPA <small>Local estimate</small>
          </span>
          <strong>{weighted?.value.toFixed(2) ?? "—"}</strong>
          <ArrowUpRight size={20} />
        </button>
      </header>
      {upcomingWork[0] && (
        <button
          className={styles.mobileDeadline}
          onClick={() => onNavigate("planner")}
        >
          <span>
            Next deadline ·{" "}
            {new Date(upcomingWork[0].due + "T12:00:00").toLocaleDateString(
              undefined,
              { month: "short", day: "numeric" },
            )}
          </span>
          <strong>{upcomingWork[0].name}</strong>
          <small>
            {upcomingWork[0].course.name} <ArrowUpRight size={15} />
          </small>
        </button>
      )}
      <div className={styles.heroGrid}>
        <motion.section
          className={styles.focus}
          key={selected.id}
          initial={reduced || !motionEnabled ? false : { opacity: 0.75 }}
          animate={{ opacity: 1 }}
          transition={{ duration: motionEnabled ? 0.16 : 0 }}
          data-testid="concept-goals"
        >
          <div className={styles.focusTop}>
            <span className={styles.subjectTag}>
              {selected.level} / {selected.credits} credits
            </span>
            <button
              className={styles.iconButton}
              data-testid="course-open"
              aria-label={`Open ${selected.name}`}
              onClick={() => onOpenCourse(selected)}
            >
              <ArrowUpRight size={22} />
            </button>
          </div>
          <h2>{selected.name}</h2>
          <p className={styles.teacher}>
            {selected.teacher}{" "}
            <span>
              {selected.mode === "weighted"
                ? "Weighted categories"
                : "Total points"}
            </span>
          </p>
          <div className={styles.focusNumbers}>
            <div>
              <span>Current grade</span>
              <strong>
                {formatGrade(grade)}
                <small>%</small>
              </strong>
            </div>
            <div>
              <span>Your target</span>
              <strong>
                {selected.target}
                <small>%</small>
              </strong>
            </div>
            <span className={styles.letter}>
              {gradeLetter(grade, state.policy)}
            </span>
          </div>
          <div
            className={styles.goalTrack}
            role="img"
            aria-label={`Current grade ${formatGrade(grade)}%; target ${selected.target}%`}
          >
            <i style={{ transform: `scaleX(${(grade ?? 0) / 100})` }} />
            <span style={{ left: `${Math.min(97, selected.target)}%` }} />
          </div>
          <div className={styles.goalCaption}>
            <span>0%</span>
            <b>
              {grade !== null && grade >= selected.target
                ? "Target reached"
                : `${formatGrade(grade !== null ? selected.target - grade : null)} points to target`}
            </b>
            <span>100%</span>
          </div>
          <div className={styles.focusActions}>
            <button
              className={styles.primary}
              onClick={() => onWhatIf(selected.id)}
            >
              Explore a what-if
              <ArrowRight size={17} />
            </button>
            <button
              className={styles.textButton}
              onClick={() => onOpenCourse(selected)}
            >
              Course details
              <ChevronRight size={15} />
            </button>
          </div>
        </motion.section>
        <section className={styles.nextScore}>
          <div className={styles.sectionLabel}>
            <Target size={16} />
            Your next move
          </div>
          <h3>{next ? next.name : "No upcoming work added"}</h3>
          <p>
            {next
              ? `Due ${new Date(next.due + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })} · ${next.possible} points`
              : "Add your next assignment to see what score reaches your target."}
          </p>
          <div className={styles.required}>
            <span>
              {needed !== null
                ? "Score needed to reach your target"
                : "Plan a new scenario"}
            </span>
            <strong>
              {needed !== null ? needed.toFixed(2) : "—"}
              <small>{needed !== null ? "%" : ""}</small>
            </strong>
          </div>
          <p className={styles.mathNote}>
            {needed !== null
              ? `A ${needed.toFixed(2)}% score on this assignment brings ${selected.name.toLowerCase()} to at least ${selected.target}%.`
              : "Your required score comes from actual category weights and entered assignment data."}
          </p>
          <button
            className={styles.outline}
            onClick={() =>
              next ? onWhatIf(selected.id) : onAddAssignment(selected)
            }
          >
            {next ? "Adjust the scenario" : "Add an assignment"}
            <ArrowUpRight size={16} />
          </button>
          <div className={styles.secondaryMetrics}>
            <div>
              <span>Unweighted GPA</span>
              <b>{unweighted?.value.toFixed(2) ?? "—"}</b>
            </div>
            <div>
              <span>Course average</span>
              <b>{formatGrade(avg)}%</b>
            </div>
          </div>
        </section>
      </div>
      <DashboardWidgets
        settings={state.settings}
        onReorder={onReorder}
        items={{
          courses: (
            <section className={styles.subjects} data-testid="concept-courses">
              <div className={styles.sectionHeading}>
                <h2>Your courses</h2>
                <button onClick={onAddCourse}>
                  <Plus size={16} />
                  Add course
                </button>
              </div>
              <div className={styles.subjectGrid}>
                {courses.map((c) => (
                  <button
                    key={c.id}
                    data-testid="course-select"
                    className={cn(
                      styles.subject,
                      c.id === selected.id && styles.selectedSubject,
                    )}
                    onClick={() => onSelectCourse(c.id)}
                    aria-pressed={c.id === selected.id}
                    style={
                      { "--subject-color": c.color } as React.CSSProperties
                    }
                  >
                    <span className={styles.subjectLine} />
                    <strong>{c.name}</strong>
                    <div>
                      <b>
                        {formatGrade(courseGrade(c))}
                        <small>%</small>
                      </b>
                      <span>
                        {(courseGrade(c) ?? -1) >= c.target ? (
                          <Check size={15} />
                        ) : (
                          <Target size={15} />
                        )}
                      </span>
                    </div>
                    <p>
                      {(courseGrade(c) ?? -1) >= c.target
                        ? "On target"
                        : `Target ${c.target}%`}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          ),
          distribution: (
            <GradeDistribution
              courses={courses}
              policy={state.policy}
              onNavigate={() => onNavigate("trends")}
            />
          ),
          activity: (
            <section
              className={styles.categorySection}
              data-testid="concept-analytics"
            >
              <div className={styles.sectionHeading}>
                <h2>
                  Inside{" "}
                  {selected.name.replace("Honors ", "").replace("AP ", "")}
                </h2>
                <button onClick={() => onOpenCourse(selected)}>
                  View assignments
                  <ArrowUpRight size={15} />
                </button>
              </div>
              <p className={styles.detailIntro}>
                The categories behind your grade. Open the gradebook to inspect
                assignments.
              </p>
              <div className={styles.categories}>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => onOpenCourse(selected)}
                    aria-label={`${c.name}: ${formatGrade(c.grade)} percent. View assignments.`}
                  >
                    <div>
                      <span>{c.name}</span>
                      <small>
                        {selected.mode === "weighted"
                          ? `${c.weight}% of your grade`
                          : `${c.possible} possible points`}
                      </small>
                    </div>
                    <strong>{formatGrade(c.grade)}%</strong>
                    <div className={styles.categoryTrack}>
                      <i
                        style={{ transform: `scaleX(${(c.grade ?? 0) / 100})` }}
                      />
                    </div>
                  </button>
                ))}
              </div>
              <div className={styles.recent}>
                {changes.length ? (
                  <>
                    <h3>What changed</h3>
                    {changes.map((c) => (
                      <p key={c.id}>
                        {c.name}
                        <strong>
                          {formatGrade(c.before)} → {formatGrade(c.after)}%
                        </strong>
                      </p>
                    ))}
                  </>
                ) : (
                  <p>
                    No grade-change history yet. We’ll show changes when actual
                    snapshots exist.
                  </p>
                )}
              </div>
            </section>
          ),
          upcoming: (
            <section
              className={styles.upcomingSection}
              data-testid="concept-upcoming"
            >
              <div className={styles.sectionHeading}>
                <h2>On the horizon</h2>
                <button onClick={() => onNavigate("planner")}>
                  See planner
                  <ArrowUpRight size={15} />
                </button>
              </div>
              <div>
                {upcomingWork.slice(0, 4).map((a) => (
                  <button
                    key={a.id}
                    className={styles.deadline}
                    onClick={() => onOpenCourse(a.course)}
                  >
                    <div className={styles.calendar}>
                      <span>
                        {new Date(a.due + "T12:00:00").toLocaleDateString(
                          undefined,
                          { month: "short" },
                        )}
                      </span>
                      <b>{new Date(a.due + "T12:00:00").getDate()}</b>
                    </div>
                    <div>
                      <strong>{a.name}</strong>
                      <span>{a.course.name}</span>
                    </div>
                    <ChevronRight size={16} />
                  </button>
                ))}
              </div>
              {!upcomingWork.length && (
                <p className={styles.detailIntro}>
                  No upcoming assignments. Add your next deadline in a course.
                </p>
              )}
              <button className={styles.appearanceLink} onClick={onAppearance}>
                Personalize this workspace
                <ArrowUpRight size={15} />
              </button>
            </section>
          ),
        }}
      />
    </div>
  );
}
