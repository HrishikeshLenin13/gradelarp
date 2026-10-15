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

| School connection | Mock-only LISD/RRISD onboarding, synthetic sessions, explicit previews/imports, refresh/conflicts, disconnect and record management; real profiles remain isolated | 25 HAC unit cases and 16 desktop/mobile browser cases |

## Verification state

- Pre-HAC checkpoint: 74 source files preserved with SHA-256 hashes; 89 unit tests passed before this extension.
- Final checks: **114 unit tests passed**, lint/TypeScript and the production build passed; the complete desktop/mobile suite recorded **96 passed, 0 failed, 2 skipped duplicate viewport sweeps**. The final regression record is in `artifacts/hac-2026-10-14/VERIFICATION.txt`. This record is generated only after all required checks pass.
- All 18 original workflows retain browser coverage. The new HAC suite adds synthetic imports, idempotent refresh, failure/partial states, preserved local edits/scenarios, session expiry/revocation, record management, mobile layout and both-theme accessibility checks.
- Manual grade entry still computes 86.0% from 9/10 major work at 60% and 4/5 daily work at 40%, independently of demo data. Original calculation/model/import-export files are hash-unchanged.
- Independent source rollback restores the pre-HAC Expressive product and its 89 tests. The active app remains modified; browser databases are untouched.
- Localhost:3000 is checked in an isolated browser; genuine student records are not used to seed tests.

## Explicitly unavailable / not claimed

- Official district-specific LISD/RRISD GPA, class-rank or transcript policies: not verified/configured; custom scale only.
- Live HAC, credentials, scraping, remote sync, cloud accounts or deployment: not implemented or claimed.
- Extra credit above possible points and automatic category drop-lowest rules: not implemented; validation rejects excess scores and manual dropped/exempt statuses are available.
- Official report cards/transcripts, inferred absences, district holiday/bell changes: not claimed. Local manual records and recurring schedules work.
- Cross-browser/device sync: use full JSON export/import. The application uses browser-origin IndexedDB, not a cloud service.

No requested local/manual feature is represented by a fake button or fabricated calculation. See the final verification record for observed test results rather than inferring test completion from this checklist.


## HAC connector update — 2026-10-14

A separate, mock-only **School connection** workspace now supports LISD/RRISD selection, ephemeral server sessions, validated synthetic HTML parsing, explicit course/assignment import previews, idempotent refresh, local-edit conflicts, disconnect and imported-record management. Imports stay in labeled sandbox profiles; real/manual data and saved scenarios are preserved. Transcript/rank previews are synthetic reference values. Live school login and deployment remain off. See [HAC_INTEGRATION.md](HAC_INTEGRATION.md) and [the source audit](research/hac/SOURCE_AUDIT.md) for implementation details and remaining live-auth prerequisites. Final test evidence is in `artifacts/hac-2026-10-14/VERIFICATION.txt`.
