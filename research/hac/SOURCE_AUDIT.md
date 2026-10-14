# Home Access Center source audit for Gradelarp

**Recorded:** 2026-10-14, 21:24 UTC. **Method:** static inspection of two shallow public Git clones plus public documentation/district information pages. No repository code was executed, dependencies installed, account authenticated, or school account data requested. This audit describes source behavior, not a successful live integration.

## 1. Pinned evidence and licensing observations

| Reference | Exact inspected commit | Commit date | Observed license evidence |
|---|---|---|---|
| [Go v2 repository](https://github.com/nitheesh-cpu/HomeAccessCenterAPIv2/tree/f2f1af34ca45ab6766e58c2797b5a9c7ab3be255) | `f2f1af34ca45ab6766e58c2797b5a9c7ab3be255` | 2023-08-08 11:58:12 -05:00 | The entire tracked tree has six files and no LICENSE/COPYING/NOTICE file. README has no licensing grant. |
| [Python repository](https://github.com/nitheesh-cpu/HomeAccessCenterAPI/tree/76c5176fb5aa3d9a37c028c446ffae955559685f) | `76c5176fb5aa3d9a37c028c446ffae955559685f` | 2023-05-30 00:21:51 -05:00 | [LICENSE](https://github.com/nitheesh-cpu/HomeAccessCenterAPI/blob/76c5176fb5aa3d9a37c028c446ffae955559685f/LICENSE) is BSD 3-Clause, copyright 2021 BBing; source/binary notice retention, non-endorsement, and disclaimer conditions are present. |

The Python file is observed license evidence, not proof that every upstream contribution or dependency has been cleared for a particular product. It does not grant rights to the separately published Go repository. The docs site's Nextra/MIT footer is not a license for the Go source. Gradelarp should use independently implemented adapters/fixtures; any future copying requires a separate provenance and license review. No third-party source was copied into app code by this audit.

Local unchanged research copies are `research/hac/v2` and `research/hac/python`. Source SHA-256:

- `v2/api/entrypoint.go`: `febf05c3f1e7b1de6cf3f0c3927bdd8daab0172630157530aa2508294a4647d6`
- `python/api/index.py`: `666b61f6ae1657ac58b1624b72835f6081f96a2861ee1a93cc76a0ab1e0beb17`
- `python/LICENSE`: `2acbbc29811a7527c51aeb3044b24eb9350ea1ccfa1d76b52be50f6d29cf6b8f`

Both clones had clean `git status --short` after inspection. No claim is made about the hosted API's deployment commit, uptime, or present compatibility.

## 2. Architecture and API contracts

### Go v2

A single `api/entrypoint.go` contains a Gin app, nine data routes, centralized login, and Colly/goquery parsing. A Vercel rewrite forwards all routes to that handler. The centralized login function creates a new collector, reads an anti-forgery input, submits a form, and returns the collector for the endpoint's page request. Form fields include a fixed database identifier and two fixed customization flags. Upstream cookie state is delegated to Colly; the code does not serialize a session cookie to the API caller. Each endpoint starts a fresh upstream login rather than using an application-owned session across API calls. [Route setup and login](https://github.com/nitheesh-cpu/HomeAccessCenterAPIv2/blob/f2f1af34ca45ab6766e58c2797b5a9c7ab3be255/api/entrypoint.go#L19-L136)

The architectural idea of one authentication/session boundary shared by parsers is more useful than Python's repeated login blocks. It is still not a production-ready module: source and response models are tightly coupled, raw strings dominate, and the same file handles transport, auth, parsing, logging, and HTTP responses.

### Python

One Flask file duplicates the login/page-fetch sequence for each data function. Each function creates a `requests.Session`, reads an anti-forgery field, posts form data, and fetches a page for BeautifulSoup/lxml parsing. Session cookies stay with that request-local `Session`, but the **credential/form dictionary itself is global and shared**. The Python code generally constructs all page URLs from the supplied base URL, unlike most Go handlers. [Representative flow](https://github.com/nitheesh-cpu/HomeAccessCenterAPI/blob/76c5176fb5aa3d9a37c028c446ffae955559685f/api/index.py#L9-L94)

### Observed response shapes (not a recommended Gradelarp contract)

All data routes are under `/api`. Values below are structural types, not real student data.

| Endpoint | Go response | Python response / important difference |
|---|---|---|
| `name` | `{name: string}` | Same envelope. |
| `classes` | `string[]` | `{classes: string[]}`; docs illustrate Python's envelope rather than Go's bare array. |
| `averages` | `{[courseName]: string}` | Same general structure; scores remain strings. |
| `assignments` | `{[courseName]: {average: string, assignments: string[][], categories: string[][]}}` | Same general shape. Python has an optional class query filter; Go does not implement that filter. Rows are positional table cells, not typed assignment objects. |
| `info` | String fields `name`, `grade`, `school`, `dob`, `counselor`, `language`, `cohort-year` | Python misspells `councelor`. Most of this personal data is unnecessary for grade import. |
| `reportcard` | `{headers: string[], data: string[][]}` | Same broad shape; both depend on a fixed column layout. |
| `ipr` | `{headers: string[], data: string[][]}` or `null` | Empty data becomes a `success:false` response at the Python route layer. |
| `transcript` | Dynamic year/semester keys with `year`, `semester`, `grade`, `school`, `data`, `credits`, plus dynamic GPA labels, `rank`, `quartile` | Similar semester blocks; Python uses `Rank` and a specific numbered DOM ID for the rank. |
| `rank` | Dynamic GPA labels plus `rank` and `quartile` when found | `{rank: string}` only. |

Primary code: [Go handlers, lines 138–628](https://github.com/nitheesh-cpu/HomeAccessCenterAPIv2/blob/f2f1af34ca45ab6766e58c2797b5a9c7ab3be255/api/entrypoint.go#L138-L628); [Python functions, lines 26–405](https://github.com/nitheesh-cpu/HomeAccessCenterAPI/blob/76c5176fb5aa3d9a37c028c446ffae955559685f/api/index.py#L26-L405); [Python routes, lines 432–624](https://github.com/nitheesh-cpu/HomeAccessCenterAPI/blob/76c5176fb5aa3d9a37c028c446ffae955559685f/api/index.py#L432-L624).

The [assignments documentation](https://homeaccesscenterapi-docs.vercel.app/api-reference/assignments) calls the inputs “headers” but demonstrates query parameters and mentions a class filter. The [classes documentation](https://homeaccesscenterapi-docs.vercel.app/api-reference/classes) and [rank documentation](https://homeaccesscenterapi-docs.vercel.app/api-reference/rank) do not describe all Go response differences. Treat docs as historical context, not an authoritative normalized schema. The transcript docs fetch failed during this audit; transcript conclusions above are from the pinned source.

## 3. Concrete security and correctness findings

These are static findings. No exploit, credential submission, or account request was performed.

| Finding | Exact evidence | Consequence / independent design requirement |
|---|---|---|
| Credentials are accepted in GET query strings | Go `api/entrypoint.go:25–33,138–143,170–174`; Python `api/index.py:432–446,517–531`; [published introduction](https://homeaccesscenterapi-docs.vercel.app/) | A URL can be retained by client history, proxy/access logs, monitoring, and other infrastructure. TLS and “no database” do not remove this exposure. Gradelarp must not use this hosted credential-in-URL API. Any later permitted exchange must use an own-server POST body with redaction and no-store responses. |
| Go prints credentials on an error path | [Go lines 79–110](https://github.com/nitheesh-cpu/HomeAccessCenterAPIv2/blob/f2f1af34ca45ab6766e58c2797b5a9c7ab3be255/api/entrypoint.go#L79-L110) | The map populated with username/password is printed when the POST errors. A failed login transport can therefore expose credentials to server logs. |
| Student data is also logged | Go lines 287,455,540; Python lines 55,149; URL logs at Go118/Python316 | Cohort, progress-report rows, transcript labels, and averages can enter logs. Use coarse event codes and timing only, never raw upstream body, academic rows, credentials, or cookies. |
| Caller-controlled authentication destination; SSRF exposure | [Go lines 71–108](https://github.com/nitheesh-cpu/HomeAccessCenterAPIv2/blob/f2f1af34ca45ab6766e58c2797b5a9c7ab3be255/api/entrypoint.go#L71-L108),142; [Python lines 407–446](https://github.com/nitheesh-cpu/HomeAccessCenterAPI/blob/76c5176fb5aa3d9a37c028c446ffae955559685f/api/index.py#L407-L446) | Go only strips a trailing slash; it does not require HTTPS or a district host. Python prepends an HTTPS string, then requests the destination to “check” it: that is itself an arbitrary server request, not an allowlist. Neither implementation applies exact district-host, port, private-address, or redirect validation in this source. |
| Python credentials persist in shared mutable process state | [Python lines 9–19 and 444–446](https://github.com/nitheesh-cpu/HomeAccessCenterAPI/blob/76c5176fb5aa3d9a37c028c446ffae955559685f/api/index.py#L432-L449), repeated in all routes | `data` aliases the module dictionary, not a copy. The last credentials/token remain referenced after response; concurrent requests can overwrite each other's values. This contradicts an unconditional assertion that all temporary credentials disappear after each response. |
| Authentication success is inferred too loosely | [Go lines 115–134](https://github.com/nitheesh-cpu/HomeAccessCenterAPIv2/blob/f2f1af34ca45ab6766e58c2797b5a9c7ab3be255/api/entrypoint.go#L115-L134); Python lines 26–40,91–94,448–449 | Go treats any response URL not containing `LogOn` as success, rather than verifying expected district/student identity and authenticated page markers. Python does not inspect the POST status and often interprets an empty parse as bad credentials. Neither has an explicit MFA/SSO/challenge/lockout state machine. |
| District mismatch in seven Go handlers | Go lines **162,248,296,339,373,424,460** versus caller-controlled login at lines142/173/etc. | Name, assignments, info, averages, classes, report card, and IPR fetch hardcoded Katy ISD URLs after login. Only transcript/rank use the caller `link` (572,623). This is a concrete incompatibility, not evidence that LISD/RRISD work. Cookie origin rules still matter: this finding does **not** assert that a normal cookie jar sends one district's cookies to another. |
| Incomplete status/error contract | Go lines144–151,232–245,292–294,466–477; Python lines442–452,527–539 | Go distinguishes some 401/500 responses, but missing selectors may yield 200 with empty data or no JSON. Python commonly returns HTTP200 for invalid credentials/links and 406 for absent query inputs. A missing course can be wrapped as serialized tuple data by lines187 and532–534. Distinguish auth failure, no assignments, malformed content, district mismatch, upstream error, and partial sync. |
| Unbounded or unspecified transport policy | Go login lines75–126; Python requests at lines29–39 and elsewhere | Python passes no explicit network timeout. Go code has no application-selected overall timeout, response-size bound, approved redirect policy, or cancellation policy; library defaults were not executed or tested. Neither app source has request throttling or per-account retry limits. Avoid assumptions about current library defaults. |
| Brittle parsing can misread, truncate, collide, or panic | Go lines189–193,234–242,322–326,395–418,537–539; Python lines43–47,65–89,250–275,343–389 | Fixed string offsets/word slices, fixed report-card column counts, unchecked array alignment, and unchecked string type assertions are not resilient to layout changes. Python often dereferences missing tags/attributes. Both key courses by display name, so identical names collide. |
| Semantic information is discarded | Go lines212–215; Python lines66–69; both raw-table responses | Asterisk removal and positional string arrays do not preserve the meaning of status markers, ungraded/excused values, category weighting, source identity, or reliable dates. Never convert an unknown/missing mark to zero. Keep source-reported average separate from recalculated average. |
| Old, unverified dependency/application baseline | [Go go.mod](https://github.com/nitheesh-cpu/HomeAccessCenterAPIv2/blob/f2f1af34ca45ab6766e58c2797b5a9c7ab3be255/go.mod); [Python requirements](https://github.com/nitheesh-cpu/HomeAccessCenterAPI/blob/76c5176fb5aa3d9a37c028c446ffae955559685f/requirements.txt) | Go declares 1.19 and older pinned libraries; Python packages are unpinned. No test suite or CI is in either inspected tree. This is not a CVE assessment. README timing numbers were not reproduced; no speed claim is established for current systems. |

### Cookie/transport boundary specifically

Neither source exposes an app-issued browser session, a secure HttpOnly cookie design for its callers, or revocation/logout APIs. Upstream state is handled by each language's HTTP session/collector. This audit found no explicit TLS-verification disable switch, but Go accepts arbitrary scheme/host input; HTTPS in examples is not a transport constraint. Code also does not establish where hosting proxies retain URL queries or logs. A “no database” promise is therefore much narrower than a complete credential/session privacy guarantee.

## 4. Official district host evidence

Only public district information and login landing pages were read. No login form was submitted.

| District | Primary source read | Exact linked HTTPS login host/path | Allowlist conclusion |
|---|---|---|---|
| Leander ISD | [Official HAC information page](https://www.leanderisd.org/homeaccesscenter/) | `https://lis-hac.eschoolplus.powerschool.com/HomeAccess/Account/LogOn?ReturnUrl=%2fHomeAccess` | Candidate exact host: `lis-hac.eschoolplus.powerschool.com`. No wildcard `powerschool.com` approval follows. |
| Round Rock ISD | [Official HAC information page](https://www.roundrockisd.org/o/rrisd/page/home-access-center) | `https://accesscenter.roundrockisd.org/HomeAccess/Account/LogOn?ReturnUrl=%2fhomeaccess%2f` | Candidate exact host: `accesscenter.roundrockisd.org`. Do not silently allow every district subdomain or an older alias. |

Raw public page evidence is retained in `research/hac/official/leander-hac.html` and `roundrock-hac.html`. Round Rock's rendered body was not exposed by the web text extractor; the exact login button URL was independently found in the downloaded public HTML's serialized content. This is a link provenance check, not permission to authenticate or scrape.

The [official Round Rock mobile-app page](https://www.roundrockisd.org/o/rrisd/page/district-mobile-apps) discourages entering credentials in unsupported third-party mobile apps and identifies supported vendors. That is relevant evidence for a provider discussion, not a legal determination about every web integration. The [Leander guide](https://www.leanderisd.org/homeaccesscenter/) notes that unpublished assignments can still affect class averages. Gradelarp therefore must not present a reconstruction from visible assignments as an official complete grade.

## 5. Independent connector design and live-auth prerequisites

### Buildable now with synthetic data

- Separate transport/session, district configuration, HTML parsing, validation, normalization, and reconciliation modules. A Next.js route layer can orchestrate them without adopting upstream source.
- Fixed district IDs select server-owned exact origins; users never supply authentication URLs. Mock mode performs **zero upstream requests**. Match the selected district, fixture district, and session district before import.
- Use synthetic documents with explicit course/source IDs and named table headers. Test absent tables, login/challenge pages, malformed values, empty assignment lists, duplicate IDs, and mismatched district markers separately. Synthetic compatibility is not proof of actual HAC compatibility.
- Normalize finite earned/possible values, status, dates, course/category identity, source-reported average, and provenance. Preserve unknown values as unknown. Require explicit policy mapping rather than inferring real district GPA rules from a course name.
- Stage validated records, display additions/updates/conflicts, and merge only connector-owned records by stable source identity. Never replace manual courses/assignments, saved what-if scenarios, or unrelated profiles. Retain successful records and disclose partial failures; duplicate refresh is idempotent.
- Mark sessions, records, last-sync status, and refresh results as **mock/synthetic**. Disconnect expires the mock session; removing imported records is a separate confirmed action.

### Before any live authentication is enabled

1. Obtain district/provider approval for the exact integration path, authorized data scope, account/student consent flow, rate limits, retention, and support model. Determine whether an official API or delegated authorization exists; do not assume permission from the presence of a login form.
2. Confirm current allowed hosts, path rules, redirect chains, SSO/MFA behavior, and upstream anti-forgery requirements. Validate every redirect and DNS/IP destination, reject private/reserved address ranges and non-approved ports, enforce HTTPS/certificate checks, and apply bounded time/size limits. Static hostname checking alone is not complete SSRF protection.
3. If an approved flow temporarily requires credentials, accept only an own-server POST body. Disable request-body capture and secret-bearing logs at all infrastructure layers; never put secrets in query strings, localStorage, IndexedDB, analytics, or backups. Use request-scoped values and discard references promptly without promising guaranteed memory erasure.
4. Use an opaque app session with secure HttpOnly/SameSite cookie behavior, bounded expiry, rotation/revocation, CSRF/origin checks, per-user rate controls, and server-only upstream session storage. Validate student identity on every account switch; minimize returned academic data and omit DOB/demographics unless required.
5. Obtain sanitized, non-sensitive current HTML samples through an authorized path; verify both districts' parsers against those fixtures and review discrepancies with provider-reported totals. Run integration/security review, incident/logging review, deletion tests, and concurrency tests before an explicit feature-gate change. No live readiness is established by this source audit alone.

## 6. Research verification

Commands used: `git clone --depth 1` for each named public repository; `git log -1 --format='%H%n%cI%n%s'`; `git ls-tree -r --name-only HEAD`; `nl -ba`/`sed`/`grep` for source review; `shasum -a 256` for frozen evidence; `curl -fsSL` for the three public district pages. All successful clone/read/hash commands exited 0. The initial network-restricted clone exited 128 with DNS failure, then the approved public read-only clone succeeded. No foreign executable, test suite, dependency installer, or hosted HAC API request was run.

**Decision:** use the Go version's centralized boundary as a conceptual reference, not copied implementation; preserve independently written, typed, mock-only integration in Gradelarp. The existing repositories do not establish live LISD/RRISD compatibility or a production credential-handling design.
