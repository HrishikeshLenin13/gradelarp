# gradelarp.

**Expressive is the approved design and the real application at `/`.** This is a local-first student gradebook and academic planner, not a redirect to the design lab. No deployment, remote database, accounts, school credentials, or live HAC connection is configured.

## Run locally

```sh
cd /Users/HrishiL/Desktop/Gradelarp
npm run dev
# http://localhost:3000
```

For a production build:

```sh
npm run check
npm run start
```

`build` uses Next.js’s supported Webpack bundler. The default Turbopack build could not bind its CSS-worker port in this desktop sandbox; Webpack production compilation succeeds without that worker-port requirement. Development continues to use the installed Next.js default. No new runtime dependencies were added.

## Start with your own data

- A fresh browser starts with an **empty manual student profile**, never fabricated grades.
- Add a course, choose weighted categories or total points, set credits/level/semester/target, and enter assignments.
- Use **Student profiles** for separate local students. The demo opens a separate, clearly labeled profile.
- The semester selector filters the overview/course cards/history. The what-if selector can reach every entered semester. GPA offers selected-period and all-semester views.
- Set actual term dates in **Appearance**; progress is shown only for configured semesters. New manual profiles do not imply a school calendar.
- Changes save to IndexedDB after validation. “Saved on this device” follows transaction completion, not a timer. Export a backup if an error appears. Conflicting edits from another tab are rejected rather than silently overwriting newer data.

## What works

### Gradebook and simulations

Course/assignment create, edit and delete; teacher, colors, levels, credits, semesters and targets; category names and weights; graded/missing/ungraded/future/dropped/exempt statuses. Weighted grades normalize populated positive-weight categories. Total-points grades use included earned/possible totals. Missing = zero. Ungraded, future, dropped and exempt = excluded. A graded score must be between zero and possible points; extra credit is not supported.

The what-if gradebook changes several existing scores/statuses simultaneously, adds hypothetical assignments with their own points/categories, calculates a combined projection, solves a target score with the other changes held fixed, and explains effective category weights. Save, load, update, compare, reset and delete scenarios locally. No hypothetical action writes actual assignments. Saved scenarios recalculate against current real data and flag stale/deleted references.

### GPA and authentic history

Selected-semester/all-semester weighted and unweighted GPA; all-semester cumulative GPA including explicit prior credits and manual transcript finals; persistent hypothetical final-grade projections; future-credit target solver with a course-level feasibility bound. Edit the complete custom scale and level bonuses. These are **custom estimates**, not verified LISD/RRISD or official rank calculations. Avoid entering the same credit twice in gradebook, transcript records and aggregate prior-credit fields.

Every saved gradebook edit records actual snapshots. You can capture an additional real snapshot. Course/assignment history, comparisons, target-gap charts and change lists use those records, with empty states before sufficient history exists. No invented timeline or grade improvements.

### Academic workspace

- Agenda and monthly calendar combining entered assignment deadlines and manual tasks, priorities, notes, search, overdue/completed filters. Planner completion does not alter grade status.
- Weekly class blocks by semester, room, overlap validation, local-time next-class/end-of-class countdown. No inferred holidays or special bell schedules.
- Manual per-course/day attendance with present/absent/tardy/excused counts. No invented absences or attendance rates.
- Personal report cards and manual transcript records, print layout and CSV export. Not official school documents.
- Teacher contact directory, email links, rooms, office hours and notes.
- Personal academic goals/completion and real course-target tracking.
- Separate student profiles, profile exports, all-profile backups, validated legacy/full JSON restoration and assignment CSV import/export.

### Personalization

Light/dark/system, Daylight/Midnight/Sage presets, custom hex accent adjusted for text contrast, per-course colors, expanded/icon navigation, balanced/wide layout, compact/spacious density, 0/140/200-ms motion, OS reduced-motion support, bars/dots charts. Widget visibility and positions persist; reorder with pointer/keyboard drag or accessible move buttons in Appearance.

## Data preservation and storage

| Database                                                | Purpose                                    | Upgrade behavior                                            |
| ------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------- |
| `gradelarp / workspace / state`                         | Original v1 gradebook                      | Read once, never overwritten or cleared by product v2       |
| `gradelarp-product-v2 / workspace / current`            | `{revision, data}` containing all profiles | Validated, atomic, optimistic-revision saves                |
| `gradelarp-product-v2 / preservation / legacy-original` | Original raw v1 state at first migration   | Retained; downloadable from Data & backups                  |
| `gradelarp-design-lab-v1 / workspaces / direction`      | Historical isolated concept references     | Never read by product migration; never writes real profiles |

A corrupt/unsupported saved gradebook displays a load error and is not replaced with demo data. Full JSON imports restore as **new profiles**, preserving current profiles. CSV imports default to a new profile; appending is offered for manual profiles only. Clearing requires confirmation and affects only the current profile. Browser cleanup, private browsing, different origins/ports and device changes can affect access: keep downloaded backups. Local storage is not encrypted at rest by the application.

## Source organization

- `src/app/page.tsx` → `src/product/app.tsx` real Expressive application.
- `src/product/model.ts`, `storage.ts`, `engine.ts`: validated product schemas, non-destructive migration, immutable simulations and extended planning math.
- `src/product/dashboard*.tsx`: approved Expressive composition + sortable real-data widgets.
- `src/product/what-if.tsx`, `gpa.tsx`, `planner.tsx`, `academics.tsx`, `preferences.tsx`, `data.tsx`: functioning product tools.
- Existing `src/lib/calculations.ts` and v1 model/import math remain reused. Existing course editor, policy editor, trends and chart primitives are reused.
- `src/design-lab/`: retained isolated reference designs, not the production data provider.

## Verification and recovery

```sh
npm run lint
npm run typecheck
npm test
npm run build
PLAYWRIGHT_BASE_URL=http://localhost:3002 npm run test:e2e
```

Playwright runs Chromium desktop and mobile, plus tablet/wide layout sweeps, keyboard paths and axe scans. Production browser tests use an isolated browser profile and test port, not the user’s stored browser data. See `FEATURE_STATUS.md` and `artifacts/product-2026-10-14/VERIFICATION.txt` for final observed results and command logs. Initial failing logs are retained alongside the repaired reruns.

The pre-product checkpoint has 59 files and SHA-256 manifest in `artifacts/product-2026-10-14/BASELINE.tar.gz`. The final changed-source archive, source diff and tested rollback script live beside it. The rollback script only runs against a deliberately marked independent copy; it refuses the live project. It restores source, not browser data. The new product database remains retained if old source is restored, while the old app reads the preserved original database.

## Deliberately unavailable

HAC connection, automatic school synchronization, remote accounts/cloud sync, school-verified LISD/RRISD GPA/rank rules, official transcripts, school holiday inference, extra credit above possible points and automatic drop-lowest/category policies. The UI labels the applicable limitations rather than showing fake controls or official claims. No publishing/pushing/deployment occurred.
