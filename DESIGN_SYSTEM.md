# gradelarp — three isolated design systems

**Milestone:** interactive exploration, awaiting user approval. The original app is unchanged. Tokens live in `src/design-lab/workspace.module.css`; compositions and component treatments are scoped modules. These are different information architectures, not recolors.

## Shared foundations

- Local bundled DM Sans Variable for body/UI; Manrope Variable for headings/numerical emphasis. No external font requests. Tabular numbers across grade/GPA/table values.
- Type floors: meaningful labels 12px; body 14px; compact controls 13px. Headings 18/24/34/43px; mobile display values scale down deliberately. Decorative comparison miniatures are hidden from the accessibility tree.
- Space scale: 4/8/12/16/20/24/32/40px. Thin separators communicate row/category boundaries, not decoration. Touch controls in the mobile toolbar and shared buttons are at least 44px high.
- Grade status uses text, letter, numeric gap, and shape—not color alone. All values come from the existing calculation engine. GPA is labeled a custom/local estimate. Charts do not fabricate history.
- CSS custom properties define canvas, surface, raised, text, muted, line, accent, success, warning, danger, chart-secondary, focus surface/foreground. Accent preference retains the requested hex; the rendered foreground adjusts to a >=5:1 conservative neutral-surface contrast target. The button foreground selects the higher-contrast light/dark option. 17 contrast unit tests cover extreme and default accents.
- Dialogs/menus use existing Radix primitives: modal focus containment, Escape, keyboard selection, restoration. Keyboard search opens with Ctrl/Cmd+K. A skip link targets the main workspace. Course/category selections use aria-pressed and visible focus.

## A — Precision / the academic instrument

- Architecture: 194px labeled rail; compact course ledger and selected-course evidence side by side on desktop. Upcoming work and attention sit beneath the ledger. Tablet/mobile stack without compressing numerical text.
- Default dark canvas `#15181c`, surface `#1b1f24`, raised `#23292f`, text `#e8ecf2`, muted `#a0acbb`, blue accent preference `#709bdf`, success `#82c6a6`, warning `#dfb77f`. Light canvas `#f8f9fb`, surface white, text `#242c38`, muted `#586574`, success `#2c735c`, warning `#976322`.
- Compact rows: course/teacher/credits, actual grade/letter, target/gap, nearest deadline. Separate selection and course-open actions prevent ambiguous row behavior.
- Category evidence: real weighted/point breakdown, target ticks, selectable category with corresponding recorded assignments, exact required future score entry. Outlines surround only selected evidence, not every content block.
- Motion: quiet shared page fade/active indicator; hover/focus/selection feedback. No gratuitous counter effects or manufactured trend animation.

## B — Expressive / a semester with character

- Architecture: compact 79px icon rail with expandable labels; an editorial selected-course story beside a next-score spotlight; six tactile subjects; category evidence and deadlines below. Mobile becomes a single narrative column with a two-column subject selector.
- Default paper `#f5f3f6`, surface white, raised `#eeeaef`, text `#302b36`, muted `#69616f`, rose preference `#93536f`. Fixed plum focus `#352835`, focus text `#fcf5fa`, muted `#d8c4d5`, pale rose `#ead0dc`. Dark canvas `#1b181e`, surface `#26212a`, text `#f0e8f0`, muted `#bcb0bd`.
- One meaningful focal point: a real below-target course, its current/target/letter, and one concrete assignment score that reaches the goal. The required score is computed, not a suggestion from invented analytics.
- Richer but restrained depth: 18px focal surface radius, 11px subject tiles, 8px controls; slight selected-tile shadow. No gradient/glass/glow.
- Motion: 160ms selected-course opacity transition; short transform-only subject hover. Goal graphic is labeled with role=img. Grade/category bars are real values; full grade history stays truthful until another snapshot exists.

## C — Kinetic / see the next move

- Architecture: horizontal desktop navigation; grade-to-target map connected to a selected course workbench; chronological deadline runway. Mobile uses compact navigation, readable stacked grade lanes, an explicit workbench anchor, and a vertical chronological deadline list.
- Default canvas `#edf3f4`, surface `#f9fcfc`, raised `#e2ebed`, text `#253c43`, muted `#456168`, teal preference `#267467`. Dark canvas `#121f26`, surface `#1a2b32`, text `#e0f0f0`, muted `#a5bdc2`. Selected-row labels were darkened after axe measured insufficient contrast.
- Grades are current dots, goals are diamonds; target gaps are connected and exact numbers remain visible. The overview map shows 70–100% and explicitly explains clipping below 70%, rather than disguising low scores.
- Workbench: actual category weight/grade table, current/goal/gap, required percentage and equivalent points, calculator and editor actions.
- Motion: <=160ms opacity/transform emphasis for selection/grade marker; no position/width interpolation. Selection always precedes explanation. No automatic scrolling or decorative perpetual movement.

## Shared tool views and controls

| Component               | Behavior                                                                                                                                              |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Navigation              | Overview, courses, what-if, GPA, real history, planner, appearance, preview data; all act on isolated state                                           |
| Course editor           | Reused validated editor, live calculated grade, categories/points/status/target/color/credits; save captures real snapshot                            |
| What-if                 | Reused slider/presets/assignment choice/target solver; hypothetical state never saves to actual course records                                        |
| GPA                     | Real credit-weighted/unweighted calculations, levels/custom policy; explicitly estimated rather than district-verified                                |
| History                 | Genuine captures and assignment-level comparisons; one initial capture, no fabricated trend                                                           |
| Course comparison chart | Recharts grade/target-gap modes, tooltip, keyboard course legend, bars/dots preference                                                                |
| Planner                 | Real future assignments, search, week/upcoming/completed filters; completion stored separately from grade status                                      |
| Appearance              | Light/dark/system, validated custom accent, compact/spacious, motion, rail density, bars/dots, analytics/deadline visibility; persisted per direction |
| Data                    | Existing CSV/JSON import/export/backup tooling with lab-only state; resets affect only the chosen preview                                             |

## Motion and preference contract

Shared page transitions use opacity for ~160ms; MotionConfig and derived panel settings disable JavaScript motion when the preference is none. OS reduced motion removes transform/layout movement; short non-spatial page fades may remain, following Motion’s documented policy. CSS transitions/animations are suppressed for motion=none and prefers-reduced-motion. Expressive also removes hover transforms under reduced motion. Charts use nonanimated rendering for reliable immediate calculation feedback. Additional animation choreography, resizable/reorderable prototype modules, and eight theme presets are approval-stage work, not claimed complete here.

## Browser review and approval

Genuine before/after screenshots and test logs are in `artifacts/redesign-2026-10-13/` and `artifacts/design-lab-*.png`. The ten-category critique is in `DESIGN_REVIEW.md`. No concept has replaced `/`; no public production navigation links to the lab; no publication occurred.

## Documentation cross-check

Context7 resolved primary sources after its tools became available: [Next client/browser API boundaries](https://github.com/vercel/next.js/blob/canary/docs/01-app/02-guides/static-exports.mdx), [Motion reduced-motion behavior](https://motion.dev/docs/react-accessibility), [Recharts custom bar shape](https://github.com/recharts/recharts/blob/main/storybook/stories/Customise.mdx). Browser-only persistence is initialized in effects; Motion-none also sets transitionduration0; custom charts use the documented SVG shape function. Installed Next.js16.4 guides were read before implementation. No dependency upgrades were made.
