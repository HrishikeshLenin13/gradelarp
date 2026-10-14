"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  Check,
  Command,
  FlaskConical,
  GraduationCap,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Moon,
  Plus,
  Search,
  Settings2,
  Sun,
  Upload,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CourseEditor, newCourse } from "@/components/course-editor";
import {
  CoursesPanel,
  DataPanel,
  GpaPanel,
  TrendsPanel,
  WhatIfPanel,
} from "@/components/panels";
import { upcoming } from "@/components/widgets";
import { StateSchema, type Course, type GpaPolicy } from "@/lib/model";
import { emptyState } from "@/lib/demo";
import { snapshotScores } from "@/lib/calculations";
import { cn, uid } from "@/lib/utils";
import { PrecisionOverview } from "./precision";
import { ExpressiveOverview } from "./expressive";
import { KineticOverview } from "./kinetic";
import { LabCourseChart } from "./charts";
import {
  createLabWorkspace,
  defaultPreferences,
  labProvider,
  LabPreferencesSchema,
  LabWorkspaceSchema,
  type LabPreferences,
  type LabWorkspaceData,
} from "./storage";
import {
  directionInfo,
  type ConceptProps,
  type Direction,
  type LabView,
} from "./types";
import styles from "./workspace.module.css";
import { readableAccent, onAccent } from "./contrast";
const views = [
  { id: "overview", name: "Overview", icon: LayoutDashboard },
  { id: "courses", name: "Courses", icon: BookOpen },
  { id: "whatif", name: "What-if calculator", icon: FlaskConical },
  { id: "gpa", name: "GPA planner", icon: GraduationCap },
  { id: "trends", name: "Grade history", icon: BarChart3 },
  { id: "planner", name: "Assignment planner", icon: CalendarDays },
] as const;
const labels: Record<LabView, string> = {
  overview: "Semester overview",
  courses: "Courses",
  whatif: "What-if calculator",
  gpa: "GPA planner",
  trends: "Academic analysis",
  planner: "Assignment planner",
  data: "Preview data",
};
function subscribeSystem(listener: () => void) {
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}
function systemSnapshot() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}
export function DesignWorkspace({ direction }: { direction: Direction }) {
  const [data, setData] = useState<LabWorkspaceData | null>(null);
  const [error, setError] = useState("");
  const [view, setView] = useState<LabView>("overview");
  const [selectedCourseId, setSelected] = useState("demo-course-2");
  const [editor, setEditor] = useState<Course | null>(null);
  const [appearance, setAppearance] = useState(false);
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [mobile, setMobile] = useState(false);
  const [saved, setSaved] = useState("Saving preview…");
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const revision = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const systemDark = useSyncExternalStore(
    subscribeSystem,
    systemSnapshot,
    () => false,
  );
  useEffect(() => {
    let active = true;
    labProvider
      .load(direction)
      .then((value) => {
        if (!active) return;
        const loaded = value ?? createLabWorkspace(direction);
        setData(loaded);
        setSelected(
          loaded.state.courses.find((c) => c.id === "demo-course-2")?.id ??
            loaded.state.courses[0]?.id ??
            "",
        );
      })
      .catch(() => {
        if (active)
          setError(
            "This preview could not be loaded. Retry, or open a new isolated demo.",
          );
      });
    return () => {
      active = false;
    };
  }, [direction, retry]);
  useEffect(() => {
    if (!data) return;
    const current = ++revision.current;
    queue.current = queue.current
      .catch(() => {})
      .then(() => labProvider.save(direction, data))
      .then(() => {
        if (current === revision.current) setSaved("Saved in this preview");
      })
      .catch(() => {
        if (current === revision.current)
          setSaved("Not saved · browser storage unavailable");
      });
  }, [data, direction]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearch((value) => !value);
      }
      if (e.key === "Escape") setMobile(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );
  function notify(text: string) {
    setMessage(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setMessage(""), 4000);
  }
  function commit(next: LabWorkspaceData, text?: string) {
    const parsed = LabWorkspaceSchema.safeParse(next);
    if (!parsed.success) {
      notify(parsed.error.issues[0].message);
      return;
    }
    setSaved("Saving preview…");
    setData(parsed.data);
    if (text) notify(text);
  }
  function navigate(next: LabView) {
    setView(next);
    setMobile(false);
    setSearch(false);
  }
  function record(state: LabWorkspaceData["state"]) {
    const semesters = [...new Set(state.courses.map((c) => c.semester))];
    return {
      ...state,
      snapshots: [
        ...state.snapshots,
        ...semesters.map((semester) => ({
          at: new Date().toISOString(),
          semester,
          ...snapshotScores(
            state.courses.filter((c) => c.semester === semester),
          ),
        })),
      ].slice(-5000),
    };
  }
  function saveCourse(course: Course) {
    if (!data) return;
    const exists = data.state.courses.some((c) => c.id === course.id);
    const state = {
      ...data.state,
      courses: exists
        ? data.state.courses.map((c) => (c.id === course.id ? course : c))
        : [...data.state.courses, course],
    };
    commit(
      { ...data, state: record(state) },
      "Course saved in this isolated preview.",
    );
    setSelected(course.id);
    setEditor(null);
  }
  function addAssignment(course: Course) {
    setEditor({
      ...course,
      assignments: [
        ...course.assignments,
        {
          id: uid(),
          name: "New assignment",
          categoryId: course.categories[0].id,
          earned: null,
          possible: 100,
          status: "ungraded",
          due: new Date().toLocaleDateString("en-CA"),
        },
      ],
    });
  }
  if (!data)
    return (
      <div className={styles.loading}>
        <span className={styles.loadingMark}>g.</span>
        <h1>{directionInfo[direction].name}</h1>
        {error ? (
          <>
            <p role="alert">{error}</p>
            <div className={styles.loadingActions}>
              <button
                onClick={() => {
                  setError("");
                  setRetry((n) => n + 1);
                }}
              >
                Retry
              </button>
              <button
                onClick={() => {
                  setError("");
                  setData(createLabWorkspace(direction));
                }}
              >
                Open isolated demo
              </button>
            </div>
          </>
        ) : (
          <p>Preparing the design workspace…</p>
        )}
      </div>
    );
  const preferences = data.preferences;
  const theme =
    preferences.appearance === "system"
      ? systemDark
        ? "dark"
        : "light"
      : preferences.appearance;
  const courses = data.state.courses;
  const semester =
    courses.find((c) => c.id === selectedCourseId)?.semester ??
    courses[0]?.semester ??
    "Fall 2026";
  const visibleCourses = courses.filter((c) => c.semester === semester);
  const reordered = [...visibleCourses].sort(
    (a, b) =>
      Number(b.id === selectedCourseId) - Number(a.id === selectedCourseId),
  );
  const props: ConceptProps = {
    state: {
      ...data.state,
      courses: visibleCourses,
      settings: {
        ...data.state.settings,
        motion: preferences.motion === "none" ? "none" : "subtle",
        theme,
      },
    },
    selectedCourseId,
    onSelectCourse: setSelected,
    onOpenCourse: setEditor,
    onWhatIf: (id) => {
      if (id) setSelected(id);
      navigate("whatif");
    },
    onNavigate: navigate,
    onAddCourse: () => setEditor(newCourse(semester)),
    onAddAssignment: addAssignment,
    onRecordSnapshot: () =>
      commit(
        { ...data, state: record(data.state) },
        "Snapshot recorded from actual preview grades.",
      ),
    onAppearance: () => setAppearance(true),
    motionEnabled: preferences.motion !== "none",
  };
  const overview =
    direction === "precision" ? (
      <PrecisionOverview {...props} />
    ) : direction === "expressive" ? (
      <ExpressiveOverview {...props} />
    ) : (
      <KineticOverview {...props} />
    );
  const accent = readableAccent(preferences.accent, theme);
  const rootStyle = {
    "--dl-accent": accent,
    "--dl-accent-soft": `color-mix(in srgb, ${accent} 10%, transparent)`,
    "--dl-on-accent": onAccent(accent),
  } as React.CSSProperties;
  return (
    <MotionConfig
      reducedMotion={preferences.motion === "none" ? "always" : "user"}
      transition={{
        duration: preferences.motion === "none" ? 0 : 0.16,
        ease: "easeOut",
      }}
    >
      <div
        className={cn("lab-root", styles.root, theme)}
        style={rootStyle}
        data-direction={direction}
        data-theme={theme}
        data-density={preferences.density}
        data-sidebar={preferences.sidebar}
        data-hide-analysis={!preferences.showAnalysis}
        data-hide-upcoming={!preferences.showUpcoming}
        data-motion={preferences.motion}
      >
        <a className={styles.skip} href="#design-content">
          Skip to workspace
        </a>
        <div className={styles.reviewBar}>
          <Link href="/design-lab">
            <ArrowLeft size={13} />
            Design laboratory
          </Link>
          <span>
            {directionInfo[direction].name}{" "}
            <b>
              {direction === "expressive"
                ? "Approved design · isolated reference"
                : "Archived concept"}
            </b>
          </span>
          <Link href="/">
            Real application
            <ArrowUpRight size={13} />
          </Link>
        </div>
        {mobile && (
          <button
            className={styles.scrim}
            aria-label="Close design navigation"
            onClick={() => setMobile(false)}
          />
        )}
        <aside
          className={cn(styles.nav, mobile && styles.navOpen)}
          aria-label="Design navigation"
        >
          <button
            className={styles.brand}
            onClick={() => navigate("overview")}
            aria-label="gradelarp preview home"
          >
            <BrandMark />
            <span>gradelarp.</span>
          </button>
          <div className={styles.navCaption}>Demo workspace</div>
          <nav>
            {views.map((item) => (
              <button
                key={item.id}
                aria-label={item.name}
                title={item.name}
                aria-current={view === item.id ? "page" : undefined}
                className={cn(
                  styles.navItem,
                  view === item.id && styles.navActive,
                )}
                onClick={() => navigate(item.id)}
              >
                <item.icon size={19} />
                <span>{item.name}</span>
                {view === item.id && (
                  <motion.i
                    layoutId={`nav-${direction}`}
                    className={styles.activeMarker}
                  />
                )}
              </button>
            ))}
          </nav>
          <div className={styles.navBottom}>
            <button
              className={styles.navItem}
              onClick={() => {
                setMobile(false);
                setAppearance(true);
              }}
              aria-label="Appearance"
              title="Appearance"
            >
              <Settings2 size={19} />
              <span>Appearance</span>
            </button>
            <button
              className={styles.navItem}
              onClick={() => navigate("data")}
              aria-label="Preview data"
              title="Preview data"
            >
              <Upload size={19} />
              <span>Preview data</span>
            </button>
            <div className={styles.avatar}>
              <span>AL</span>
              <div>
                <b>Alex</b>
                <small>Isolated demo</small>
              </div>
            </div>
          </div>
        </aside>
        <div className={styles.shell}>
          <header className={styles.toolbar}>
            <div className={styles.toolbarLeft}>
              <button
                className={styles.mobileToggle}
                aria-label="Open navigation"
                aria-expanded={mobile}
                onClick={() => setMobile(!mobile)}
              >
                <Menu size={20} />
              </button>
              <span>{semester}</span>
              <span className={styles.toolbarContext}>
                {view === "overview" ? "Academic workspace" : labels[view]}
              </span>
            </div>
            <div className={styles.toolbarActions}>
              <button
                className={styles.searchTrigger}
                aria-label="Search design workspace"
                onClick={() => {
                  setQuery("");
                  setSearch(true);
                }}
              >
                <Search size={17} />
                <span>Quick search</span>
                <kbd>
                  <Command size={11} />K
                </kbd>
              </button>
              <button
                className={styles.themeToggle}
                aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                onClick={() =>
                  commit({
                    ...data,
                    preferences: {
                      ...preferences,
                      appearance: theme === "dark" ? "light" : "dark",
                    },
                  })
                }
              >
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button
                    className={styles.themeToggle}
                    aria-label="Workspace actions"
                  >
                    <MoreHorizontal size={20} />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    className={styles.dropdown}
                    align="end"
                    sideOffset={8}
                  >
                    <DropdownMenu.Item onSelect={() => props.onAddCourse()}>
                      <Plus size={15} />
                      Add course
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      onSelect={() => props.onRecordSnapshot()}
                    >
                      <BarChart3 size={15} />
                      Record actual snapshot
                    </DropdownMenu.Item>
                    <DropdownMenu.Item onSelect={() => setAppearance(true)}>
                      <Settings2 size={15} />
                      Customize preview
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator />
                    <DropdownMenu.Item onSelect={() => navigate("data")}>
                      <Upload size={15} />
                      Preview import & export
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>
          </header>
          <main className={styles.main} id="design-content" tabIndex={-1}>
            <div className={styles.demoNote}>
              <span className={styles.demoDot} />
              <span>
                {data.state.demo
                  ? "Clearly labeled demo data"
                  : "Isolated preview data"}{" "}
                · Custom GPA estimates, not official school values.
              </span>
              <span>{saved}</span>
            </div>
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                key={view}
                className="lab-view"
                data-view={view}
                initial={preferences.motion === "none" ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: preferences.motion === "none" ? 1 : 0 }}
              >
                {view === "overview" ? (
                  <div data-testid="concept-overview">{overview}</div>
                ) : (
                  <>
                    <div className={styles.toolHeading}>
                      <div>
                        <button onClick={() => navigate("overview")}>
                          <ArrowLeft size={14} />
                          Overview
                        </button>
                        <h1>{labels[view]}</h1>
                        <p>
                          {view === "whatif"
                            ? "Test a possible score without changing actual grades."
                            : view === "gpa"
                              ? "Transparent credit-weighted calculations using your custom scale."
                              : view === "trends"
                                ? "Current comparisons and recorded history. No invented timeline."
                                : view === "planner"
                                  ? "Upcoming work from your entered assignments. Completion never changes a grade."
                                  : view === "data"
                                    ? "Imports and exports here affect only this concept’s preview."
                                    : "Your editable courses in this preview."}
                        </p>
                      </div>
                      <button
                        className={styles.customizeAction}
                        onClick={() => setAppearance(true)}
                      >
                        <Settings2 size={16} />
                        Appearance
                      </button>
                    </div>
                    {view === "courses" && (
                      <CoursesPanel
                        courses={visibleCourses}
                        policy={data.state.policy}
                        onOpen={setEditor}
                        onAdd={props.onAddCourse}
                      />
                    )}
                    {view === "whatif" && <WhatIfPanel courses={reordered} />}
                    {view === "gpa" && (
                      <GpaPanel
                        courses={visibleCourses}
                        policy={data.state.policy}
                        onPolicy={(policy: GpaPolicy) =>
                          commit(
                            { ...data, state: { ...data.state, policy } },
                            "Preview GPA policy saved.",
                          )
                        }
                      />
                    )}
                    {view === "trends" && (
                      <>
                        <section className={styles.analysisPanel}>
                          <div>
                            <h2>Course comparison</h2>
                            <p>
                              Current percentages and distance from each course
                              target.
                            </p>
                          </div>
                          <LabCourseChart
                            presentation={preferences.chart}
                            courses={visibleCourses}
                            policy={data.state.policy}
                            selectedId={selectedCourseId}
                            onSelect={setSelected}
                          />
                        </section>
                        <TrendsPanel
                          state={{
                            ...data.state,
                            settings: {
                              ...data.state.settings,
                              motion:
                                preferences.motion === "none"
                                  ? "none"
                                  : "subtle",
                              theme,
                            },
                          }}
                          semester={semester}
                          onSnapshot={props.onRecordSnapshot}
                        />
                      </>
                    )}
                    {view === "planner" && (
                      <AssignmentPlanner
                        courses={visibleCourses}
                        completed={data.completed}
                        onToggle={(id) =>
                          commit({
                            ...data,
                            completed: data.completed.includes(id)
                              ? data.completed.filter((x) => x !== id)
                              : [...data.completed, id],
                          })
                        }
                        onOpen={setEditor}
                      />
                    )}
                    {view === "data" && (
                      <DataPanel
                        state={data.state}
                        onImport={(state) =>
                          commit(
                            { ...data, state: StateSchema.parse(state) },
                            "Preview data imported. Original workspace unchanged.",
                          )
                        }
                        onClear={() =>
                          commit(
                            { ...data, state: emptyState(), completed: [] },
                            "This preview’s data was cleared.",
                          )
                        }
                        onDemo={() =>
                          commit(
                            {
                              ...data,
                              ...createLabWorkspace(direction),
                              preferences,
                            },
                            "Demo reloaded in this concept only.",
                          )
                        }
                        notify={notify}
                      />
                    )}
                  </>
                )}
              </motion.div>
            </AnimatePresence>
            <footer className={styles.footer}>
              <span>
                gradelarp. <b>{directionInfo[direction].name} concept</b>
              </span>
              <Link href="/design-lab">
                Compare the directions
                <ArrowUpRight size={13} />
              </Link>
            </footer>
          </main>
        </div>
        {editor && (
          <CourseEditor
            key={editor.id}
            initial={editor}
            onSave={saveCourse}
            onClose={() => setEditor(null)}
            onDelete={() => {
              commit(
                {
                  ...data,
                  state: record({
                    ...data.state,
                    courses: data.state.courses.filter(
                      (c) => c.id !== editor.id,
                    ),
                  }),
                },
                "Course removed from this preview.",
              );
              setEditor(null);
            }}
          />
        )}
        {appearance && (
          <AppearanceEditor
            initial={preferences}
            direction={direction}
            onClose={() => setAppearance(false)}
            onSave={(value) => {
              commit(
                { ...data, preferences: value },
                "Preview preferences saved.",
              );
              setAppearance(false);
            }}
          />
        )}
        <Dialog open={search} onOpenChange={setSearch}>
          <DialogContent className={styles.commandDialog}>
            <DialogTitle>Search design workspace</DialogTitle>
            <DialogDescription>
              Jump to a course or academic tool. These actions stay in this
              preview.
            </DialogDescription>
            <div className={styles.commandInput}>
              <Search size={18} />
              <input
                autoFocus
                aria-label="Search design workspace"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Course or tool name"
              />
            </div>
            <div className={styles.commandResults}>
              {views
                .filter((item) =>
                  item.name.toLowerCase().includes(query.toLowerCase()),
                )
                .map((item) => (
                  <button key={item.id} onClick={() => navigate(item.id)}>
                    <item.icon size={17} />
                    {item.name}
                    <ArrowUpRight size={15} />
                  </button>
                ))}
              {courses
                .filter((c) =>
                  c.name.toLowerCase().includes(query.toLowerCase()),
                )
                .map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSearch(false);
                      setSelected(c.id);
                      setEditor(c);
                    }}
                  >
                    <BookOpen size={17} />
                    {c.name}
                    <small>{c.semester}</small>
                  </button>
                ))}
              {!views.some((v) =>
                v.name.toLowerCase().includes(query.toLowerCase()),
              ) &&
                !courses.some((c) =>
                  c.name.toLowerCase().includes(query.toLowerCase()),
                ) && <p>No matches. Try a course or tool name.</p>}
            </div>
          </DialogContent>
        </Dialog>
        {message && (
          <div className={styles.toast} role="status">
            <Check size={17} />
            {message}
            <button aria-label="Dismiss message" onClick={() => setMessage("")}>
              <X size={15} />
            </button>
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
function BrandMark() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M20 7H12a7 7 0 0 0 0 14h8V12h-7"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 21v2H9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
function AppearanceEditor({
  initial,
  direction,
  onClose,
  onSave,
}: {
  initial: LabPreferences;
  direction: Direction;
  onClose: () => void;
  onSave: (p: LabPreferences) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState("");
  const update = (value: Partial<LabPreferences>) =>
    setDraft({ ...draft, ...value });
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={styles.appearanceDialog}>
        <DialogTitle>Your preview, your preferences</DialogTitle>
        <DialogDescription>
          Settings belong to this {directionInfo[direction].name} concept, not
          your original workspace.
        </DialogDescription>
        <div className={styles.appearanceSamples} aria-hidden="true">
          <div className={styles.sampleDark}>
            <i />
            <span>
              <b />
              <b />
              <b />
            </span>
          </div>
          <div className={styles.sampleLight}>
            <i />
            <span>
              <b />
              <b />
              <b />
            </span>
          </div>
        </div>
        <div className="form-grid">
          <label>
            Appearance mode
            <select
              aria-label="Appearance mode"
              value={draft.appearance}
              onChange={(e) =>
                update({
                  appearance: e.target.value as LabPreferences["appearance"],
                })
              }
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="system">System appearance</option>
            </select>
          </label>
          <label>
            Density
            <select
              aria-label="Density"
              value={draft.density}
              onChange={(e) =>
                update({ density: e.target.value as LabPreferences["density"] })
              }
            >
              <option value="compact">Compact</option>
              <option value="spacious">Spacious</option>
            </select>
          </label>
          <label>
            Accent color
            <input
              aria-label="Accent color"
              type="color"
              value={draft.accent}
              onChange={(e) => update({ accent: e.target.value })}
            />
          </label>
          <label>
            Motion
            <select
              aria-label="Motion"
              value={draft.motion}
              onChange={(e) =>
                update({ motion: e.target.value as LabPreferences["motion"] })
              }
            >
              <option value="subtle">Subtle feedback</option>
              <option value="none">Off</option>
            </select>
          </label>
          <label>
            Navigation
            <select
              aria-label="Navigation layout"
              value={draft.sidebar}
              onChange={(e) =>
                update({ sidebar: e.target.value as LabPreferences["sidebar"] })
              }
            >
              <option value="expanded">Expanded labels</option>
              <option value="compact">Compact icons</option>
            </select>
          </label>
          <label>
            Analysis charts
            <select
              aria-label="Analysis charts"
              value={draft.chart}
              onChange={(e) =>
                update({ chart: e.target.value as LabPreferences["chart"] })
              }
            >
              <option value="bars">Bars</option>
              <option value="dots">Dots</option>
            </select>
          </label>
        </div>
        <div className={styles.visibility}>
          <label>
            <input
              type="checkbox"
              checked={draft.showAnalysis}
              onChange={(e) => update({ showAnalysis: e.target.checked })}
            />
            Academic analysis
          </label>
          <label>
            <input
              type="checkbox"
              checked={draft.showUpcoming}
              onChange={(e) => update({ showUpcoming: e.target.checked })}
            />
            Upcoming assignments
          </label>
        </div>
        <div
          className={styles.draftPreview}
          style={{ "--sample-accent": draft.accent } as React.CSSProperties}
        >
          <span />
          <strong>{directionInfo[direction].name}</strong>
          <p>
            {draft.appearance} appearance · {draft.density} spacing ·{" "}
            {draft.motion === "none" ? "motion off" : "subtle motion"}
          </p>
        </div>
        {error && (
          <p role="alert" className="error-message">
            {error}
          </p>
        )}
        <div className="dialog-footer">
          <button
            className={styles.resetAppearance}
            onClick={() => setDraft(defaultPreferences(direction))}
          >
            Restore concept defaults
          </button>
          <Button
            onClick={() => {
              const parsed = LabPreferencesSchema.safeParse(draft);
              if (parsed.success) onSave(parsed.data);
              else setError(parsed.error.issues[0].message);
            }}
          >
            Save preview preferences
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
function AssignmentPlanner({
  courses,
  completed,
  onToggle,
  onOpen,
}: {
  courses: Course[];
  completed: string[];
  onToggle: (id: string) => void;
  onOpen: (c: Course) => void;
}) {
  const [filter, setFilter] = useState("upcoming");
  const [search, setSearch] = useState("");
  const [today] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  });
  const items = upcoming(courses).filter(
    (a) =>
      (filter === "completed"
        ? completed.includes(a.id)
        : filter === "week"
          ? new Date(a.due + "T12:00:00").getTime() < today + 7 * 86400000
          : !completed.includes(a.id)) &&
      `${a.name} ${a.course.name}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <section className={styles.planner}>
      <div className={styles.plannerControls}>
        <div role="group" aria-label="Assignment filters">
          {[
            ["upcoming", "Upcoming"],
            ["week", "This week"],
            ["completed", "Completed"],
          ].map(([id, label]) => (
            <button
              key={id}
              aria-pressed={filter === id}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          aria-label="Search assignments"
          placeholder="Search assignments"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div>
        {items.map((a) => (
          <div className={styles.plannerRow} key={a.id}>
            <label>
              <input
                type="checkbox"
                aria-label={`Complete ${a.name}`}
                checked={completed.includes(a.id)}
                onChange={() => onToggle(a.id)}
              />
            </label>
            <button onClick={() => onOpen(a.course)}>
              <strong>{a.name}</strong>
              <span>
                {a.course.name} · {a.possible} points · {a.status}
              </span>
            </button>
            <time dateTime={a.due}>
              {new Date(a.due + "T12:00:00").toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </time>
            <button
              className={styles.plannerEdit}
              aria-label={`Edit ${a.name}`}
              onClick={() => onOpen(a.course)}
            >
              <ArrowUpRight size={17} />
            </button>
          </div>
        ))}
        {!items.length && (
          <div className={styles.plannerEmpty}>
            <Check size={24} />
            <h2>
              {filter === "completed"
                ? "No completed work yet."
                : "No assignments in this view."}
            </h2>
            <p>
              {filter === "completed"
                ? "Complete an upcoming assignment to track it here."
                : "Try another filter or add an assignment in a course."}
            </p>
            <button
              onClick={() =>
                setFilter(filter === "completed" ? "upcoming" : "week")
              }
            >
              Change filter
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
