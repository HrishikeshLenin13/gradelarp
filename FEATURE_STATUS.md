# Gradelarp feature status

## Current application

- First visit: short information page and one direct HAC sign-in form, with a manual-entry option.
- No runtime sample provider, generated demo account, seeded gradebook, fixture selector or preview/import-confirmation workflow.
- Marked legacy demonstrations are purged without deleting genuine manual data; old concept routes redirect to the app.
- Direct same-origin server login POST, isolated cookie session, public-DNS/TLS restrictions, refresh/disconnect and validated source gradebook.
- LISD/RRISD presets plus a user-confirmed custom official HAC portal address for compatible standard portals.
- School-reported averages/raw marks, explicit unknowns, partial/stale notices and per-portal/student source profiles.
- Existing manual course CRUD, what-if, custom GPA, history, planner, schedules, attendance, reports, contacts, goals, preferences, profiles and backups remain available.

## Verification status

- Baseline checkpoint: 86 source/config/test/doc files; 114 unit tests passed before changes.
- The prior live-connector checkpoint passed 127 unit cases. Public GET-only preflight passed both known district login forms.
- Final browser, static/build and independent rollback outcomes are recorded only from observed results in `artifacts/hac-live-2026-10-15/VERIFICATION.txt`.
- Original calculation, v1 model and manual import/export files remain hash-unchanged.

## Explicitly unverified or separate

- No real credentials were provided or submitted during development. Authenticated account sync and current school gradebook markup remain account-specific integration tests for the user’s in-app sign-in.
- Universal ISD compatibility, SSO/MFA/challenge bypass and unsupported guardian student selection are not claimed.
- District GPA/credit policy is not inferred from names. HAC source-only profiles do not invent a GPA/what-if result; manual tools use user-entered rules in a manual profile.
- There is no public deployment, hosted account system or cloud data sync. Local JSON backups preserve academic data; app passwords are never backed up.

See [HAC_INTEGRATION.md](HAC_INTEGRATION.md) for exact flow, security boundaries, tests and remaining production prerequisites.


## Login failure follow-up

- A public-only district connection check and sanitized code/step diagnostics are now available in the sign-in form.
- A DNS lookup failure reproduces the old generic HTTP 500; the new result is `DNS` / `login-page`, HTTP 502. This does not establish the cause of the user's original attempt.
- Public GET and empty-account-field POST transport checks pass both preset district portals; these checks are not successful account authentication.
- Current commands, test counts, source checkpoint and independent-copy rollback: `artifacts/hac-login-fix-2026-10-15/VERIFICATION.txt`.

## Source-record compatibility follow-up

- Source category relative weights and percentages are separate; weights above 100 no longer reject the entire gradebook or receive an invented percent sign.
- Longer source labels and raw possible-point text survive source-profile storage and backup round trips.
- Source field-name-only diagnostics identify any remaining schema mismatch. Actual account-specific retry remains the integration confirmation.
- Research: `research/hac/GRADEWAY_COMPARISON.md`; observed test/rollback results: `artifacts/hac-records-fix-2026-10-15/VERIFICATION.txt`.


## Landing integration and feature consistency — October 15, 2026

- `/` now serves the approved cinematic gradebook landing page; `/app` is the existing workspace and HAC sign-in. CTA links and the workspace Website link connect them on one origin. Landing CSS is scoped and its photographs are local, credited camera photographs.
- Main UI spacing, wrapping, mobile form/tool rows and school-record layouts have a shared cleanup pass.
- School course identities now connect to personal planner/academic selectors, teacher names and search. Pending HAC assignments appear in the agenda/calendar only when a complete valid date is reported; completion checkboxes never submit work to HAC.
- Grade history records observed school averages (up to 60 compact points), not manual reconstructions. Late older responses do not overwrite newer data. Courses retained after partial sync are visibly stale.
- Source CSV export includes original school marks and date strings; full JSON backups retain source history and personal plans. CSV formula-like source text is escaped for spreadsheets.
- Schedule, attendance and transcript entries remain personal/manual records. GPA and what-if use manually confirmed grading inputs in a separate manual profile; HAC credits and policy are not guessed.
- Exact build, browser, public-form and rollback results are in `artifacts/integration-2026-10-15/VERIFICATION.txt`. Authenticated district-account sync still requires the user’s own in-app sign-in; public-form checks do not establish account compatibility.

### Landing interaction follow-up

The integrated landing now offers keyboard/touch-friendly 3D controls: rotate the gradebook, open its cover, switch between the three concept pages, reset, and close the controls. Native vertical scrolling still drives the cinematic camera; no wheel or touch scrolling is hijacked. Reduced-motion mode removes the scroll-driven camera animation but still permits explicit model adjustments. The district selector includes a custom official-portal option for other HAC districts; that is not a claim that every district's SSO, MFA or customized markup has been authenticated and tested.

### Cinematic polish — October 15

- Continuous camera timing through the existing poses, complementary chapter crossfades, cached chapter nodes and damped input that stops rendering when settled.
- Cloth/paper/wood relief maps, printed-cover finish variation, naturally curled pages, instanced metal bindings, soft grounding shadows and window-shaped reflections. No new photographs or generated photo assets.
- Shorter native-scroll travel, subtle pointer-driven photo depth and tactile controls, with reduced-motion overrides.
- Product-specific copy, explicit school-record/personal-plan distinctions, readable mobile navigation, opaque text backing where the model is bright, larger photo credits and a cover slider that tracks automatic opening.
- Motion and material math have deterministic unit coverage; browser checks cover idle rendering, chapter visibility, reduced motion, layout and login navigation. Local frame-interval observations are diagnostics on this machine, not a universal FPS guarantee.


### Real workspace destinations — October 16, 2026

- Landing shortcuts open the real grades, what-if calculator, GPA planner and assignment planner. No duplicate dashboard or sample academic records were added.
- The 3D loading screen offers direct app entry before its scene loads; the link also works without client-side JavaScript.
- All nine workspace views now have fragment URLs. Refresh, Back and Forward restore the intended tool. Unsupported fragments fall back to Overview.
- The HAC request guard now accepts same-port loopback aliases on dedicated preview ports instead of a hardcoded two-port list. Cross-origin, unrelated Host, mismatched port and private portal rejection remain covered.
- The requested destination survives first-visit manual entry and HAC connection. Sign-in explains which tool will open next.
- The empty manual calculator opens the existing course editor. Creating or switching to a manual profile from what-if/GPA keeps the calculator selected; school-source records remain distinct and unchanged.
- Navigation unit coverage and isolated desktop/mobile browser flows exercise deep links, controlled HAC responses, real what-if calculations, scenario persistence and original-grade preservation. Controlled responses do not establish a real district account sign-in.
- Earlier source commits were already on origin/main before this work. New code, website shortcuts, regression tests and documentation are grouped by distinct changes without rewriting prior history.
