# gradelarp

A clean student workspace with a direct Home Access Center sign-in, school-reported gradebook, and separate manual planning tools.

## Start locally

```sh
npm install
npm run dev
```

Open [http://localhost:3000/](http://localhost:3000/). New visitors see an information page and HAC sign-in. Choose LISD/RRISD or another compatible HAC portal, then **Sign in & sync**. The form sends credentials directly through Gradelarp’s server to the selected district, not to a public grade API. Credentials are not saved by the app.

For manual courses, use **Continue with manual grades instead**. No sample grades or demo profiles are generated. Existing marked demonstrations are removed while genuine records are preserved.

## Features

- Direct HAC form/session connector, school-reported averages and assignment marks, refresh/disconnect and explicit failure/partial states.
- Manual course/assignment management, immutable saved what-if scenarios, editable custom GPA planning and actual snapshots.
- Local planner, schedules, attendance, reports, contacts, goals, profiles and full JSON backups.
- Approved Expressive design, responsive desktop/mobile layouts, themes, accessibility, keyboard controls and persisted preferences.

## Accuracy and compatibility

Standard compatible HAC portals are supported by the generic adapter; not every ISD uses HAC or permits the same login method. SSO/MFA/challenges, guardian selection and unknown markup produce explicit errors rather than fake success. Both public LISD/RRISD forms have passed GET-only preflight. Actual account authentication/grade syncing has not been tested with real credentials in this development run.

HAC averages remain school-reported source values. Unknown credits, course levels and district GPA/scoring policies are not guessed; manual planning is separate. See [HAC_INTEGRATION.md](HAC_INTEGRATION.md) for current implementation, evidence, limitations and recovery details.

## Verify

```sh
npm run check
npx vitest run --config vitest.public.config.ts
npm run start -- --port 3002
PLAYWRIGHT_BASE_URL=http://localhost:3002 npm run test:e2e
```

Public preflight performs GETs only, never credential submissions. Browser/connector error tests use fixtures under `tests/`, not production mock endpoints. Final literal results are in `artifacts/hac-live-2026-10-15/VERIFICATION.txt`.

No deployment or remote publication was performed.
