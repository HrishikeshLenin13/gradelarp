"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MotionConfig, motion, useReducedMotion } from "motion/react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  School,
  LayoutDashboard,
  BookOpen,
  FlaskConical,
  GraduationCap,
  BarChart3,
  CalendarDays,
  NotebookTabs,
  Upload,
  Settings2,
  Users,
  Menu,
  Search,
  Sun,
  Moon,
  Plus,
  MoreHorizontal,
  ArrowLeft,
  Download,
  Check,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CourseEditor, newCourse } from "@/components/course-editor";
import { CoursesPanel, TrendsPanel } from "@/components/panels";
import { LabCourseChart } from "@/design-lab/charts";
import { readableAccent, onAccent } from "@/design-lab/contrast";
import { semesterProgress } from "@/lib/calculations";
import type { Course } from "@/lib/model";
import { download } from "@/lib/import-export";
import { cn, uid } from "@/lib/utils";
import {
  ProductSchema,
  currentSemester,
  localDate,
  newProfile,
  recordState,
  type Profile,
  type ProductData,
} from "./model";
import { productProvider } from "./storage";
import { ExpressiveDashboard } from "./dashboard";
import { WhatIf } from "./what-if";
import { GpaPlanner } from "./gpa";
import { Planner } from "./planner";
import { Academics } from "./academics";
import { Appearance, Profiles } from "./preferences";
import { SchoolConnection } from "./hac";
import { DataTools } from "./data";
import { Confirm } from "./forms";
import styles from "@/design-lab/workspace.module.css";
import "./product.css";
const pages = [
  { id: "overview", name: "Overview", icon: LayoutDashboard },
  { id: "courses", name: "Courses", icon: BookOpen },
  { id: "whatif", name: "What-if calculator", icon: FlaskConical },
  { id: "gpa", name: "GPA planner", icon: GraduationCap },
  { id: "trends", name: "Grade history", icon: BarChart3 },
  { id: "planner", name: "Assignment planner", icon: CalendarDays },
  { id: "academics", name: "Academic tools", icon: NotebookTabs },
  { id: "hac", name: "School connection", icon: School },
  { id: "data", name: "Data & backups", icon: Upload },
] as const;
type View = (typeof pages)[number]["id"];
const descriptions: Record<View, string> = {
  overview: "Your semester, with a little perspective.",
  courses: "Your actual assignments, categories, and course targets.",
  whatif: "Explore several possibilities without changing a single real grade.",
  gpa: "Understand your credits. Plan what comes next.",
  trends: "Real grades. Real snapshots. Your academic story over time.",
  planner: "Make room for what’s next. Plan work without changing your grades.",
  academics: "The details around your school day, together at last.",
  hac: "A thoughtful connection, with your work kept intact.",
  data: "Your data belongs to you. Keep a copy, wherever you go.",
};
function subscribeSystem(listener: () => void) {
  const q = window.matchMedia("(prefers-color-scheme: dark)");
  q.addEventListener("change", listener);
  return () => q.removeEventListener("change", listener);
}
export function GradelarpApp() {
  const [data, setData] = useState<ProductData | null>(null),
    [loadError, setLoadError] = useState(""),
    [retry, setRetry] = useState(0),
    [saveError, setSaveError] = useState(""),
    [saved, setSaved] = useState("Loading local grades…");
  const [view, setView] = useState<View>("overview"),
    [semester, setSemester] = useState(currentSemester),
    [selected, setSelected] = useState("");
  const [editor, setEditor] = useState<Course | null>(null),
    [appearance, setAppearance] = useState(false),
    [profiles, setProfiles] = useState(false),
    [mobile, setMobile] = useState(false),
    [search, setSearch] = useState(false),
    [query, setQuery] = useState("");
  const [message, setMessage] = useState(""),
    [deleteScenario, setDeleteScenario] = useState<string | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve()),
    revision = useRef(0),
    sequence = useRef(0),
    loaded = useRef<ProductData | null>(null),
    toast = useRef<ReturnType<typeof setTimeout> | null>(null);
  const systemDark = useSyncExternalStore(
      subscribeSystem,
      () => window.matchMedia("(prefers-color-scheme: dark)").matches,
      () => false,
    ),
    reduced = useReducedMotion();
  useEffect(() => {
    let active = true;
    productProvider
      .load()
      .then((result) => {
        if (!active) return;
        loaded.current = result.data;
        revision.current = result.revision;
        setData(result.data);
        const p = result.data.profiles.find(
          (p) => p.id === result.data.activeProfileId,
        )!;
        setSemester(p.state.courses[0]?.semester ?? currentSemester());
        setSelected(p.state.courses[0]?.id ?? "");
        setSaved("Saved on this device");
        setLoadError("");
      })
      .catch((e) => {
        if (active)
          setLoadError(
            e instanceof Error ? e.message : "Local data could not be loaded.",
          );
      });
    return () => {
      active = false;
    };
  }, [retry]);
  useEffect(() => {
    if (!data || data === loaded.current) return;
    const current = ++sequence.current;
    queue.current = queue.current
      .catch(() => {})
      .then(async () => {
        revision.current = await productProvider.save(data, revision.current);
      })
      .then(() => {
        if (current === sequence.current) {
          setSaved("Saved on this device");
          setSaveError("");
        }
      })
      .catch((e) => {
        if (current === sequence.current) {
          setSaved("Unsaved changes");
          setSaveError(
            e instanceof Error
              ? e.message
              : "Storage failed. Export a backup of your unsaved changes.",
          );
        }
      });
  }, [data]);
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setQuery("");
        setSearch((x) => !x);
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  useEffect(
    () => () => {
      if (toast.current) clearTimeout(toast.current);
    },
    [],
  );
  const profile = data?.profiles.find((p) => p.id === data.activeProfileId);
  function notify(text: string) {
    setMessage(text);
    if (toast.current) clearTimeout(toast.current);
    toast.current = setTimeout(() => setMessage(""), 5000);
  }
  function commit(next: ProductData) {
    const parsed = ProductSchema.safeParse(next);
    if (!parsed.success) {
      notify(parsed.error.issues[0].message);
      return;
    }
    setSaved("Saving changes…");
    setData(parsed.data);
  }
  function updateProfile(p: Profile) {
    if (data)
      commit({
        ...data,
        profiles: data.profiles.map((x) => (x.id === p.id ? p : x)),
      });
  }
  function changeData(next: ProductData, keepView = false) {
    const p = next.profiles.find((p) => p.id === next.activeProfileId)!;
    if (next.activeProfileId !== data?.activeProfileId) {
      setSemester(p.state.courses[0]?.semester ?? currentSemester());
      setSelected(p.state.courses[0]?.id ?? "");
      if (!keepView) setView("overview");
    }
    commit(next);
  }
  function navigate(next: View) {
    setView(next);
    setMobile(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function select(id: string) {
    setSelected(id);
    const c = profile?.state.courses.find((c) => c.id === id);
    if (c) setSemester(c.semester);
  }
  function openDemo() {
    if (!data) return;
    const existing = data.profiles.find((p) => p.state.demo && !p.hac);
    if (existing) {
      changeData({ ...data, activeProfileId: existing.id });
      return;
    }
    const demo = newProfile("Alex · Demo", true);
    changeData({
      ...data,
      profiles: [...data.profiles, demo],
      activeProfileId: demo.id,
    });
    notify("Separate demo profile opened. Manual profiles are unchanged.");
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
          status: "future",
          due: localDate(),
        },
      ],
    });
  }
  if (!data || !profile)
    return (
      <div className={styles.loading}>
        <span className={styles.loadingMark}>g.</span>
        <h1>gradelarp.</h1>
        {loadError ? (
          <>
            <p role="alert">Your saved data was not replaced. {loadError}</p>
            <Button onClick={() => setRetry((n) => n + 1)}>
              Retry loading
            </Button>
          </>
        ) : (
          <p>Opening your local academic workspace…</p>
        )}
      </div>
    );
  const prefs = profile.preferences,
    state = profile.state,
    theme =
      prefs.appearance === "system"
        ? systemDark
          ? "dark"
          : "light"
        : prefs.appearance,
    accent = readableAccent(prefs.accent, theme),
    courses = state.courses.filter((c) => c.semester === semester);
  const period = profile.periods[semester];
  const selectedId = courses.some((c) => c.id === selected)
      ? selected
      : (courses[0]?.id ?? ""),
    semesters = [
      ...new Set([semester, ...state.courses.map((c) => c.semester)]),
    ];
  const duration =
    prefs.motion === "none" || reduced
      ? 0
      : prefs.motion === "full"
        ? 0.2
        : 0.14;
  function snapshot() {
    updateProfile({ ...profile!, state: recordState(state) });
    notify("Snapshot recorded from actual grades.");
  }
  const rootStyle = {
    "--dl-accent": accent,
    "--dl-accent-soft": `color-mix(in srgb, ${accent} 10%, transparent)`,
    "--dl-on-accent": onAccent(accent),
  } as React.CSSProperties;
  const navigation = (
    <>
      <button
        className={styles.brand}
        aria-label="gradelarp home"
        onClick={() => navigate("overview")}
      >
        <Brand />
        <span>gradelarp.</span>
      </button>
      <div className={styles.navCaption}>Academic workspace</div>
      <nav aria-label="Main navigation">
        {pages.map((p) => (
          <button
            key={p.id}
            className={cn(styles.navItem, view === p.id && styles.navActive)}
            aria-label={p.name}
            title={p.name}
            aria-current={view === p.id ? "page" : undefined}
            onClick={() => navigate(p.id)}
          >
            <p.icon size={19} />
            <span>{p.name}</span>
            {view === p.id && <i className={styles.activeMarker} />}
          </button>
        ))}
      </nav>
      <div className={styles.navBottom}>
        <button
          className={styles.navItem}
          aria-label="Appearance"
          title="Appearance"
          onClick={() => {
            setMobile(false);
            setAppearance(true);
          }}
        >
          <Settings2 size={19} />
          <span>Appearance</span>
        </button>
        <button
          className={styles.navItem}
          aria-label="Student profiles"
          title="Student profiles"
          onClick={() => {
            setMobile(false);
            setProfiles(true);
          }}
        >
          <Users size={19} />
          <span>Student profiles</span>
        </button>
        <button
          className={styles.avatar}
          aria-label={`Current student: ${profile.name}. Manage profiles`}
          onClick={() => {
            setMobile(false);
            setProfiles(true);
          }}
        >
          <span>{profile.name.slice(0, 2).toUpperCase()}</span>
          <div>
            <b>{profile.name}</b>
            <small>{state.demo ? "Demo profile" : "Local student"}</small>
          </div>
        </button>
      </div>
    </>
  );
  return (
    <MotionConfig
      reducedMotion={prefs.motion === "none" ? "always" : "user"}
      transition={{ duration, ease: "easeOut" }}
    >
      <div
        className={cn("product-root", styles.root, theme)}
        style={rootStyle}
        data-direction="expressive"
        data-theme={theme}
        data-density={prefs.density}
        data-sidebar={prefs.sidebar}
        data-motion={prefs.motion}
        data-layout={prefs.layout}
      >
        <a className={styles.skip} href="#main-content">
          Skip to workspace
        </a>
        <aside
          className={cn(styles.nav, "product-nav")}
          aria-label="Workspace navigation"
        >
          {navigation}
        </aside>
        <div className={styles.shell}>
          <header className={styles.toolbar}>
            <div className={styles.toolbarLeft}>
              <button
                className={styles.mobileToggle}
                aria-label="Open navigation"
                aria-expanded={mobile}
                onClick={() => setMobile(true)}
              >
                <Menu size={20} />
              </button>
              <label className="product-semester">
                <span className="sr-only">Active semester</span>
                <select
                  value={semester}
                  onChange={(e) => {
                    setSemester(e.target.value);
                    setSelected(
                      state.courses.find((c) => c.semester === e.target.value)
                        ?.id ?? "",
                    );
                  }}
                >
                  {semesters.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <span className={styles.toolbarContext}>
                Your academic workspace
              </span>
            </div>
            <div className={styles.toolbarActions}>
              <button
                className={styles.searchTrigger}
                aria-label="Search workspace"
                onClick={() => {
                  setQuery("");
                  setSearch(true);
                }}
              >
                <Search size={17} />
                <span>Quick search</span>
                <kbd>⌘ K</kbd>
              </button>
              <button
                className={styles.themeToggle}
                aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
                onClick={() =>
                  updateProfile({
                    ...profile,
                    preferences: {
                      ...prefs,
                      appearance: theme === "light" ? "dark" : "light",
                    },
                  })
                }
              >
                {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
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
                    <DropdownMenu.Item
                      onSelect={() => setEditor(newCourse(semester))}
                    >
                      <Plus size={15} />
                      Add course
                    </DropdownMenu.Item>
                    <DropdownMenu.Item onSelect={snapshot}>
                      <BarChart3 size={15} />
                      Record actual snapshot
                    </DropdownMenu.Item>
                    <DropdownMenu.Item onSelect={() => setAppearance(true)}>
                      <Settings2 size={15} />
                      Customize workspace
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      onSelect={() =>
                        download(
                          "gradelarp-full-backup.json",
                          JSON.stringify(data, null, 2),
                        )
                      }
                    >
                      <Download size={15} />
                      Download full backup
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>
          </header>
          <main id="main-content" className={styles.main} tabIndex={-1}>
            <div className={cn(styles.demoNote, "product-status-line")}>
              <span className={styles.demoDot} />
              <span>
                {profile.hac
                  ? "HAC sandbox · synthetic grades"
                  : state.demo
                    ? "Demo profile · sample grades"
                    : "Manual / imported grades"}{" "}
                · Custom GPA estimates
              </span>
              <span role="status">{saved}</span>
            </div>
            {saveError && (
              <div className="product-save-error" role="alert">
                <p>{saveError}</p>
                <Button
                  variant="outline"
                  onClick={() =>
                    download(
                      "gradelarp-unsaved-backup.json",
                      JSON.stringify(data, null, 2),
                    )
                  }
                >
                  Export unsaved backup
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                >
                  Reload saved data
                </Button>
              </div>
            )}
            {state.demo && (
              <div className="product-demo-banner">
                <span>
                  {profile.hac
                    ? "HAC sandbox: synthetic school records, not your real grades."
                    : "You’re exploring a separate demo. Ready for your own semester?"}
                </span>
                <button onClick={() => setProfiles(true)}>
                  Create a student profile <Plus size={15} />
                </button>
              </div>
            )}
            <motion.div
              key={`${profile.id}/${view}`}
              className="lab-view product-view"
              data-view={view}
              initial={duration ? { opacity: 0.75 } : false}
              animate={{ opacity: 1 }}
              transition={{ duration }}
            >
              {view !== "overview" && (
                <div className={styles.toolHeading}>
                  <div>
                    <button onClick={() => navigate("overview")}>
                      <ArrowLeft size={14} />
                      Overview
                    </button>
                    <h1>{pages.find((p) => p.id === view)?.name}</h1>
                    <p>{descriptions[view]}</p>
                  </div>
                </div>
              )}
              {view === "overview" ? (
                state.courses.length ? (
                  <>
                    <ExpressiveDashboard
                      state={{
                        ...state,
                        courses,
                        settings: {
                          ...state.settings,
                          theme,
                          motion: prefs.motion,
                        },
                      }}
                      selectedCourseId={selectedId}
                      onSelectCourse={select}
                      onOpenCourse={setEditor}
                      onWhatIf={(id) => {
                        if (id) select(id);
                        navigate("whatif");
                      }}
                      onNavigate={navigate}
                      onAddCourse={() => setEditor(newCourse(semester))}
                      onAddAssignment={addAssignment}
                      onRecordSnapshot={snapshot}
                      onAppearance={() => setAppearance(true)}
                      onReorder={(order) =>
                        updateProfile({
                          ...profile,
                          state: {
                            ...state,
                            settings: { ...state.settings, order },
                          },
                        })
                      }
                      motionEnabled={duration > 0}
                    />
                    <div className="product-semester-progress">
                      {period ? (
                        <>
                          <span>
                            {semester} · {period.start} — {period.end}
                          </span>
                          <progress
                            aria-label="Semester calendar progress"
                            max={100}
                            value={semesterProgress(period.start, period.end)}
                          />
                          <b>
                            {Math.round(
                              semesterProgress(period.start, period.end),
                            )}
                            % of configured dates elapsed
                          </b>
                        </>
                      ) : (
                        <>
                          <span>
                            Semester calendar progress uses your own term dates.
                          </span>
                          <button onClick={() => setAppearance(true)}>
                            Set dates for {semester}
                          </button>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <section className="product-onboarding">
                    <p className="product-eyebrow">
                      A semester with character.
                    </p>
                    <h1>
                      Your next chapter
                      <br />
                      starts right here.
                    </h1>
                    <p>
                      A home for your grades, your plans, and the possibilities
                      ahead. Start with your real courses, or explore a clearly
                      labeled demo.
                    </p>
                    <div className="flex">
                      <Button onClick={() => setEditor(newCourse(semester))}>
                        <Plus size={17} />
                        Add your first course
                      </Button>
                      <Button variant="outline" onClick={() => navigate("hac")}>
                        Connect HAC
                      </Button>
                    </div>
                    <div className="product-onboarding-bottom">
                      <div>
                        <b>01</b>
                        <h3>Make it yours</h3>
                        <p>
                          Enter courses, assignments, and the grading rules your
                          teacher uses.
                        </p>
                      </div>
                      <div>
                        <b>02</b>
                        <h3>See what’s possible</h3>
                        <p>
                          Experiment with scores without touching your real
                          grades.
                        </p>
                      </div>
                      <div>
                        <b>03</b>
                        <h3>Own your data</h3>
                        <p>
                          Everything stays on your device. Export a backup
                          anytime.
                        </p>
                      </div>
                    </div>
                  </section>
                )
              ) : null}
              {view === "courses" &&
                (profile.hacLive ? (
                  <SourceGradebook
                    snapshot={profile.hacLive.snapshot}
                    onConnect={() => navigate("hac")}
                  />
                ) : (
                  <CoursesPanel
                    courses={courses}
                    policy={state.policy}
                    onOpen={setEditor}
                    onAdd={() => setEditor(newCourse(semester))}
                  />
                ))}
              {view === "whatif" &&
                (profile.hacLive ? (
                  <section className="panel">
                    <h2>What-if needs confirmed grading rules.</h2>
                    <p className="helper">
                      Your school-reported grades remain unchanged. Use a
                      separate manual profile with your teacher’s category
                      weights and scoring rules to make planning estimates.
                    </p>
                    <Button variant="outline" onClick={() => setProfiles(true)}>
                      Open student profiles
                    </Button>
                  </section>
                ) : (
                  <WhatIf
                    courses={state.courses}
                    selectedId={selectedId}
                    onSelect={select}
                    scenarios={profile.scenarios}
                    onSave={(s) => {
                      updateProfile({
                        ...profile,
                        scenarios: profile.scenarios.some((x) => x.id === s.id)
                          ? profile.scenarios.map((x) =>
                              x.id === s.id ? s : x,
                            )
                          : [...profile.scenarios, s],
                      });
                      notify("Scenario saved. Real grades unchanged.");
                    }}
                    onDelete={setDeleteScenario}
                  />
                ))}
              {view === "gpa" &&
                (profile.hacLive ? (
                  <section className="panel">
                    <h2>GPA needs confirmed course credits.</h2>
                    <p className="helper">
                      HAC grades alone do not establish credits, course level,
                      or district GPA policy. Use a separate manual profile with
                      verified inputs for custom planning; no GPA is invented
                      from this sync.
                    </p>
                    <Button variant="outline" onClick={() => setProfiles(true)}>
                      Open student profiles
                    </Button>
                  </section>
                ) : (
                  <GpaPlanner
                    key={profile.id + semester}
                    profile={profile}
                    semester={semester}
                    onUpdate={updateProfile}
                  />
                ))}
              {view === "trends" && (
                <>
                  <section className="panel product-chart-panel">
                    <h2>Course comparison</h2>
                    <p className="helper">
                      Current calculated grades and distance from your own
                      targets.
                    </p>
                    <LabCourseChart
                      courses={courses}
                      selectedId={selectedId}
                      onSelect={select}
                      policy={state.policy}
                      presentation={prefs.chart}
                    />
                  </section>
                  <TrendsPanel
                    key={semester}
                    state={state}
                    semester={semester}
                    onSnapshot={snapshot}
                  />
                </>
              )}
              {view === "planner" && (
                <Planner
                  profile={profile}
                  onUpdate={updateProfile}
                  onCourse={setEditor}
                />
              )}
              {view === "academics" && (
                <Academics
                  profile={profile}
                  semester={semester}
                  onUpdate={updateProfile}
                />
              )}
              {view === "hac" && (
                <SchoolConnection profile={profile} onSync={syncSchool} />
              )}
              {view === "data" && (
                <DataTools
                  data={data}
                  profile={profile}
                  onChange={changeData}
                  onConnection={() => navigate("hac")}
                  onProfiles={() => setProfiles(true)}
                  notify={notify}
                />
              )}
            </motion.div>
            <footer className={styles.footer}>
              <span>
                gradelarp.<b>Your semester. Your perspective.</b>
              </span>
              <button onClick={() => navigate("data")}>
                Local-first · Backup your data
              </button>
            </footer>
          </main>
        </div>
        {editor && (
          <CourseEditor
            key={editor.id}
            initial={editor}
            onClose={() => setEditor(null)}
            onSave={(course) => {
              const next = {
                ...state,
                courses: state.courses.some((c) => c.id === course.id)
                  ? state.courses.map((c) => (c.id === course.id ? course : c))
                  : [...state.courses, course],
              };
              updateProfile({ ...profile, state: recordState(next) });
              setSemester(course.semester);
              setSelected(course.id);
              setEditor(null);
              notify("Course saved. Actual grades recalculated.");
            }}
            onDelete={() => {
              updateProfile({
                ...profile,
                state: recordState({
                  ...state,
                  courses: state.courses.filter((c) => c.id !== editor.id),
                }),
              });
              setEditor(null);
              notify("Course removed. Historical snapshots are retained.");
            }}
          />
        )}
        {appearance && (
          <Appearance
            profile={profile}
            semester={semester}
            onSave={(p) => {
              updateProfile(p);
              notify("Preferences saved.");
            }}
            onClose={() => setAppearance(false)}
          />
        )}
        {profiles && (
          <Profiles
            data={data}
            onChange={changeData}
            onClose={() => setProfiles(false)}
          />
        )}
        {deleteScenario && (
          <Confirm
            title="Delete saved scenario?"
            description="Only this hypothetical scenario will be removed. Your real grades are unchanged."
            onClose={() => setDeleteScenario(null)}
            onConfirm={() =>
              updateProfile({
                ...profile,
                scenarios: profile.scenarios.filter(
                  (s) => s.id !== deleteScenario,
                ),
              })
            }
          />
        )}
        {mobile && (
          <Dialog open onOpenChange={setMobile}>
            <DialogContent className="product-mobile-nav">
              <DialogTitle className="sr-only">
                Workspace navigation
              </DialogTitle>
              <DialogDescription className="sr-only">
                Choose an academic tool or manage your profile.
              </DialogDescription>
              {navigation}
            </DialogContent>
          </Dialog>
        )}
        {search && (
          <Dialog open onOpenChange={setSearch}>
            <DialogContent>
              <DialogTitle>Find your next move.</DialogTitle>
              <DialogDescription>
                Search all courses and academic tools. Shortcut: Control or
                Command + K.
              </DialogDescription>
              <input
                aria-label="Search workspace"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search courses or tools…"
              />
              <div className="product-search-results">
                {state.courses
                  .filter((c) =>
                    `${c.name} ${c.semester}`
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                  )
                  .map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSearch(false);
                        select(c.id);
                        setEditor(c);
                      }}
                    >
                      <BookOpen size={17} />
                      <span>
                        {c.name}
                        <small>{c.semester}</small>
                      </span>
                    </button>
                  ))}
                {pages
                  .filter((p) =>
                    p.name.toLowerCase().includes(query.toLowerCase()),
                  )
                  .map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSearch(false);
                        navigate(p.id);
                      }}
                    >
                      <p.icon size={17} />
                      {p.name}
                    </button>
                  ))}
              </div>
            </DialogContent>
          </Dialog>
        )}
        {message && (
          <div className="product-toast" role="status">
            <Check size={17} />
            <span>{message}</span>
            <button
              aria-label="Dismiss notification"
              onClick={() => setMessage("")}
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
function Brand() {
  return (
    <svg
      width="29"
      height="32"
      viewBox="0 0 29 32"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M23.5 7.5A11 11 0 0 0 5 15.5a10.5 10.5 0 0 0 18.5 6.8V16H14"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        d="M23.5 24v2a4 4 0 0 1-4 4H11"
        stroke="currentColor"
        strokeWidth="3"
      />
    </svg>
  );
}
