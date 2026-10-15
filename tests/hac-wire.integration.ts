import { it, expect } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { DirectPortalTransport } from "../src/hac/transport";
import { buildLogin } from "../src/hac/connector";
import { loginForm } from "../src/hac/live-parser";
import { districts } from "../src/hac/districts";
const results: unknown[] = [];
for (const district of districts) {
  it(`real public form POST with EMPTY account fields: ${district.name}`, async () => {
    const portal = `https://${district.host}/HomeAccess`,
      transport = new DirectPortalTransport(portal);
    try {
      const initial = await transport.page(`${portal}/Account/LogOn`);
      const form = buildLogin(initial.html, initial.url, portal);
      form.fields.set("LogOnDetails.UserName", "");
      form.fields.set("LogOnDetails.Password", "");
      const response = await transport.page(form.action, { body: form.fields });
      expect(response.status).toBe(200);
      expect(loginForm(response.html)).toBe(true);
      results.push({
        district: district.name,
        publicGet: initial.status,
        emptyFormPost: response.status,
        loginFormStillPresent: true,
        accountCredentialsSubmitted: 0,
        authenticatedRecordsRequested: 0,
      });
      mkdirSync("artifacts/hac-login-fix-2026-10-15", { recursive: true });
      writeFileSync(
        "artifacts/hac-login-fix-2026-10-15/WIRE_CHECK.json",
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
