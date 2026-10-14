# gradelarp design exploration — approval gate

## Current milestone

Build, browser-review, and present three isolated interactive concepts. **Stop for approval** before altering production navigation/design or implementing phase-5+ academic features. No deployment, push, or publish is authorized.

## Audit

- Existing Next.js App Router application; page → Gradelarp client shell → reusable panels/editors/widgets.
- Strong Zod-backed models; pure calculations implement point-based/weighted category grades, dropped/missing/exempt handling, target solver, credit-weighted GPA, and real snapshots.
- Production persistence: `gradelarp / workspace / state`. Import/export: validated CSV and complete JSON backups.
- Existing verification: 37 unit tests; 34 desktop/mobile E2E workflows. Current dashboard composition is four equivalent KPI cards plus repeated bordered widgets, with small labels and generic motivational copy.
- No Git checkout exists. A reversible source checkpoint and SHA-256 manifest are in `artifacts/redesign-2026-10-13/BASELINE.tar.gz` and `baseline-manifest.json`.

## Architecture

- `/`: unchanged production app.
- `/design-lab`: comparison and approval page.
- `/design-lab/precision`, `/expressive`, `/kinetic`: distinct dashboards; shared real tool views and existing course editor.
- `src/design-lab/storage.ts`: NEW isolated IndexedDB `gradelarp-design-lab-v1`, per-direction keys. Never reads/writes real student workspaces.
- Existing calculations, demo generator, model validation, and functional editor/panels are reused read-only as source modules.

## Sequence

1. Preserve source; run baseline tests.
2. Lock three composition/token systems; build prototypes in parallel on non-overlapping files.
3. Implement shared isolated workflows, keyboard search, appearance controls, planner, real analytics.
4. Run lint/type/unit/build and both the preserved production suite and new design-lab suite.
5. Inspect real screenshots at 1440 and 390 pixels; fix contrast, legibility, composition, and overflow.
6. Present three working URLs, screenshots, evidence-based scores, recommendation, and approval question. Stop.

## Documentation and tools

Frontend-design/baseline-ui skills loaded. Next.js installed docs read. Radix/Motion/Recharts primary documentation checked. shadcn MCP audit used. Context7 was absent during initial implementation; it became available late in verification. Its resolve/query tools were then used to cross-check Next.js browser-API client boundaries, Motion reduced-motion semantics, and Recharts custom shapes against primary documentation. Installed Next.js16.4 guides remain the version-specific source. Playwright is available. No new dependency or service is required.

## Completion state

Phases1–4 prototype work completed: three distinct concepts, browser iterations, four viewport sizes, accessible light/dark states, real isolated editing/calculations/persistence, full regression verification, genuine screenshots, scores/recommendation. Awaiting approval. Finalcheck:54 unit tests; fullbrowser:69 passed/1 duplicate-context skip; original34 files hash-preserved. Consult `DESIGN_REVIEW.md` and the verification record. Do not begin production migration or expanded features before a human approves a direction.
