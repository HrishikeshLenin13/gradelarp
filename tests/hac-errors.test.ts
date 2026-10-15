import { describe, it, expect, vi } from "vitest";
import { connectionError } from "../src/hac/errors";
import { HacError, isHacError } from "../src/hac/types";
import { LiveHacService } from "../src/hac/server";
import { connectPortal, probePortal } from "../src/hac/connector";
import { LOGIN_HTML, gradebook } from "./fixtures/hac-pages";
import type { PortalTransport } from "../src/hac/transport";
const portal = "https://hac.example.edu/HomeAccess";
function transport() {
  return {
    page: vi.fn(async (url: string) => ({
      url,
      status: 200,
      html: LOGIN_HTML,
    })),
    destroy: vi.fn(async () => {}),
  } satisfies PortalTransport;
}
describe("observable HAC connections", () => {
  it.each([
    ["ENOTFOUND", "DNS", 502],
    ["EAI_AGAIN", "DNS", 502],
    ["ECONNRESET", "NETWORK", 502],
    ["CERT_HAS_EXPIRED", "TLS", 502],
    ["ETIMEDOUT", "TIMEOUT", 504],
  ])(
    "classifies %s without exposing upstream values",
    (code, expected, status) => {
      const error = connectionError(
        Object.assign(new Error("secret-cookie-password-url"), { code }),
        "login-page",
      );
      expect(error.code).toBe(expected);
      expect(error.status).toBe(status);
      expect(error.details?.stage).toBe("login-page");
      expect(JSON.stringify(error)).not.toContain("secret");
    },
  );
  it.each(["AbortError", "TimeoutError", "ZodError", "TypeError"])(
    "sanitizes %s",
    (name) => {
      const error = connectionError(
        Object.assign(new Error("private source data"), { name }),
        "parse-records",
      );
      expect(JSON.stringify(error)).not.toContain("private");
      expect(error.details?.stage).toBe("parse-records");
      if (name === "ZodError") expect(error.code).toBe("SOURCE_VALIDATION");
    },
  );
  it("preserves typed errors across module reloads but not arbitrary error-shaped objects", () => {
    const reloaded = Object.assign(new Error("Known form error"), {
      [Symbol.for("gradelarp.hac.error")]: true,
      code: "PORTAL_FORMAT",
      status: 422,
    });
    expect(isHacError(reloaded)).toBe(true);
    expect(connectionError(reloaded, "login-page").code).toBe("PORTAL_FORMAT");
    expect(
      isHacError({
        name: "HacError",
        code: "invented",
        message: "secret",
        status: 200,
      }),
    ).toBe(false);
    const typed = new HacError("TIMEOUT", "Try again", 504, {
      stage: "sign-in",
    });
    expect(connectionError(typed, "request").details?.stage).toBe("sign-in");
  });
  it("probes only the public form and destroys its temporary cookie jar", async () => {
    const t = transport();
    const service = new LiveHacService(() => t);
    expect(await service.handle({ action: "probe", portal })).toMatchObject({
      session: null,
      portalCheck: { portal, ready: true },
    });
    expect(t.page).toHaveBeenCalledTimes(1);
    expect(t.page.mock.calls[0][0]).toBe(portal + "/Account/LogOn");
    expect(t.destroy).toHaveBeenCalledTimes(1);
    await expect(
      service.handle({ action: "probe", portal, username: "private" }),
    ).rejects.toMatchObject({ code: "REQUEST" });
  });
  it("cleans up a failed public check", async () => {
    const t = transport();
    t.page.mockRejectedValue(
      Object.assign(new Error("private"), { code: "ENOTFOUND" }),
    );
    await expect(probePortal(portal, () => t)).rejects.toMatchObject({
      code: "DNS",
      details: { stage: "login-page" },
    });
    expect(t.destroy).toHaveBeenCalled();
  });
  it("marks the sign-in POST failure and discards credential fields", async () => {
    const t = transport();
    let posted: URLSearchParams | undefined;
    const original = t.page;
    const page: PortalTransport["page"] = async (url, options) => {
      if (options?.body) {
        posted = options.body;
        throw Object.assign(new Error("private"), { code: "ECONNRESET" });
      }
      return original(url);
    };
    await expect(
      connectPortal(
        { portal, username: "test-user", password: "test-secret" },
        () => ({ ...t, page }),
      ),
    ).rejects.toMatchObject({ code: "NETWORK", details: { stage: "sign-in" } });
    expect(posted?.has("LogOnDetails.UserName")).toBe(false);
    expect(posted?.has("LogOnDetails.Password")).toBe(false);
    expect(t.destroy).toHaveBeenCalled();
  });
  it("reports a source validation error at parse-records without returning student data", async () => {
    const t = transport();
    let n = 0;
    // Guarantee a schema violation via the verified name field, not guessed markup.
    const html = gradebook().replace("Test Student", "x".repeat(400));
    t.page.mockImplementation(async (url) => ({
      url,
      status: 200,
      html: ++n === 1 ? LOGIN_HTML : html,
    }));
    n = 0;
    await expect(
      connectPortal(
        { portal, username: "test-user", password: "test-secret" },
        () => t,
      ),
    ).rejects.toMatchObject({
      code: "SOURCE_VALIDATION",
      details: { stage: "parse-records" },
    });
  });
});
