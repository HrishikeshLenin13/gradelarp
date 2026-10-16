/** Public destinations shared by the website and the local academic workspace. */
export const workspaceViews = [
  "overview",
  "courses",
  "whatif",
  "gpa",
  "trends",
  "planner",
  "academics",
  "hac",
  "data",
] as const;
export type WorkspaceView = (typeof workspaceViews)[number];
export const workspaceShortcuts = [
  { view: "courses", label: "Grades" },
  { view: "whatif", label: "What-if calculator" },
  { view: "gpa", label: "GPA planner" },
  { view: "planner", label: "Assignment planner" },
] as const;
export function workspaceViewFromHash(hash: string): WorkspaceView {
  const candidate = hash.startsWith("#") ? hash.slice(1) : hash;
  return workspaceViews.find((view) => view === candidate) ?? "overview";
}
export function workspaceHref(view: WorkspaceView) {
  return view === "overview" ? "/app" : `/app#${view}`;
}
const navigationEvent = "gradelarp:workspace-navigation";
export function readWorkspaceView(): WorkspaceView {
  return workspaceViewFromHash(window.location.hash);
}
export function initialWorkspaceView(): WorkspaceView {
  return "overview";
}
export function subscribeWorkspaceView(listener: () => void) {
  window.addEventListener("hashchange", listener);
  window.addEventListener("popstate", listener);
  window.addEventListener(navigationEvent, listener);
  return () => {
    window.removeEventListener("hashchange", listener);
    window.removeEventListener("popstate", listener);
    window.removeEventListener(navigationEvent, listener);
  };
}
export function navigateWorkspace(view: WorkspaceView) {
  const hash = view === "overview" ? "" : `#${view}`;
  if (window.location.hash === hash) return;
  window.history.pushState(
    null,
    "",
    `${window.location.pathname}${window.location.search}${hash}`,
  );
  window.dispatchEvent(new Event(navigationEvent));
}
