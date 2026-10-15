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
