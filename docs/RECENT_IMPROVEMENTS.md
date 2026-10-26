# Grade bounds and weekday planning

This guide covers implemented behavior. It does not change deployment or account configuration.

## Usage

```ts
import { semesterWeekdaysRemaining, assignmentPercent } from './src/lib/calculations';
semesterWeekdaysRemaining('2026-10-30', new Date(2026, 9, 23, 12)); // 5
// Pass optional YYYY-MM-DD exclusions as the third argument.
// assignmentPercent(assignment) returns a percentage or null for ungraded input.
```

## Contracts and limits

- Weekday counting excludes today, includes the end date when it is a weekday, and ignores duplicate or weekend exclusions. It is a helper API, not an imported school calendar.
- Assignment snapshots use missing = zero; future and invalid graded values remain unknown rather than appearing as earned scores.
- GPA ignores nonfinite or nonpositive credits. These are local planning calculations, not an official transcript.
- Attainable grade ranges evaluate 0% and 100% endpoints. Required score uses the linear span and rounds the answer upward to a hundredth. Saved assignments are not mutated.

## Source map

- [`src/lib/calculations.ts`](../src/lib/calculations.ts)
<!-- source: src/lib/calculations.ts -->
- [`tests/calculation-round2.test.ts`](../tests/calculation-round2.test.ts)
<!-- source: tests/calculation-round2.test.ts -->
- [`src/lib/model.ts`](../src/lib/model.ts)
<!-- source: src/lib/model.ts -->

## Regression command

Run from the repository root:

```sh
npm test -- --maxWorkers=2 --testTimeout=30000 && npm run typecheck
```

