import { NextRequest, NextResponse } from "next/server";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { LiveHacService, readCommand } from "../../../hac/server";
import { connectionError } from "../../../hac/errors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const singleton = globalThis as typeof globalThis & {
  gradelarpLiveHac?: LiveHacService;
};
const service =
  singleton.gradelarpLiveHac instanceof LiveHacService
    ? singleton.gradelarpLiveHac
    : (singleton.gradelarpLiveHac = new LiveHacService());
const cookieName = "gradelarp-hac-session";
const headers = {
  "Cache-Control": "no-store, private",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};
function recordDiagnostic(value: {
  code: string;
  stage?: string;
  validation?: string[];
}) {
  if (process.env.NODE_ENV !== "development") return;
  try {
    writeFileSync(
      join(process.cwd(), ".next", "hac-validation-diagnostic.json"),
      JSON.stringify(value),
    );
  } catch {
    /* Diagnostic metadata must not affect a sign-in response. */
  }
}
export async function POST(request: NextRequest) {
  let isConnect = false;
  let action: string | undefined;
  try {
    const command = await readCommand(request);
    action = command?.action;
    isConnect = action === "connect";
    const { token, clearCookie, ...result } = (await service.handle(
      command,
      request.cookies.get(cookieName)?.value,
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local",
    )) as Awaited<ReturnType<LiveHacService["handle"]>> & {
      token?: string;
      clearCookie?: boolean;
    };
    if (result.snapshot)
      recordDiagnostic({ code: "SYNC_OK", stage: "complete" });
    const response = NextResponse.json(result, { headers });
    if (token || clearCookie)
      response.cookies.set(cookieName, token ?? "", {
        httpOnly: true,
        secure: request.nextUrl.protocol === "https:",
        sameSite: "strict",
        path: "/api/hac",
        maxAge: token ? 1800 : 0,
      });
    return response;
  } catch (error) {
    const e = connectionError(error, "request");
    if (action === "connect" || action === "sync")
      recordDiagnostic({
        code: e.code,
        stage: e.details?.stage,
        ...(e.details?.validation ? { validation: e.details.validation } : {}),
      });
    const response = NextResponse.json(
      {
        error: {
          code: e.code,
          message: e.message,
          ...(e.details ? { details: e.details } : {}),
        },
      },
      { status: e.status, headers },
    );
    if (e.status === 401 && !isConnect)
      response.cookies.set(cookieName, "", {
        httpOnly: true,
        secure: request.nextUrl.protocol === "https:",
        sameSite: "strict",
        path: "/api/hac",
        maxAge: 0,
      });
    return response;
  }
}
export function GET() {
  return NextResponse.json(
    {
      error: {
        code: "METHOD",
        message: "GET requests are disabled. Use the HAC sign-in form.",
      },
    },
    { status: 405, headers: { ...headers, Allow: "POST" } },
  );
}
