# Isolated design-development work

- Production `/`, existing components, grade models/engines, `gradelarp` IndexedDB, imports/exports, and existing tests remain unchanged.
- All concept code belongs in this directory and all preview routes under `/design-lab`.
- Use `gradelarp-design-lab-v1` IndexedDB, per-concept keys, for demo workspaces and preferences. Never call the production data provider here.
- Use the existing pure grade/GPA calculations. Clearly label demo data and estimated/custom-policy GPA. Never synthesize historical snapshots.
- Keep CSS scoped. Read current installed Next.js guides and primary library documentation when using APIs. Context7 became available during final verification; resolve/query docs were used for Next.js, Motion, and Recharts.
- Every visible control must act. Use existing Radix primitives for dialogs/menu focus management. Support reduced motion, visible keyboard focus, mobile, and accessible contrast.
- Stop after three concepts are implemented, reviewed, and tested. Ask for approval before migrating a design or expanding the academic feature roadmap.
