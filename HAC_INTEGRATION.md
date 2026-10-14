# Gradelarp: HAC mock connector

## Try it locally

Open [Gradelarp](http://localhost:3000/) → **School connection** → search/select Leander ISD (LISD) or Round Rock ISD (RRISD) → **Connect mock student** → **Refresh preview** → **Import 2 courses**.

Imports create a clearly labeled, separate **HAC sandbox** profile. The existing Expressive dashboard, course editor, GPA calculator, what-if calculator, planner, history, profiles and backups work with those normalized courses. Switch profiles to return to your real/manual records. No credentials are requested; the backend makes no school-network requests. A server restart expires the mock session but does not erase imported browser data.

Use **Test fixture conditions** to preview an updated score, a partial response, a genuinely empty assignment table, an unrecognized page, a login failure or a wrong-district response. A failed request never applies grades. Refresh only stages a preview; a second, explicit action applies it. Disconnect revokes the temporary session, not your records. Removing or detaching an imported course is a separate confirmation.

## Source audit and implementation decision

The full source/endpoint/license findings and primary links are in [research/hac/SOURCE_AUDIT.md](research/hac/SOURCE_AUDIT.md).

- Go v2's centralized authentication/session boundary is the more useful architectural reference. Its concrete implementation logs credential-bearing form data on errors, accepts arbitrary destinations, and seven of nine data handlers hardcode Katy ISD paths. The audited commit is from August 2023; current LISD/RRISD compatibility is unverified.
- Python repeats authentication and holds credentials in a shared mutable global form dictionary. This contradicts a broad claim that all credential data is discarded after each request and can mix concurrent requests. Both public API styles accept credentials in query strings.
- Python includes BSD-3-Clause terms, including retained notices and non-endorsement. Go's pinned tracked tree contains no license grant; Python's license does not automatically cover Go. The Nextra footer is not an application-code license. Gradelarp copies neither implementation; these connector modules and synthetic fixtures are independently written.
- Both sources depend on brittle selectors and positional arrays. An empty/malformed page is not proof of a successful sync. Source-reported averages may include unpublished work, so they remain distinct from recalculated values.

## Module map

| Module | Responsibility |
|---|---|
| `src/hac/districts.ts` | Fixed district IDs, exact official-page-linked HTTPS hosts and path preflight; no arbitrary destination input |
| `src/hac/types.ts` | Zod command/response, session, source and import-provenance models |
| `src/hac/fixtures.ts` | Original synthetic HTML contract `gradelarp-hac-v1`, two districts, explicit stable IDs and failure variations |
| `src/hac/parser.ts` | Cheerio DOM extraction, bounded page size, identity/schema checks, normalization and partial-course errors |
| `src/hac/server.ts` | Ephemeral opaque mock sessions, expiry/rotation/revocation, request/size/origin/rate guards, fixture service |
| `src/app/api/hac/route.ts` | POST-only JSON API, HttpOnly/SameSite=Strict cookie, no-store responses, sanitized errors |
| `src/hac/sync.ts` | Explicit preview/apply, stable IDs, ownership tracking, idempotence, local-edit conflicts, detach/remove |
| `src/product/hac.tsx` | Expressive onboarding, searchable districts, connected/expired/error/partial states, preview and imported-record management |

`Profile.hac` is optional in the existing v2 backup schema. Existing profiles/backups load unchanged. A schema invariant requires HAC mock profiles to remain synthetic (`state.demo=true`). No access token or password enters IndexedDB, localStorage, app backups or source fixtures. The browser cookie contains only a random opaque mock-session identifier; server memory stores only its synthetic session metadata.

### Preservation rules

1. A manual profile is rejected as an import target. Other profiles are byte-preserved by the import operation.
2. Stable source course/assignment IDs make repeated import idempotent. Duplicate source IDs fail validation; display names are not identity keys.
3. Only a connector-owned course with the exact last-imported fingerprint is updated. Any local change—including manual assignments, grades, categories, target, level, or credits—marks a conflict and keeps the entire local course. The UI says **Keep local edits**. It does not silently resolve those conflicts.
4. A locally deleted course is not resurrected. **Keep as local copy** detaches ownership; **Remove imported course** removes that course and assignments. Both exclude the source from future imports. Saved what-if scenarios are never deleted; a removed/changed assignment can make a scenario stale, which the existing calculator reports.
5. A partial preview retains unavailable courses. Last applied preview and last complete, conflict-free import are separate timestamps. A no-change import adds no fabricated grade-history snapshot.
6. Transcript and rank values are preview-only synthetic references, not official records and not automatically added to cumulative GPA (avoids double-counting). Report cards, IPR and demographic endpoints were audited, not exposed as live imports.

## Security boundary actually implemented

- **No live transport or credential exchange exists.** Even a hand-crafted POST with `mode:"live"`, username/password fields, arbitrary URL fields or extra keys is rejected. All synthetic data comes from local fixture strings, not the hosted third-party API.
- `POST /api/hac` accepts only strict `status`, `connect`, `sync`, `disconnect` commands. GET returns 405; query parameters, cross-origin requests, non-JSON and oversized bodies are rejected. The streamed body is limited to 2 KiB, including without Content-Length.
- Exact Origin checking and SameSite=Strict cookies protect browser requests. Local Next.js binds to `0.0.0.0`, so only explicit loopback Host aliases on ports 3000/3002 are normalized; arbitrary forwarded headers are never trusted. Non-loopback cleartext requests are rejected.
- Cookie: HttpOnly, SameSite=Strict, path `/api/hac`, 30-minute lifetime, Secure on HTTPS. Loopback HTTP development uses a non-Secure cookie. Tokens rotate on reconnect and are revoked on disconnect/authentication failure; server memory is bounded to 512 sessions and 120 connect attempts/minute. These prototype-wide limits are not a production per-user abuse-control system.
- No credential/session logging was added. Returned errors are fixed messages, never raw source pages, exception stacks or tokens. Responses are private/no-store. A production ingress would also need URL/body redaction; this application alone cannot control upstream proxy logs.
- The SSRF surface is absent because the mock service makes **zero outbound requests**. The destination validator is a preflight, not a claim of complete future live SSRF protection. DNS/IP pinning, private/reserved-range rejection, redirect validation, timeouts and egress policies must be implemented before adding network transport.
- Cheerio 1.2.0 parses inert strings; no browser execution or resource loading is used. Unknown status/invalid points/incomplete tables are not guessed into grades. Current district HTML compatibility remains untested.

## Before enabling live authentication

1. Obtain district/provider approval and account/student consent for a specific supported data access route; prefer an official/delegated authorization API. Public login links do not establish authorization.
2. Obtain current sanitized non-sensitive HTML/contract samples and validate each district's selectors, identities, grade/status semantics, category weights, credits, term mappings, SSO/MFA and grade discrepancies.
3. Complete the live network, secret/session-store, CSRF, logging/retention/deletion, rate-limit, threat-model and security review. A permitted credential exchange would use a server POST body, never a query URL, with request-scoped credentials and no persistent plaintext storage.
4. Review current infrastructure and dependencies, deploy configuration, school policy mappings, provider terms and license provenance. Only then ask for the user's explicit approval of the security approach and a separately reviewed feature-gate change. No environment flag in this prototype activates real login.

No production login or deployment was enabled. The official LISD/RRISD host links have been verified from public district information pages; compatibility and provider authorization have not.

## Verification

Synthetic unit and browser fixtures cover normalization, empty/missing tables, malformed/oversized pages, invalid grades/statuses, duplicate identifiers/imports, partial sync, mismatch/auth errors, session expiry/rotation/revocation, credential/live-mode rejection, request-origin/body limits, sandbox isolation, local edits, scenario preservation and managed-record removal. Browser tests use isolated Chromium desktop/mobile contexts; no real student data is used.

The final observed commands, literal outputs, exit statuses, hashes and independent-copy rollback are recorded in `artifacts/hac-2026-10-14/VERIFICATION.txt` after the checks complete.

Dependency advisory check: the production-only audit reported **0 vulnerabilities** on this run. The full dependency tree reported **5 high-severity dev-toolchain entries** through the existing `eslint-config-next → fast-glob → micromatch → braces` chain (GHSA-vfj7-8cjw-p6xm); npm lists no current patched braces release. No forced Next.js downgrade was applied. The raw audit outputs are retained under the HAC artifacts directory. This is an advisory snapshot, not a security certification.
