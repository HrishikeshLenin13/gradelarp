import { randomBytes } from "node:crypto";
import { z } from "zod";
import { DistrictId, FixtureCase, HacError, type HacSession } from "./types";
import { fixtureHtml } from "./fixtures";
import { parseFixture } from "./parser";
const commandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("status") }).strict(),
  z
    .object({
      action: z.literal("connect"),
      mode: z.literal("mock"),
      district: DistrictId,
      scenario: z.enum(["normal", "auth-error"]).default("normal"),
    })
    .strict(),
  z
    .object({
      action: z.literal("sync"),
      district: DistrictId,
      scenario: FixtureCase,
    })
    .strict(),
  z.object({ action: z.literal("disconnect") }).strict(),
]);
const TTL = 30 * 60 * 1000;
/** Bounded, ephemeral mock sessions. A restart expires them; no credentials exist. */
export class MockHacService {
  private sessions = new Map<string, HacSession>();
  private attempts: number[] = [];
  constructor(private clock = () => Date.now()) {}
  private prune() {
    const now = this.clock();
    for (const [key, s] of this.sessions)
      if (Date.parse(s.expiresAt) <= now) this.sessions.delete(key);
    this.attempts = this.attempts.filter((t) => t > now - 60_000);
  }
  handle(raw: unknown, token?: string) {
    this.prune();
    const parsed = commandSchema.safeParse(raw);
    if (!parsed.success)
      throw new HacError(
        "REQUEST",
        "Use the mock connector controls. Live authentication and credential fields are disabled.",
        400,
      );
    const command = parsed.data;
    if (command.action === "disconnect") {
      if (token) this.sessions.delete(token);
      if (previous) await previous.connection.transport.destroy();
      return { session: null, clearCookie: true };
    }
    const key = createHash("sha256")
      .update(`${command.action}:${client}`)
      .digest("hex");
    const limit = this.attempts.get(key);
    const max = command.action === "connect" ? 5 : 30;
    if (limit && limit.count >= max)
      throw new HacError(
        "RATE_LIMIT",
        "Too many attempts. Wait a minute before trying again.",
        429,
      );
    if (
      this.active >= 10 ||
      this.sessions.size >= 200 ||
      (!limit && this.attempts.size >= 2000)
    )
      throw new HacError(
        "BUSY",
        "The connector is busy. Try again shortly.",
        503,
      );
    this.attempts.set(key, {
      count: (limit?.count ?? 0) + 1,
      until: limit?.until ?? now + 60_000,
    });
    this.active++;
    try {
      if (command.action === "connect") {
        const result = await connectPortal(command, this.factory);
        if (token) this.sessions.delete(token);
        if (previous) await previous.connection.transport.destroy();
        const next: LiveSession = {
          mode: "live",
          portal: result.connection.portal,
          studentId: result.connection.studentId,
          studentName: result.connection.studentName,
          expiresAt: new Date(this.clock() + TTL).toISOString(),
        };
        const newToken = randomBytes(32).toString("hex");
        this.sessions.set(newToken, {
          public: next,
          connection: result.connection,
        });
        return { session: next, snapshot: result.snapshot, token: newToken };
      }
      if (!previous)
        throw new HacError(
          "SESSION_EXPIRED",
          "Your HAC session ended. Sign in again; saved grades are unchanged.",
          401,
        );
      return {
        session: previous.public,
        snapshot: await refreshPortal(previous.connection),
      };
    } catch (error) {
      if (
        command.action === "sync" &&
        error instanceof HacError &&
        error.status === 401 &&
        token
      ) {
        this.sessions.delete(token);
        if (previous) await previous.connection.transport.destroy();
      }
      throw error;
    } finally {
      this.active--;
    }
  }
}
/** Only public request metadata is used. Body limit is enforced while streaming. */
export async function readCommand(request: Request) {
  const url = new URL(request.url);
  // Next dev/start binds 0.0.0.0 internally. Accept only known loopback Host
  // aliases for the local preview; never trust arbitrary forwarded headers.
  const host = request.headers.get("host");
  if (
    url.hostname === "0.0.0.0" &&
    host &&
    /^(localhost|127\.0\.0\.1|\[::1\]):(3000|3002)$/.test(host)
  )
    url.host = host;
  if (request.method !== "POST")
    throw new HacError("METHOD", "Use a same-origin POST request.", 405);
  if (url.search)
    throw new HacError("QUERY", "Query parameters are not accepted.", 400);
  if (
    request.headers.get("origin") !== url.origin ||
    (request.headers.get("sec-fetch-site") &&
      request.headers.get("sec-fetch-site") !== "same-origin")
  )
    throw new HacError(
      "ORIGIN",
      "The connector requires a same-origin request.",
      403,
    );
  if (
    url.protocol !== "https:" &&
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
  )
    throw new HacError("HTTPS", "HTTPS is required.", 403);
  if (
    request.headers.get("content-type")?.split(";")[0].trim() !==
    "application/json"
  )
    throw new HacError(
      "CONTENT_TYPE",
      "Send an application/json request.",
      415,
    );
  if (Number(request.headers.get("content-length") ?? 0) > 2048)
    throw new HacError("SIZE", "The connector request is too large.", 413);
  const reader = request.body?.getReader();
  if (!reader)
    throw new HacError("REQUEST", "A request body is required.", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.byteLength;
    if (size > 2048) {
      await reader.cancel();
      throw new HacError("SIZE", "The connector request is too large.", 413);
    }
    chunks.push(part.value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HacError(
      "REQUEST",
      "The connector request is invalid JSON.",
      400,
    );
  }
}
