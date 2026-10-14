# gradelarp — product continuation record

## Design decision and shipped architecture

The user approved **Expressive**. No more concepts were created. The real `/` route now uses `src/product/app.tsx`, reusing the tested calculation engine/course editor and the approved visual language. The three old design-lab routes remain isolated historical references.

## Completed milestones

1. Captured a 59-file source checkpoint + SHA-256 manifest; ran the 54-test baseline from a separate temporary copy.
2. Added validated profile storage with a non-destructive legacy migration, raw-original preservation, atomic save/revision checks, manual empty onboarding, and separate demo profiles.
3. Implemented immutable multiple-change what-if scenarios, saved comparisons, target solver and category explanations.
4. Implemented cumulative/projected/future GPA using the custom policy, multiple semesters and manually entered transcript finals; retained genuine snapshot analytics.
5. Applied Expressive to the real navigation/tools, with persisted personalization, real widget visibility/order and accessible modal/search workflows.
6. Added persistent local planner/calendar, schedules/countdown, attendance, reports/transcripts, teacher directory, goals, profiles and all-profile backups.
7. Completed unit/browser tests, visual review and accessibility checks; repaired audit findings; verified the independent rollback and packaged source/diff/recovery evidence.

## Final verification

- `npm run check`: lint, TypeScript, **89 unit tests**, and production build passed.
- Desktop/mobile Chromium: **80 passed, 0 failed**; 2 duplicate viewport sweeps intentionally run once in the desktop project.
- Rollback copy: all 59 original SHA-256 hashes restored, 54 baseline tests passed; active source still uses the Expressive product.
- No unfinished local/manual feature milestone remains. External HAC and unverified district policies remain explicitly unavailable, not represented as completed integrations.

## Test and visual review loop

Run `npm run check`; start the production build on port 3002; run `PLAYWRIGHT_BASE_URL=http://localhost:3002 npm run test:e2e`. This tests all product workflows and historical lab regressions. The supported Webpack production bundler avoids a sandbox-specific Turbopack CSS-worker port bind failure. Do not hide failing tests or modify the genuine user database to seed tests.

Read `artifacts/product-2026-10-14/VERIFICATION.txt` for final literal command outcomes, restored-copy verification, file hashes and archive/diff/rollback paths. Screenshots and first-failure logs are retained in that directory.

## If development continues

- Preserve `/` and the product v2 schema; do not return to a design-selection phase or redirect to the lab.
- Keep `gradelarp` v1 and `gradelarp-design-lab-v1` untouched by product saves. Add migrations before changing the product format.
- Keep all profile data in complete JSON backups; import into new profiles by default.
- Do not implement district formulas until the actual district/year/course rules are verified and encoded with fixtures. Current custom estimates are intentionally labeled.
- Any future school integration needs an authorized, verified provider boundary. No school passwords or scraping path is present.
- Publishing, pushing or deploying still requires the user's explicit request.

## Reusable development prompt

```text
Continue gradelarp in /Users/HrishiL/Desktop/Gradelarp. Expressive is approved and lives at /. Read AGENTS.md, README.md, FEATURE_STATUS.md, and the latest product VERIFICATION.txt. Inspect current source and failing tests before changing anything. Preserve legacy and product browser data, profile isolation, immutable scenarios, and tested grading math. Reuse existing components, keep the approved visual language, verify desktop/mobile and both themes with Playwright/axe, run lint/type/unit/production build, and update truthful verification evidence. Do not create new design concepts or deploy.
```
