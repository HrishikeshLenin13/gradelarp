"use client";
import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Beaker,
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Command,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  Menu,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { CourseEditor, newCourse } from "./course-editor";
import { SettingsDialog } from "./settings";
import {
  CoursesPanel,
  DataPanel,
  GpaPanel,
  TrendsPanel,
  WhatIfPanel,
} from "./panels";
import {
  ActivityWidget,
  CourseWidget,
  DistributionWidget,
  SortableWidget,
  SummaryCards,
  UpcomingWidget,
  upcoming,
} from "./widgets";
import { createDemo, emptyState } from "@/lib/demo";
import { provider } from "@/lib/persistence";
import {
  StateSchema,
  type AppState,
  type Course,
  type Widget,
} from "@/lib/model";
import { snapshotScores } from "@/lib/calculations";
import { cn } from "@/lib/utils";
export const APP_NAME = "gradelarp";
type Page = "overview" | "courses" | "whatif" | "gpa" | "trends" | "data";
const pages = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "courses", label: "My courses", icon: BookOpen },
  { id: "whatif", label: "What-if lab", icon: Beaker },
  { id: "gpa", label: "GPA planner", icon: GraduationCap },
  { id: "trends", label: "Grade trends", icon: TrendingUp },
  { id: "data", label: "Data & import", icon: ArrowDownToLine },
] as const;
const subtitles: Record<Page, string> = {
  overview: "A little clarity. A lot of potential.",
  courses: "All the details. One clear picture.",
  whatif: "Less guesswork. More possibilities.",
  gpa: "Put your effort in perspective.",
  trends: "Small steps. Meaningful progress.",
  data: "Your grades. Always your data.",
};
export function Gradelarp() {
  const [state, setState] = useState<AppState | null>(null);
  const [loadError, setLoadError] = useState("");
  const [saveStatus, setSaveStatus] = useState("Saved on this device");
  const [page, setPage] = useState<Page>("overview");
  const [semester, setSemester] = useState("Fall 2026");
  const [editor, setEditor] = useState<Course | null>(null);
  const [customize, setCustomize] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [help, setHelp] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [toast, setToast] = useState("");
  const [retry, setRetry] = useState(0);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const saveRevision = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigation = useRef<HTMLButtonElement | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 7 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      scrollBehavior: "auto",
    }),
  );
  useEffect(() => {
    let alive = true;
    provider
      .load()
      .then((value) => {
        if (!alive) return;
        const initial = value ?? createDemo();
        setState(initial);
        if (initial.courses[0]) setSemester(initial.courses[0].semester);
      })
      .catch(() => {
        if (alive)
          setLoadError(
            "Your workspace could not be loaded. Browser storage may be unavailable or the saved data needs recovery.",
          );
      });
    return () => {
      alive = false;
    };
  }, [retry]);
  useEffect(() => {
    if (!state) return;
    document.documentElement.dataset.theme = state.settings.theme;
    document.documentElement.dataset.accent = state.settings.accent;
  }, [state]);
  useEffect(() => {
    if (!state) return;
    const revision = ++saveRevision.current;
    queue.current = queue.current
      .catch(() => {})
      .then(() => provider.save(state))
      .then(() => {
        if (revision === saveRevision.current)
          setSaveStatus("Saved on this device");
      })
      .catch(() => {
        if (revision === saveRevision.current)
          setSaveStatus("Not saved — export a backup");
      });
  }, [state]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearch((v) => !v);
      }
      if (e.key === "Escape") setMobile(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  function notify(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4500);
  }
  function navigate(next: Page) {
    setPage(next);
    setMobile(false);
    setSearch(false);
    setNotifications(false);
  }
  function commit(next: AppState, message?: string) {
    const parsed = StateSchema.safeParse(next);
    if (!parsed.success) {
      notify(`Check your data: ${parsed.error.issues[0].message}`);
      return;
    }
    setSaveStatus("Saving locally…");
    setState(parsed.data);
    if (message) notify(message);
  }
  function record(next: AppState, selectedSemester = semester) {
    const courses = next.courses.filter((c) => c.semester === selectedSemester);
    return {
      ...next,
      snapshots: [
        ...next.snapshots,
        {
          at: new Date().toISOString(),
          semester: selectedSemester,
          ...snapshotScores(courses),
        },
      ].slice(-5000),
    };
  }
  function saveCourse(course: Course) {
    if (!state) return;
    const exists = state.courses.some((c) => c.id === course.id);
    let next = {
      ...state,
      courses: exists
        ? state.courses.map((c) => (c.id === course.id ? course : c))
        : [...state.courses, course],
    };
    next = record(next, course.semester);
    commit(
      next,
      exists
        ? "Course updated. A real grade snapshot was recorded."
        : "Your course is ready.",
    );
    setSemester(course.semester);
    setEditor(null);
  }
  function reorder(event: DragEndEvent) {
    if (!state || !event.over || event.active.id === event.over.id) return;
    const order = state.settings.order;
    commit({
      ...state,
      settings: {
        ...state.settings,
        order: arrayMove(
          order,
          order.indexOf(event.active.id as Widget),
          order.indexOf(event.over.id as Widget),
        ),
      },
    });
  }
  if (!state)
    return (
      <div className="loading-page">
        <div className="brand">
          <GraduationCap />
          {APP_NAME}
          <span className="brand-period">.</span>
        </div>
        {loadError ? (
          <>
            <p role="alert">{loadError}</p>
            <div className="flex">
              <Button
                onClick={() => {
                  setLoadError("");
                  setRetry((v) => v + 1);
                }}
              >
                Retry loading
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setState(createDemo());
                  setLoadError("");
                }}
              >
                Open demo workspace
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="loading-bar" />
            <p>Making a little room for clarity…</p>
          </>
        )}
      </div>
    );
  const courses = state.courses.filter((c) => c.semester === semester);
  const semesters = [...new Set(state.courses.map((c) => c.semester))];
  if (!semesters.includes(semester)) semesters.push(semester);
  const visible = state.settings.order.filter((w) =>
    state.settings.widgets.includes(w),
  );
  const label = pages.find((p) => p.id === page)?.label;
  const calendarLabel = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const addCourse = () => setEditor(newCourse(semester));
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{
        duration:
          state.settings.motion === "none"
            ? 0
            : state.settings.motion === "full"
              ? 0.4
              : 0.2,
      }}
    >
      <div
        className={cn(
          "app",
          state.settings.theme,
          `accent-${state.settings.accent}`,
          `density-${state.settings.density}`,
          `layout-${state.settings.layout}`,
          state.settings.motion === "none" && "no-motion",
        )}
      >
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        {mobile && (
          <button
            className="sidebar-scrim"
            aria-label="Close navigation"
            onClick={() => {
              setMobile(false);
              navigation.current?.focus();
            }}
          />
        )}
        <aside
          className={cn("sidebar", mobile && "mobile-open")}
          aria-label="Main navigation"
        >
          <button
            className="brand"
            onClick={() => navigate("overview")}
            aria-label="gradelarp home"
          >
            <div className="brand-mark">
              <GraduationCap size={23} />
            </div>
            {APP_NAME}
            <span className="brand-period">.</span>
          </button>
          <button className="workspace-switch" onClick={() => setHelp(true)}>
            <div className="workspace-icon">A</div>
            <div>
              <strong>My workspace</strong>
              <span>Personal · Free forever</span>
            </div>
            <ChevronDown size={14} />
          </button>
          <div className="nav-label">YOUR WORKSPACE</div>
          <nav>
            {pages.slice(0, 5).map((p) => (
              <button
                key={p.id}
                className={cn("nav-item", page === p.id && "active")}
                aria-current={page === p.id ? "page" : undefined}
                onClick={() => navigate(p.id)}
              >
                <p.icon size={18} />
                <span>{p.label}</span>
                {p.id === "courses" && (
                  <span className="nav-count">{courses.length}</span>
                )}
                {p.id === "whatif" && <span className="new-tag">LAB</span>}
              </button>
            ))}
          </nav>
          <div className="nav-divider" />
          <button
            className={cn("nav-item", page === "data" && "active")}
            onClick={() => navigate("data")}
          >
            <ArrowDownToLine size={18} />
            <span>Data & import</span>
          </button>
          <button className="nav-item" onClick={() => setCustomize(true)}>
            <Settings2 size={18} />
            <span>Preferences</span>
          </button>
          <div className="sidebar-spacer" />
          <div className="sidebar-note">
            <Sparkles size={19} className="accent-text" />
            <h4>
              A little “what if?”
              <br />A whole lot of possibility.
            </h4>
            <p>
              See what your next score
              <br />
              could do for your grade.
            </p>
            <button onClick={() => navigate("whatif")}>
              Explore the lab
              <ArrowUpRight size={14} />
            </button>
          </div>
          <button className="help-link" onClick={() => setHelp(true)}>
            <HelpCircle size={16} />A little help
            <ArrowUpRight size={14} />
          </button>
          <div className="profile">
            <div className="avatar">
              {state.settings.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <strong>{state.settings.name}</strong>
              <span>Student workspace</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Edit preferences"
              onClick={() => setCustomize(true)}
            >
              <Settings2 size={16} />
            </Button>
          </div>
        </aside>
        <div className="main-shell">
          <header className="topbar">
            <div className="breadcrumb">
              <Button
                ref={navigation}
                variant="ghost"
                size="icon"
                className="mobile-menu"
                aria-label="Open navigation"
                aria-expanded={mobile}
                onClick={() => setMobile(!mobile)}
              >
                <Menu size={20} />
              </Button>
              <span>Workspace</span>
              <ChevronRight size={12} />
              <strong>{label}</strong>
            </div>
            <div className="topbar-right">
              <button
                aria-label="Search workspace"
                title="Search courses and tools (Ctrl/⌘ + K)"
                className="search-trigger"
                onClick={() => {
                  setSearch(true);
                  setSearchText("");
                }}
              >
                <Search size={15} />
                <span>Search anything...</span>
                <kbd>
                  <Command size={10} />K
                </kbd>
              </button>
              <span
                className={cn(
                  "save-state",
                  saveStatus.includes("Not saved") && "amber-text",
                )}
              >
                <span className="status-dot" />
                {saveStatus}
              </span>
              <button
                className="notification-button"
                onClick={() => setNotifications(true)}
                title="Your next assignments"
                aria-label="Upcoming assignments"
              >
                <Bell size={18} />
                {upcoming(courses).length > 0 && <i />}
              </button>
            </div>
          </header>
          <main id="main-content" tabIndex={-1}>
            <div className="page-heading">
              <div>
                <div className="eyebrow">
                  <span className="status-dot" />
                  YOUR GRADES, IN PERSPECTIVE
                </div>
                <h1>
                  {page === "overview" ? (
                    <>
                      Let’s make this semester <span>yours.</span>
                    </>
                  ) : (
                    label
                  )}
                </h1>
                <p>{subtitles[page]}</p>
              </div>
              <div className="heading-actions">
                <label className="semester-select">
                  <span className="sr-only">Semester</span>
                  <select
                    aria-label="Select semester"
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                  >
                    {semesters.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} />
                </label>
                {page === "overview" ? (
                  <Button variant="outline" onClick={() => setCustomize(true)}>
                    <SlidersHorizontal size={15} />
                    Customize
                  </Button>
                ) : page === "courses" ? null : (
                  <span className="header-date">{calendarLabel}</span>
                )}
              </div>
            </div>
            {state.demo && (
              <div className="demo-banner">
                <div>
                  <Beaker size={15} />
                  <span>
                    You’re exploring <strong>demo data.</strong> A little
                    preview of what’s possible.
                  </span>
                </div>
                <button onClick={() => navigate("data")}>
                  Make it yours
                  <ArrowRight size={13} />
                </button>
              </div>
            )}
            <AnimatePresence mode="wait">
              <motion.div
                className="page-content"
                data-page={page}
                key={page}
                initial={
                  state.settings.motion === "none"
                    ? false
                    : { opacity: 0, y: 5 }
                }
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {page === "overview" && (
                  <>
                    <SummaryCards
                      courses={courses}
                      policy={state.policy}
                      settings={state.settings}
                    />
                    <div className="section-heading">
                      <div>
                        <h2>The big picture</h2>
                        <span>Stay close to what matters.</span>
                      </div>
                      <span className="tiny-label">
                        <ShieldCheck size={12} />
                        PRIVATE BY DESIGN
                      </span>
                    </div>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={reorder}
                    >
                      <SortableContext
                        items={visible}
                        strategy={rectSortingStrategy}
                      >
                        <div className="dashboard-grid">
                          {visible.map((widget) => (
                            <SortableWidget id={widget} key={widget}>
                              {widget === "courses" ? (
                                <CourseWidget
                                  courses={courses}
                                  policy={state.policy}
                                  onOpen={setEditor}
                                  onView={() => navigate("courses")}
                                  onAdd={addCourse}
                                />
                              ) : widget === "distribution" ? (
                                <DistributionWidget
                                  courses={courses}
                                  policy={state.policy}
                                  settings={state.settings}
                                />
                              ) : widget === "upcoming" ? (
                                <UpcomingWidget
                                  courses={courses}
                                  onOpen={setEditor}
                                  onLab={() => navigate("whatif")}
                                />
                              ) : (
                                <ActivityWidget
                                  state={state}
                                  courses={courses}
                                  onOpen={setEditor}
                                />
                              )}
                            </SortableWidget>
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                    {!visible.length && (
                      <div className="panel empty-state">
                        <SlidersHorizontal />
                        <h3>A blank canvas, on purpose.</h3>
                        <p>Choose the widgets you want to see.</p>
                        <Button onClick={() => setCustomize(true)}>
                          Choose widgets
                        </Button>
                      </div>
                    )}
                    <div className="dashboard-bottom">
                      <div className="flex">
                        <Sparkles size={16} />
                        <span>
                          You’re more than a number. We’re just here to help you
                          see it clearly.
                        </span>
                      </div>
                      <button onClick={() => navigate("whatif")}>
                        Find your next step
                        <ArrowUpRight size={15} />
                      </button>
                    </div>
                  </>
                )}
                {page === "courses" && (
                  <CoursesPanel
                    courses={courses}
                    policy={state.policy}
                    onOpen={setEditor}
                    onAdd={addCourse}
                  />
                )}
                {page === "whatif" && <WhatIfPanel courses={courses} />}
                {page === "gpa" && (
                  <GpaPanel
                    courses={courses}
                    policy={state.policy}
                    onPolicy={(policy) =>
                      commit(
                        { ...state, policy },
                        "Your grading policy was updated.",
                      )
                    }
                  />
                )}
                {page === "trends" && (
                  <TrendsPanel
                    state={state}
                    semester={semester}
                    onSnapshot={() =>
                      commit(
                        record(state),
                        "Current grades captured. No invented history.",
                      )
                    }
                  />
                )}
                {page === "data" && (
                  <DataPanel
                    state={state}
                    onImport={(next) => {
                      commit(next, "Your data was imported.");
                      if (next.courses[0])
                        setSemester(next.courses[0].semester);
                    }}
                    onClear={() => {
                      commit(
                        emptyState(),
                        "Fresh start. Your workspace data has been cleared.",
                      );
                      setSemester("Fall 2026");
                    }}
                    onDemo={() =>
                      commit(
                        emptyState(),
                        "Sample workspace loaded. This is demo data.",
                      )
                    }
                    notify={notify}
                  />
                )}
              </motion.div>
            </AnimatePresence>
            <footer className="app-footer">
              <span>
                {APP_NAME}
                <b>.</b> <span>A little clarity goes a long way.</span>
              </span>
              <span>
                <ShieldCheck size={12} />
                Local-first. Student-first.
              </span>
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
                record(
                  {
                    ...state,
                    courses: state.courses.filter((c) => c.id !== editor.id),
                  },
                  editor.semester,
                ),
                "Course deleted.",
              );
              setEditor(null);
            }}
          />
        )}
        {customize && (
          <SettingsDialog
            initial={state.settings}
            onChange={(settings) => {
              commit(
                { ...state, settings },
                "Made it yours. Preferences saved.",
              );
              setCustomize(false);
            }}
            onClose={() => setCustomize(false)}
          />
        )}
        <Dialog open={search} onOpenChange={setSearch}>
          <DialogContent className="search-dialog">
            <DialogTitle className="sr-only">Search your workspace</DialogTitle>
            <DialogDescription className="sr-only">
              Find courses and navigate to tools.
            </DialogDescription>
            <div className="search-input">
              <Search size={19} />
              <input
                autoFocus
                placeholder="Where would you like to go?"
                aria-label="Search workspace"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
              <kbd>ESC</kbd>
            </div>
            <div className="search-results">
              <span className="tiny-label">PAGES & TOOLS</span>
              {pages
                .filter((p) =>
                  p.label.toLowerCase().includes(searchText.toLowerCase()),
                )
                .map((p) => (
                  <button key={p.id} onClick={() => navigate(p.id)}>
                    <p.icon size={17} />
                    {p.label}
                    <ArrowUpRight size={14} />
                  </button>
                ))}
              <span className="tiny-label">COURSES</span>
              {state.courses
                .filter((c) =>
                  c.name.toLowerCase().includes(searchText.toLowerCase()),
                )
                .map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSearch(false);
                      setEditor(c);
                    }}
                  >
                    <BookOpen size={17} />
                    {c.name}
                    <small>{c.semester}</small>
                  </button>
                ))}
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={notifications} onOpenChange={setNotifications}>
          <DialogContent>
            <DialogTitle>A little heads-up.</DialogTitle>
            <DialogDescription>
              Upcoming assignments from your entered data.
            </DialogDescription>
            <div className="notification-list">
              {upcoming(courses).map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    setNotifications(false);
                    setEditor(a.course);
                  }}
                >
                  <span
                    className="color-dot"
                    style={{ background: a.course.color }}
                  />
                  <div>
                    <strong>{a.name}</strong>
                    <small>{a.course.name}</small>
                  </div>
                  <span>
                    {new Date(a.due + "T12:00:00").toLocaleDateString(
                      undefined,
                      { month: "short", day: "numeric" },
                    )}
                  </span>
                </button>
              ))}
              {!upcoming(courses).length && (
                <p className="empty-state">
                  Nothing coming up. Enjoy a little breathing room.
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={help} onOpenChange={setHelp}>
          <DialogContent>
            <div className="dialog-heading">
              <GraduationCap className="accent-text" size={28} />
              <div>
                <DialogTitle>Welcome to your little big picture.</DialogTitle>
                <DialogDescription>
                  {APP_NAME} is your free, personal grade workspace.
                </DialogDescription>
              </div>
            </div>
            <div className="help-steps">
              <div>
                <b>01</b>
                <section>
                  <h4>Make it yours.</h4>
                  <p>
                    Clear the labeled demo data, add your courses, or import a
                    CSV. The template is in Data & import.
                  </p>
                </section>
              </div>
              <div>
                <b>02</b>
                <section>
                  <h4>Keep the numbers honest.</h4>
                  <p>
                    Set category weights and credits. Missing assignments count
                    as zero; ungraded, exempt, and dropped work doesn’t count.
                  </p>
                </section>
              </div>
              <div>
                <b>03</b>
                <section>
                  <h4>Look ahead, not just back.</h4>
                  <p>
                    Try the what-if lab, customize your GPA scale, and track
                    real snapshots as you update grades.
                  </p>
                </section>
              </div>
              <div>
                <b>04</b>
                <section>
                  <h4>Your data belongs to you.</h4>
                  <p>
                    Everything is stored locally in this browser. Export regular
                    backups. There is no school connection or official GPA
                    claim.
                  </p>
                </section>
              </div>
            </div>
            <div className="dialog-footer">
              <span className="helper">
                <Command size={12} />K opens workspace search.
              </span>
              <Button
                onClick={() => {
                  setHelp(false);
                  navigate("data");
                }}
              >
                Make it yours
                <ArrowRight size={15} />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <AnimatePresence>
          {toast && (
            <motion.div
              className="toast"
              role="status"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
            >
              <Check size={16} />
              <span>{toast}</span>
              <button aria-label="Dismiss message" onClick={() => setToast("")}>
                <X size={15} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
