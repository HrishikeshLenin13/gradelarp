# gradelarp feature status — design approval milestone

## Preserved unchanged

Original `/` application, all original source/configuration/package files, course and assignment management, weighted/point calculation/status rules, target solving, GPA/policy planning, real snapshots/history, CSV imports, JSON backups, local-first persistence, themes, draggable widgets, existing 37 unit and 34 browser tests. Original IndexedDB database remains `gradelarp` and is never used by lab code.

## Implemented in all three isolated previews

- Desktop and mobile overview, real demo grades/GPA/targets/deadlines, category analytics, needed next score.
- Functional navigation and shared course editor/what-if/GPA/history/data tool views.
- Independent editable workspaces and per-direction preferences in `gradelarp-design-lab-v1 / workspaces / <direction>`.
- Light/dark/system, accessible rendered custom accent, density, motion, navigation density, chart style, analysis/deadline visibility.
- Keyboard command search, menus/dialogs, real saved feedback, meaningful selection/hover/page transitions and reduced-motion support.
- Assignment planner with search/filters and persistent completion independent of grade record status.
- Comparison route, clearly labeled demo/local estimates, existing-app link and explicit approval boundary.

## Design loop completed before approval

- First Precision screenshot placed useful evidence below the first viewport. Rebuilt desktop as ledger + evidence rail, reduced card outlines/row height without reducing text size.
- First Kinetic mobile runway cropped content horizontally. Rebuilt mobile chronology as vertical rows, added explicit workbench anchor and replaced generic hero with real target-attainment information.
- Axe found an Expressive visualization ARIA role issue and Kinetic selected-label contrast issue. Added role=img and darkened light-mode muted text. Comparison link-count test corrected to validate both functional links, not remove the useful thumbnail.
- Original routes/engine files are hash-checked against the reversible checkpoint; production database isolation is browser-tested.
- Final results and exact commands are recorded in `artifacts/redesign-2026-10-13/VERIFICATION.txt` after verification finishes. Initial failing results are retained in `lab-browser.log`, not hidden.

## Approval required; not implemented in this milestone

- Replace production design or fully redesign every shared editor/panel to the winning language.
- Expanded saved/multi-assignment what-if scenarios/comparisons and broader planning projections.
- Verified district/year-specific LISD/RRISD official policies/rank. Current GPA is custom/local and does not claim official district values.
- Advanced multi-semester/category analytics and official transcript/report tools.
- Full calendar/priorities, bell/class schedules, attendance, teachers, multiple local profiles.
- Advanced personalization: named theme preset systems, draggable/resizable lab modules (existing production dragging is preserved), comprehensive dashboard layouts.
- Authorized external grade-data integration. Manual entry/CSV/JSON/demo remain functional; no live HAC sync is claimed.
- Remote deployment/publication.

**Next action:** user chooses Precision, Expressive, or Kinetic. Stop at that gate. Reuse the chosen lab structure and existing tested engines rather than recreate the application.

## Final verification

- `npm run check`: exit0; 54 unit tests, lint, TypeScript, production build pass.
- Production-mode full browser suite: exit0; 69 pass, 1 intentional duplicate viewport-context skip. All original34 browser tests pass.
- 390×844,768×1024,1440×900,1920×1080 layouts and light/dark overview accessibility pass; browser runtime errors are asserted empty.
- Original34 source/config/test files remain byte-identical. Rollback on an independent marked copy restores those34, removes25 added files/routes, and passes the original37 unit tests.
- Three prototypes are complete for approval; advanced roadmap remains unimplemented.
