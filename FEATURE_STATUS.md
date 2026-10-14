# gradelarp — Expressive product implementation

**Decision:** the user approved Expressive on October 14, 2026. The former design-approval gate is closed. `/` now renders the real Expressive product with validated local student data. Existing concept routes are historical isolated references.

## Implemented and covered by automated tests

| Area                 | Working behavior                                                                                                                                               | Coverage                                                                            |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Main app / migration | Actual Expressive at `/`; original v1 state copied without mutation; original database and migration backup retained; corrupt state rejected                   | Unit migration tests; cold-upgrade browser test; lab isolation regression           |
| Real grades          | Course/assignment CRUD; levels, credits, categories/weights, points, status, targets, semester; persistence                                                    | Existing calculation tests; desktop/mobile edit/add/delete workflows                |
| What-if              | Multiple score/status changes, hypothetical new assignments, projection, target solver, immutable real data, save/load/update/compare/reset/delete             | Pure engine tests and persisted multi-change browser workflow                       |
| GPA                  | Weighted/unweighted semester/all periods, cumulative all semesters/prior credits/transcripts, projected finals, future GPA requirements, editable custom scale | Existing/new unit tests and policy/projection/transcript browser tests              |
| Analytics            | Real spotlight/course selection, distribution, target gaps, deadline cards, configured calendar progress, actual snapshot/course/assignment history            | Existing/new calculation tests and browser chart/history checks                     |
| Preferences          | Light/dark/system, 3 presets, hex accent, course colors, density/layout/sidebar/chart, motion, visibility, pointer/keyboard/widget move order                  | Contrast unit tests, persisted appearance and keyboard drag browser workflows       |
| Planner              | Manual tasks, priorities/notes, monthly calendar, gradebook deadlines, completion, search/filters/overdue                                                      | Desktop/mobile completion, calendar, reload, unchanged grade assertions             |
| Schedule             | Weekly blocks/semester/room, overlap checks, active/next local bell countdown                                                                                  | Boundary/time unit tests; manual schedule creation/persistence browser workflow     |
| Attendance           | One record per course/date, four statuses, edit/delete, filtered counts                                                                                        | Schema validation; entered attendance persistence browser workflow                  |
| Reports              | Real course report cards, manual final records, cumulative contribution, print stylesheet, CSV export                                                          | Transcript/GPA math and CSV-download browser workflow; printing uses browser dialog |
| Teachers / goals     | Manual contacts/mail links, rooms/hours/notes; personal goals/completion and course targets                                                                    | Desktop/mobile persistence workflows                                                |
| Profiles / backups   | Separate manual/demo students, switching/rename/delete confirmation, full/profile JSON, legacy/full restore as new profiles, CSV new/append import             | Round-trip unit/browser tests; original-profile retention; invalid-file rejection   |
| Storage robustness   | Atomic versioned saves, serial queue, completion feedback, stale-tab rejection and unsaved export                                                              | Concurrent-tab browser regression                                                   |

## Verification state

- Baseline: **54 unit tests passed** on the preserved independent copy.
- Current unit milestone: **89 tests passed**; lint/type checks and Webpack production build pass.
- Full production + historical design-lab desktop/mobile regression suite: **80 passed, 0 failed, 2 intentionally skipped duplicate viewport sweeps**. The desktop project runs those tablet/wide sweeps; all product workflows run separately on mobile. Literal results are recorded in `artifacts/product-2026-10-14/VERIFICATION.txt`.
- All 18 requested user workflows have explicit browser coverage. Accessibility scans cover every main destination in both themes; viewport checks include mobile, tablet, desktop and wide desktop.
- The audit repaired mobile dialog sizing, hidden upload-input overflow, per-semester date saving, assignment field labels and scenario update/delete behavior. Tests also account for completed tasks leaving the Open filter and target the visible approval notice. All formerly failing cases were rerun; original failed logs remain available.
- Manual grade entry computes **86.0%** from 9/10 major work at 60% and 4/5 daily work at 40%, persists after reload, and stays separate from demo profiles.
- The independent rollback restores all **59 original file hashes** and passes **54 original unit tests**. The active app remains changed.
- Localhost:3000 was opened in an isolated browser: real Expressive root, no horizontal overflow, no browser runtime errors. No user browser records were used to seed tests.

## Explicitly unavailable / not claimed

- Official district-specific LISD/RRISD GPA, class-rank or transcript policies: not verified/configured; custom scale only.
- Live HAC, credentials, scraping, remote sync, cloud accounts or deployment: not implemented or claimed.
- Extra credit above possible points and automatic category drop-lowest rules: not implemented; validation rejects excess scores and manual dropped/exempt statuses are available.
- Official report cards/transcripts, inferred absences, district holiday/bell changes: not claimed. Local manual records and recurring schedules work.
- Cross-browser/device sync: use full JSON export/import. The application uses browser-origin IndexedDB, not a cloud service.

No requested local/manual feature is represented by a fake button or fabricated calculation. See the final verification record for observed test results rather than inferring test completion from this checklist.
