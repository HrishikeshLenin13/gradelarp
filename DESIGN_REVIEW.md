> **Final user decision, October 14, 2026:** Expressive (Option 2) was approved. The real application now uses it at `/`. Scores and recommendations below describe the earlier exploration, not an active approval request. Product implementation/verification is documented in FEATURE_STATUS.md and artifacts/product-2026-10-14/VERIFICATION.txt.

# gradelarp — prototype review and approval decision

## Recommendation: Kinetic

Choose **Kinetic** if the priority is a distinctive product experience rather than another polished dashboard template. The grade-to-target map makes “am I on track?” visible across all six courses; selection connects directly to real category evidence and an actionable next score. Its horizontal desktop navigation and chronological deadline rail change the information architecture, not just the accent.

**Precision** is the best compact daily gradebook. **Expressive** offers the strongest editorial personality and tactile selected-course story. None is approved or migrated into the existing `/` app.

## Ten-category scores

These are qualitative design judgments, not test scores. Decimal values indicate relative judgment—not measurement precision. Static screenshots establish composition; source/runtime inspection establishes motion and interaction behavior. Automated checks support accessibility, but do not replace human assistive-technology testing.

| Criterion            | Precision | Expressive |  Kinetic | Concrete evidence / remaining tradeoff                                                                                                                                                                                                                    |
| -------------------- | --------: | ---------: | -------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Originality          |         8 |        8.5 |        9 | Ledger + evidence rail; editorial course story; spatial grade/target map. Kinetic diverges most from conventional admin composition.                                                                                                                      |
| Typography           |       8.5 |        8.5 |      8.5 | Local variable fonts, tabular grade/GPA figures, readable category/assignment labels; no giant four-KPI hero.                                                                                                                                             |
| Layout composition   |       8.5 |          8 |      8.5 | Precision evidence moved from ~y1110 to ~y438; Expressive has a strong asymmetric desktop pairing; Kinetic connects lanes and workbench. Shared secondary tool views retain the existing panel foundation.                                                |
| Visual hierarchy     |         9 |        8.5 |        9 | Selection/current/target/required score distinguished. Expressive headline identifies actual below-target courses; Kinetic hero reports real 5/6 attainment.                                                                                              |
| Color sophistication |         8 |        8.5 |      8.5 | Ink/blue, paper/plum/rose, and mist/teal; amber communicates target gaps. Custom foreground accent adjusts for readability.                                                                                                                               |
| Information clarity  |         9 |          9 |        9 | Actual 89.5% Chemistry grade, 90% goal, 60/40 categories, 94.23% next score. GPA is explicitly local/custom; one genuine snapshot is not presented as a trend.                                                                                            |
| Motion quality       |         7 |        7.5 |      7.5 | Restrained ~160ms navigation/selection/hover feedback; Kinetic marker emphasis links selection to evidence. Reliable immediate charts rather than decorative counter/choreography. Further native-feeling motion is an approval-stage polish opportunity. |
| Responsiveness       |         8 |          8 |        8 | 390px layouts recompose and preserve data; Expressive surfaces nearest deadline early; Kinetic offers direct workbench anchor and vertical deadlines. All remain scroll-heavy when displaying six complete courses.                                       |
| Accessibility        |       8.5 |        8.5 |      8.5 | Semantic buttons, keyboard selection/search, modal focus/Escape, non-color status, visible focus and reduced motion. ARIA/contrast faults discovered by axe were fixed; final audit recorded separately. Human screen-reader audit remains future polish. |
| Brand identity       |         8 |        8.5 |      8.5 | Custom geometric g, coherent neutral/personal/spatial systems. Quiet Precision is closest to familiar productivity chrome; Expressive/Kinetic have stronger own-language composition.                                                                     |
| **Average**          |  **8.25** |   **8.35** | **8.50** | No arbitrary perfect scores: long mobile sequences and reused secondary editor/panel styling remain visible tradeoffs.                                                                                                                                    |

## Genuine screenshots from the running browser

Captured by Playwright at 1440×900 and 390×844. Full-page dimensions exceed the viewport because the entire scrollable workspace is shown. Dark/light variants and 768×1024 / 1920×1080 screenshots are also generated by the browser suite in the root `artifacts` directory.

### Precision

![Precision desktop](/Users/HrishiL/Desktop/Gradelarp/artifacts/redesign-2026-10-13/precision-final-desktop.png)
[Mobile screenshot](/Users/HrishiL/Desktop/Gradelarp/artifacts/redesign-2026-10-13/precision-final-mobile.png)

- Iteration: replaced enclosing ledger/upcoming cards with compact rows and semantic separators; moved category evidence alongside the ledger.
- Remaining flaw: mobile selected evidence follows six rows; some lower desktop negative space is intentionally asymmetric but could be better used after approval.

### Expressive

![Expressive desktop](/Users/HrishiL/Desktop/Gradelarp/artifacts/redesign-2026-10-13/expressive-final-desktop.png)
[Mobile screenshot](/Users/HrishiL/Desktop/Gradelarp/artifacts/redesign-2026-10-13/expressive-final-mobile.png)

- Iteration: added a real nearest-deadline link before the mobile hero, shortened hero/tile spacing, retained contrast and numerical hierarchy.
- Remaining flaw: compact icon navigation requires familiarization (native title, aria-label, and expanded appearance preference are available); category/history information still sits low on mobile.

### Kinetic

![Kinetic desktop](/Users/HrishiL/Desktop/Gradelarp/artifacts/redesign-2026-10-13/kinetic-final-desktop.png)
[Mobile screenshot](/Users/HrishiL/Desktop/Gradelarp/artifacts/redesign-2026-10-13/kinetic-final-mobile.png)

- Iteration: replaced generic heading with actual target attainment; added selected-course/required-score workbench anchor; replaced clipped horizontal mobile runway with six readable chronological rows.
- Remaining flaw: complete mobile overview is ~2963px tall. The map deliberately clips plotted positions below70%, while retaining exact grades and explaining the axis. The deadline rail communicates order, not proportional elapsed time.

## Browser and engineering evidence

- Initial design-lab run: **29 passed / 5 failed**. Failures were two incorrect comparison link-count assertions, two Expressive goal-graphic ARIA failures, and one Kinetic selected-label contrast failure.
- The added comparison axe check identified low-contrast supporting labels/decorative thumbnails and an inline link without non-color differentiation. Supporting colors were darkened and the link is now underlined. The intermediate result (67 passed / 2 failed / 1 skipped) is retained in browser-iteration-2.log.
- Fixed every identified defect, retained the failed logs, and reran the final production-build suite. Final outcome: `npm run check` exits0 (54 unit tests, lint/type/build), and the production-mode browser suite exits0 (69 passed / 1 skipped). The skip is the duplicate mobile-context tablet/wide test; all four requested viewports were exercised in the desktop context. Exact commands/results are in `artifacts/redesign-2026-10-13/VERIFICATION.txt`.
- Original source is preserved via a 34-file SHA-256 manifest; lab storage never uses the production provider. Browser tests seed a fixture production workspace, edit lab data/preferences, and verify its bytes and another concept's state remain unchanged.

## Approval gate

Open [the comparison page](http://localhost:3000/design-lab), then try all three. **Which direction do you approve: Precision, Expressive, or Kinetic?** No design migration, remote publish, or post-approval academic feature expansion has occurred.

Normal-motion browser inspection measured 0.16s opacity/transform transitions; OS reduced-motion produced an empty animated-element list. Genuine runtime reports: `motion-normal.json`, `motion-reduced.json`. Screenshot capture scrolls to the top before full-page capture to avoid offscreen fixed skip-link capture artifacts, without changing focus or accessibility checks.
