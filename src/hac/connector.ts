import { load } from "cheerio";
import { HacError, type HacStage } from "./types";
import { atStage, connectionError } from "./errors";
import {
  DirectPortalTransport,
  normalizePortal,
  type PortalTransport,
} from "./transport";
import {
  challenge,
  clean,
  identity,
  loginForm,
  parseLiveAssignments,
} from "./live-parser";
import type { LiveSnapshot } from "./live-types";
export type PortalSession = {
  portal: string;
  studentId: string;
  studentName: string;
  transport: PortalTransport;
};
export type TransportFactory = (portal: string) => PortalTransport;
function checkInteractive(html: string) {
  if (challenge(html))
    throw new HacError(
      "INTERACTIVE_LOGIN",
      "Your district requires interactive verification or student selection. Open its official HAC portal to complete that step.",
      409,
    );
}
export function extractName(html: string) {
  const $ = load(html);
  // Selector priority matters: a combined selector uses document order, not
  // the priority of the explicit student-name field over generic menu spans.
  for (const selector of [
    "#plnMain_lblRegStudentName",
    ".sg-banner-menu-studentname",
    "[id$='_lblStudentName']",
  ]) {
    const name = clean($(selector).first().text()).replace(
      /^student\s*name\s*:?\s*/i,
      "",
    );
    if (name) return name;
  }
  const spans = $(".sg-banner-menu-container")
    .first()
    .find("span")
    .filter(
      (_, el) => $(el).find("span").length === 0 && clean($(el).text()) !== "",
    );
  return spans.length === 1
    ? clean(spans.first().text()).replace(/^student\s*name\s*:?\s*/i, "")
    : "";
}
export function buildLogin(
  html: string,
  pageUrl: string,
  portal: string,
  database?: string,
) {
  checkInteractive(html);
  const $ = load(html),
    password = $('input[name="LogOnDetails.Password"]');
  if (password.length !== 1)
    throw new HacError(
      "PORTAL_FORMAT",
      "This address did not return a supported HAC username/password sign-in form. SSO portals need their own adapter.",
      422,
    );
  const form = password.closest("form");
  if (
    form.length !== 1 ||
    form.attr("method")?.toLowerCase() !== "post" ||
    form.find('input[name="LogOnDetails.UserName"]').length !== 1
  )
    throw new HacError(
      "PORTAL_FORMAT",
      "The HAC sign-in form is not compatible.",
      422,
    );
  const action = new URL(form.attr("action") || pageUrl, pageUrl),
    origin = new URL(portal).origin;
  if (
    action.origin !== origin ||
    action.pathname.toLowerCase() !== "/homeaccess/account/logon" ||
    action.username ||
    action.password ||
    action.hash
  )
    throw new HacError(
      "LOGIN_DESTINATION",
      "The HAC form points outside the selected district portal. No credentials were sent.",
      422,
    );
  for (const [key, value] of action.searchParams) {
    if (
      key.toLowerCase() !== "returnurl" ||
      !value.toLowerCase().startsWith("/homeaccess") ||
      value.startsWith("//") ||
      value.includes("\\")
    )
      throw new HacError(
        "LOGIN_DESTINATION",
        "The portal supplied an unsupported login return address.",
        422,
      );
  }
  const fields = new URLSearchParams();
  form.find('input[type="hidden"][name]').each((_, el) => {
    const name = $(el).attr("name")!;
    if (!/password|username|tempun|temppw/i.test(name))
      fields.set(name, $(el).attr("value") ?? "");
  });
  const token = fields.get("__RequestVerificationToken");
  if (!token)
    throw new HacError(
      "PORTAL_FORMAT",
      "The portal did not provide its sign-in verification token. No credentials were sent.",
      422,
    );
  const options = form
    .find('select[name="Database"] option')
    .toArray()
    .map((el) => ({ id: $(el).attr("value") ?? "", name: clean($(el).text()) }))
    .filter((x) => x.id && x.id !== "0");
  if (options.length) {
    if (database && !options.some((o) => o.id === database))
      throw new HacError("DATABASE", "Select a valid district database.", 400);
    if (options.length > 1 && !database)
      throw new HacError(
        "DATABASE_REQUIRED",
        "This HAC portal has multiple district databases. Select yours before signing in.",
        409,
        { databases: options },
      );
    fields.set("Database", database ?? options[0].id);
  } else if (database && fields.get("Database") !== database)
    throw new HacError(
      "DATABASE",
      "The selected database does not match the district login form.",
      400,
    );
  return { action: action.href, fields };
}
export async function connectPortal(
  input: {
    portal: string;
    username: string;
    password: string;
    database?: string;
  },
  factory: TransportFactory = (portal) => new DirectPortalTransport(portal),
): Promise<{ connection: PortalSession; snapshot: LiveSnapshot }> {
  const portal = normalizePortal(input.portal),
    transport = factory(portal),
    signal = AbortSignal.timeout(40_000);
  let stage: HacStage = "login-page";
  try {
    const initial = await atStage("login-page", () =>
      transport.page(`${portal}/Account/LogOn`, { signal }),
    );
    const login = await atStage("login-page", async () =>
      buildLogin(initial.html, initial.url, portal, input.database),
    );
    login.fields.set("LogOnDetails.UserName", input.username);
    login.fields.set("LogOnDetails.Password", input.password);
    stage = "sign-in";
    let authenticated;
    try {
      authenticated = await atStage("sign-in", () =>
        transport.page(login.action, {
          body: login.fields,
          signal,
        }),
      );
    } finally {
      login.fields.delete("LogOnDetails.UserName");
      login.fields.delete("LogOnDetails.Password");
    }
    checkInteractive(authenticated.html);
    if (loginForm(authenticated.html))
      throw new HacError(
        "AUTH_FAILED",
        "HAC did not accept this sign-in. Check your district, username and password in the official portal before retrying.",
        401,
      );
    stage = "gradebook";
    const page = await atStage("gradebook", () =>
      transport.page(`${portal}/Content/Student/Assignments.aspx`, { signal }),
    );
    checkInteractive(page.html);
    if (loginForm(page.html))
      throw new HacError(
        "AUTH_FAILED",
        "HAC did not establish a signed-in session. Check your credentials or use the district’s required sign-in method.",
        401,
      );
    const $ = load(page.html),
      students = $("select[id*='Student'] option");
    if (students.length > 1)
      throw new HacError(
        "STUDENT_SELECTION",
        "This guardian account requires student selection. A compatible student-selection adapter is needed before importing its grades.",
        409,
      );
    stage = "student-identity";
    let studentName = extractName(page.html) || extractName(authenticated.html);
    if (!studentName) {
      const registration = await atStage("student-identity", () =>
        transport.page(`${portal}/Content/Student/Registration.aspx`, {
          signal,
        }),
      );
      checkInteractive(registration.html);
      studentName = extractName(registration.html);
    }
    if (
      !studentName ||
      /^(?:home access center|welcome|student)$/i.test(studentName)
    )
      throw new HacError(
        "STUDENT_IDENTITY",
        "The signed-in student could not be identified. No academic records were saved.",
        422,
      );
    const studentId = identity(
      `${portal}|${input.username.trim()}|${studentName}`,
    );
    stage = "parse-records";
    const snapshot = await atStage("parse-records", async () =>
      parseLiveAssignments(page.html, portal, studentName, studentId),
    );
    return {
      connection: { portal, studentId, studentName, transport },
      snapshot,
    };
  } catch (error) {
    await transport.destroy().catch(() => {});
    throw connectionError(error, stage);
  }
}
export async function refreshPortal(
  connection: PortalSession,
): Promise<LiveSnapshot> {
  const signal = AbortSignal.timeout(30_000);
  const page = await connection.transport.page(
    `${connection.portal}/Content/Student/Assignments.aspx`,
    { signal },
  );
  checkInteractive(page.html);
  if (loginForm(page.html))
    throw new HacError(
      "SESSION_EXPIRED",
      "Your HAC session ended. Sign in again; saved grades are unchanged.",
      401,
    );
  let name = extractName(page.html);
  if (!name) {
    const registration = await connection.transport.page(
      `${connection.portal}/Content/Student/Registration.aspx`,
      { signal },
    );
    checkInteractive(registration.html);
    if (loginForm(registration.html))
      throw new HacError(
        "SESSION_EXPIRED",
        "Your HAC session ended. Sign in again; saved grades are unchanged.",
        401,
      );
    name = extractName(registration.html);
  }
  if (!name)
    throw new HacError(
      "STUDENT_IDENTITY",
      "The selected student could not be verified on refresh. Saved grades are unchanged.",
      422,
    );
  if (name && name !== connection.studentName)
    throw new HacError(
      "STUDENT_MISMATCH",
      "HAC changed the selected student. Sign in again before importing another student’s grades.",
      409,
    );
  return parseLiveAssignments(
    page.html,
    connection.portal,
    connection.studentName,
    connection.studentId,
  );
}

/** Public form check only: no username/password is accepted or submitted. */
export async function probePortal(
  portalInput: string,
  factory: TransportFactory = (portal) => new DirectPortalTransport(portal),
) {
  const portal = normalizePortal(portalInput),
    transport = factory(portal);
  try {
    const page = await atStage("login-page", () =>
      transport.page(`${portal}/Account/LogOn`, {
        signal: AbortSignal.timeout(20_000),
      }),
    );
    await atStage("login-page", async () =>
      buildLogin(page.html, page.url, portal),
    );
    return { portal, ready: true as const };
  } finally {
    await transport.destroy();
  }
}
