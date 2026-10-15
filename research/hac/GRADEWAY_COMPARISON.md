# GradeWay comparison and parser repair — 2026-10-15

## What public primary sources establish

- [GradeWay privacy policy](https://www.gradeway.app/privacy-policy.html) says the app uses supplied credentials to retrieve grade/class information directly from the school gradebook server and retains its data on the device. It does not publish the login POST, cookie adapter or parser source.
- [GradeWay FAQ](https://www.gradeway.app/frequently-asked-questions.html) ties available grades to the official HAC Classes tab, distinguishes unavailable transcripts and incomplete course information, and describes a prior HAC weighting change. This is public behavior documentation, not a parser specification.
- Public GitHub repository search for `gradeway` did not identify a publisher-owned HAC implementation. Similarly named clones and unrelated projects were not treated as GradeWay source. No GradeWay application binary was downloaded or executed; no private API implementation was assumed.
- [PowerSchool eSchoolPlus category type fields](https://esp.powerschool-docs.com/espsis-sys-admin/latest/building-gradebook-category-type-page) documents Weight separately from Percent. [Calculating Course Marks](https://esp.powerschool-docs.com/espsis-sys-admin/latest/calculating-course-marks-in-eschoolplus) gives a relative-weight formula whose denominator is the sum of weights. Gradelarp's old assumption that every Weight is a percentage between 0 and 100 was not justified.
- [PowerSchool assignment setup](https://esp.powerschool-docs.com/espsis-teacher-access/latest/gradebook-setup-assignments-tab-field-descriptions) describes assignment weight as a multiplier applied to earned and possible points. No course average should be reconstructed from a bare unweighted visible-row sum.

## Independent source reference inspected

[phytal/HomeAccessCenter-Web-API](https://github.com/phytal/HomeAccessCenter-Web-API), MIT, commit `6e6688d650923e994cb158f7f101017f3d1eee8d`, read in a temporary checkout only. Its Courses.cs identifies the HAC overall-average element `lblOverallAverage`, separate category data, and assignment-anchor metadata. It is a 2020 implementation, not a verified current district contract. No executable was run, hosted API called, credentials supplied or code copied. The implementation in Gradelarp remains its own TypeScript adapter. References were used to cross-check field semantics and selectors, not to import its positional parsing or grade reconstruction.

## Confirmed defects and repairs

1. The old source schema rejects a valid nonnegative relative weight of `200`; this reproduces SOURCE_VALIDATION. The new schema accepts finite nonnegative weights without treating them as percentages. `weightText` and `percentText` preserve distinct source cells; the UI no longer appends a guessed percent sign.
2. The old shared 300-character label limit rejects longer assignment display text. Source labels now have their own bounded 16,384-character allowance, and other display fields have bounded source-specific limits. No text is truncated. The 3 MB page limit, record-count bounds, strict identity and finite-number checks remain.
3. A combined student-name selector used document order rather than selector preference. Explicit student identity fields now take priority; ambiguous generic menu spans trigger the existing registration-page lookup.
4. The parser prefers the explicit overall-average element, reads assignment names/identities from the assignment anchor, strips script/style text from cell extraction, accepts well-formed grouped numbers, retains zero/non-numeric total-point text, and recognizes EXC without manufacturing numeric scores.
5. A remaining schema failure returns bounded schema-field paths/codes only. Development mode stores only the last code/stage/field-path diagnostic in `.next/hac-validation-diagnostic.json`; no upstream messages, values, HTML, usernames, passwords, IDs or cookies enter it. A successful validated sync replaces it with SYNC_OK / complete. Production does not write this diagnostic file.

## Observed versus pending

The two old-schema failures were reproduced using synthetic, test-only school-shaped HTML. These regressions and source-profile/backup round trips are covered by tests. No actual authenticated user page was read by development tools; the user's precise failed field has not yet been observed. A private in-app retry is needed to confirm this repair on the user's district. If another schema constraint is involved, the new Record fields line identifies it without sharing academic values.

## Reusable maintenance prompt

```text
Continue Gradelarp HAC from the latest schema-field diagnostic. Preserve actual source text, distinguish category weight from percentage, keep school-reported averages authoritative, and retain genuine manual profiles. Never request credentials in chat or log school values. Reproduce the identified field with sanitized test-only HTML, fix the parser/schema contract, verify profile/backup persistence and desktop/mobile UI, and record whether the user's real in-app sync actually succeeded. Do not equate passing fixtures or public login-page checks with authenticated integration success.
```
