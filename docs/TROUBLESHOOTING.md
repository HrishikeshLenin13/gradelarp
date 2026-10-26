# Troubleshooting gradelarp

Use the smallest reproducible fixture before changing production data or configuration. Run commands from the repository root.

## A countdown differs from calendar days

The weekday helper excludes Saturdays and Sundays. Existing calendar-day UI and this API are deliberately distinct.

## Required score returns null

Inspect possible points, category weights, active assignments, and whether the target exceeds the attainable maximum.

## A course is missing from GPA

Check that credits are positive and finite and that a graded percentage exists; invalid courses are not silently assigned a GPA.

## Reproduce and report

1. Record the exact command or UI action, runtime version, expected result, and actual result.
2. Run the regression command below on the same checkout and keep its first failure, not only the final summary.
3. Reduce the issue to a deterministic fixture without personal data or credentials.
4. Include the affected source path from the [feature guide](RECENT_IMPROVEMENTS.md) and whether it reproduces on a clean checkout.

```sh
npm test -- --maxWorkers=2 --testTimeout=30000 && npm run typecheck
```

## Recovery

Keep a copy of input data before experimenting. Revert the individual source change with Git and rerun the same fixture; a source revert does not automatically reverse browser storage, downloaded files, or external service state. Do not delete a lockfile or weaken a validation gate to make a failure disappear.
