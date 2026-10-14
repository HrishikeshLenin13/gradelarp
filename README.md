# gradelarp

**A little clarity. A lot of potential.** A working, local-first student grade workspace built with Next.js, React, and TypeScript.

## Run

```sh
cd /Users/HrishiL/Desktop/Gradelarp
npm install
npm run dev
```

Open http://localhost:3000. For production: `npm run build && npm start`.

Node 20.9+ is required by Next.js; this implementation was verified with Node 26.8.1. Exact dependency versions are locked in `package-lock.json`.

## What works

- Responsive Obsidian and Daylight themes, four accents, density/layout preferences, reduced-motion support, animation intensity, and persistent widget ordering/visibility.
- Pointer and keyboard widget drag-and-drop; settings also provide explicit up/down reorder buttons.
- Six **clearly labeled demo courses**, editable course names, teachers, semesters, credits, course levels, targets, colors, category weights, and assignment data.
- Weighted-category and point-based grading. Missing work counts as zero. Dropped, exempt, ungraded, and future assignments are excluded from the actual grade.
- What-if lab for any existing assignment or a new hypothetical assignment. Solves the minimum percentage needed to hit a target and identifies impossible targets. Displays category math. Scenarios never overwrite actual grades.
- Credit-weighted GPA, unweighted GPA, and a cumulative estimate with user-entered prior credits/GPA. Editable threshold scale and AP/honors bonuses; GPA is explicitly an **estimate**, not a school-reported result.
- Actual course and assignment-grade snapshots on course saves/deletion, plus manual snapshots. Trend charts remain empty until two real snapshots exist. Assignment-level trend selection and recent changes use recorded snapshots only. Semester comparison uses entered data only.
- Course search/sorting, workspace command search (`Ctrl+K` / `⌘K`), upcoming assignments, recent assignments, help/onboarding, import previews, confirmation dialogs, and accessible feedback.
- CSV assignment import/export, full JSON backup/restore, demo reload, and workspace deletion. Import files are validated before state changes.
- IndexedDB persistence through a replaceable `DataProvider` interface. No accounts, credentials, or remote grade fetching.

## Architecture

```text
src/app/                  Next.js app router, metadata, global design tokens/styles
src/components/           Application shell, sortable widgets, calculators, course/settings editors
src/components/ui/        Heavily restyled shadcn-style Button / Radix Dialog foundations
src/lib/model.ts          Strong types + Zod validation
src/lib/calculations.ts   Pure grade/GPA/target-score math
src/lib/demo.ts           Explicitly labeled realistic sample data
src/lib/persistence.ts    IndexedDB provider boundary
src/lib/import-export.ts  CSV and full-backup portability
 tests/                   Unit and desktop/mobile browser tests
```

Application naming lives in `APP_NAME` in `src/components/gradelarp.tsx`, package metadata, and `src/app/layout.tsx`.

## Calculation rules

- **Points:** sum of included earned points / sum of included possible points × 100.
- **Weighted:** a category's point percentage × its configured weight, divided by the sum of weights of populated categories. Empty categories do not silently become zeros. Weights must total 100%.
- **Statuses:** missing = zero; graded = entered earned points; future, ungraded, dropped, exempt = excluded. Extra credit above possible points is not supported in v1.
- **Target solver:** binary search on [0,100] percent for one assignment. Returns the minimum feasible score, rounded upward to 0.01%; targets above the reachable maximum are reported as impossible.
- **GPA:** total quality points / included course credits. Grades use exact values, not display-rounded values, for mapping to a scale. AP/honors bonuses are user-configurable and require the configured minimum grade.
- **Cumulative:** combines current-semester quality points with prior GPA × prior credits. Prior entries must use the same weighted scale and exclude the current semester.
- **Dashboard average:** simple mean of currently graded course percentages, not the official credit-weighted GPA.
- **Progress:** elapsed time between the configured semester dates, clamped to 0–100%.

## Data portability

CSV headers, all required:

```csv
course,teacher,level,semester,credits,mode,category,weight,assignment,earned,possible,status,due
Biology,Ms. Smith,Regular,Fall 2026,0.5,weighted,Major grades,60,Unit 1 test,92,100,graded,2026-10-12
Biology,Ms. Smith,Regular,Fall 2026,0.5,weighted,Daily work,40,Lab notebook,45,50,graded,2026-10-13
```

- `level`: Regular, Honors, AP. `mode`: weighted, points.
- `status`: graded, missing, ungraded, future, dropped, exempt.
- `earned` may be blank for ungraded work; graded rows require a valid score. `possible` must be positive.
- A course is grouped by **course name + semester**. Each category must have consistent weights. Course metadata must be consistent across rows.
- Files up to 10 MB and 10,000 CSV assignment rows are supported.
- CSV represents assignments, not preferences or snapshot history. Use the full JSON backup to preserve empty courses, empty categories, settings, targets, colors, policy, and history.
- IndexedDB belongs to this browser and origin. Changing the origin/port does not carry the workspace with it. Browser data clearing/private mode may remove it. Keep regular backups.

## Verification

Verified on October 13, 2026: **37 unit tests and 34 desktop/mobile production browser tests passed**, alongside lint, TypeScript checks, and the production build. Accessibility scans cover the dashboard, course cards, calculators, GPA table, trends, data tools, preferences, and course editor, including both themes.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Playwright covers desktop and mobile: actual calculations, edits and persistence, status handling, preferences, widget keyboard reordering, policy changes, import/export, backup round-trip, deletion confirmation, manual course creation, real-only snapshots, search, accessibility scans, and reduced motion. It reuses a running port-3000 development server, or starts one automatically. Browser screenshots are saved in `artifacts/`; test traces and reports are in `test-results/` and `playwright-report/`.

## Design foundations

Obsidian and Daylight tokens were also established as editable Figma variable collections:
[gradelarp · foundations](https://www.figma.com/design/0r0dTjQ4HHKW8wNFh8s6Qo).

Implementation references checked: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [Motion reduced motion](https://motion.dev/docs/react-use-reduced-motion), [Recharts ResponsiveContainer](https://recharts.github.io/api/ResponsiveContainer/), [shadcn Radix Dialog](https://ui.shadcn.com/docs/components/radix/dialog), [Radix Dialog](https://www.radix-ui.com/primitives/docs/components/dialog), [idb](https://github.com/jakearchibald/idb), and [dnd-kit keyboard sorting](https://dndkit.com/legacy/presets/sortable/overview/).

## Deliberate v1 boundaries

- No HAC integration, student password collection, official school sync, Supabase/cloud accounts, or deployment. The requested repository app runs independently.
- No verified LISD profile. The custom default scale is not attributed to LISD or any district.
- No invented historical data or grade-change claims. Recent assignments are sorted by due date, not presented as an edit audit log.
- What-if scenarios model one assignment at a time; multi-assignment scenario saving, automatic category drop-lowest rules, and extra-credit policies are future additions. Individual dropped/exempt statuses work now.
- Native selects are intentionally restyled for robust keyboard and mobile behavior; the dialog/button layer uses Radix/shadcn patterns.
- Accessibility scans are automated checks, not a substitute for a full assistive-technology audit. Mobile browser tests use Chromium emulation; Safari-specific behavior still needs a device test.
- Production dependencies passed `npm audit --omit=dev`. The latest ESLint/Next lint tooling currently inherits an unpatched `braces` advisory; this is a dev-only dependency chain, not runtime app code. No forced incompatible framework downgrade was applied.

## Next development step

Add a real-device Safari/VoiceOver pass, then deploy the tested app. A future approved grade provider can implement `DataProvider` without replacing the UI or calculation engine; verify any district GPA policy using its official published source before adding it.
