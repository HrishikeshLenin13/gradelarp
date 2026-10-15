import { NextRequest, NextResponse } from "next/server";
import { MockHacService, readCommand } from "../../../hac/server";
import { HacError } from "../../../hac/types";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const singleton = globalThis as typeof globalThis & {
  gradelarpMockHac?: MockHacService;
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
export async function POST(request: NextRequest) {
  let isConnect = false;
  try {
    const command = await readCommand(request);
    isConnect = command?.action === "connect";
    const { token, clearCookie, ...result } = (await service.handle(
      command,
      request.cookies.get(cookieName)?.value,
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local",
    )) as Awaited<ReturnType<LiveHacService["handle"]>> & {
      token?: string;
      clearCookie?: boolean;
    };
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
    const e =
      error instanceof HacError
        ? error
        : new HacError(
            "CONNECTOR_ERROR",
            "The HAC request did not complete. Saved grades are unchanged.",
            500,
          );
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
