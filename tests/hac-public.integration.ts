import { it, expect } from "vitest";
import { writeFileSync, mkdirSync } from "node:fs";
import { DirectPortalTransport } from "../src/hac/transport";
import { buildLogin } from "../src/hac/connector";
import { districts } from "../src/hac/districts";
const results: unknown[] = [];
for (const district of districts) {
  it(`GET-only public form preflight: ${district.name}`, async () => {
    const portal = `https://${district.host}/HomeAccess`,
      transport = new DirectPortalTransport(portal);
    try {
      const page = await transport.page(`${portal}/Account/LogOn`);
      const form = buildLogin(page.html, page.url, portal);
      expect(page.status).toBe(200);
      expect(new URL(form.action).origin).toBe(new URL(portal).origin);
      expect(form.fields.has("__RequestVerificationToken")).toBe(true);
      results.push({
        district: district.name,
        portal,
        httpStatus: page.status,
        formMethod: "POST",
        sameOriginAction: true,
        csrfFieldPresent: true,
        databaseFieldPresent: form.fields.has("Database"),
        credentialSubmissions: 0,
        authenticatedRecordsRequested: 0,
      });
      mkdirSync("artifacts/hac-live-2026-10-15", { recursive: true });
      writeFileSync(
        "artifacts/hac-live-2026-10-15/PUBLIC_PREFLIGHT.json",
        JSON.stringify(
          { checkedAt: new Date().toISOString(), results },
          null,
          2,
        ),
      );
    } finally {
      await transport.destroy();
    }
  });
}
