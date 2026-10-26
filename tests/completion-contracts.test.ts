import {it as test} from 'vitest';
import assert from 'node:assert/strict';
// Dynamic loading deliberately exercises runtime guards with malformed input records.
const sourcePath = '../src/lib/calculations.ts';
const api = await import(sourcePath);
import {defaultPolicy} from '../src/lib/model';
const work={id:'a',name:'Work',categoryId:'c',status:'graded',earned:80,possible:100};
const course={id:'c',mode:'points',credits:1,level:'Regular',categories:[{id:'c',weight:100}],assignments:[work]};
const now=new Date(2026,9,23,12);

test("empty-grades-remain-unknown", () => {
assert.equal(api.courseGrade({...course,assignments:[]}),null);assert.equal(api.averageGrade([]),null);
});

test("exclude-future-assignments-from-grade-totals", () => {
assert.equal(api.courseGrade({...course,assignments:[work,{...work,id:'ignored',status:'future',earned:0,possible:900}]}),80);
});

test("exclude-ungraded-assignments-from-grade-totals", () => {
assert.equal(api.courseGrade({...course,assignments:[work,{...work,id:'ignored',status:'ungraded',earned:0,possible:900}]}),80);
});

test("exclude-dropped-assignments-from-grade-totals", () => {
assert.equal(api.courseGrade({...course,assignments:[work,{...work,id:'ignored',status:'dropped',earned:0,possible:900}]}),80);
});

test("exclude-exempt-assignments-from-grade-totals", () => {
assert.equal(api.courseGrade({...course,assignments:[work,{...work,id:'ignored',status:'exempt',earned:0,possible:900}]}),80);
});

test("missing-work-counts-as-zero-earned-points", () => {
assert.equal(api.courseGrade({...course,assignments:[{...work,status:'missing',earned:80}]}),0);
});

test("point-grades-weight-by-possible-points", () => {
assert.equal(api.courseGrade({...course,assignments:[work,{...work,id:'small',earned:0,possible:25}]}),64);
});

test("invalid-included-points-do-not-poison-the-grade", () => {
for(const possible of [-1,NaN,Infinity])assert.equal(api.courseGrade({...course,assignments:[{...work,possible}]}),null);
});

test("nonfinite-earned-points-do-not-produce-infinite-grades", () => {
assert.equal(api.courseGrade({...course,assignments:[{...work,earned:Infinity}]}),null);
});

test("weighted-grades-renormalize-active-categories", () => {
const c={...course,mode:'weighted',categories:[{id:'c',weight:20},{id:'empty',weight:80}]};assert.equal(api.courseGrade(c),80);
});

test("zero-weight-categories-do-not-distort-the-average", () => {
const c={...course,mode:'weighted',categories:[{id:'c',weight:100},{id:'off',weight:0}],assignments:[work,{...work,id:'off',categoryId:'off',earned:0}]};assert.equal(api.courseGrade(c),80);
});

test("duplicate-weighted-category-ids-are-ambiguous", () => {
assert.equal(api.courseGrade({...course,mode:'weighted',categories:[...course.categories,...course.categories]}),null);
});

test("negative-category-weights-are-not-normalized-away", () => {
assert.equal(api.courseGrade({...course,mode:'weighted',categories:[{id:'c',weight:-1}]}),null);
});

test("snapshot-percentages-distinguish-future-and-missing", () => {
assert.equal(api.assignmentPercent({...work,status:'future'}),null);assert.equal(api.assignmentPercent({...work,status:'missing'}),0);
});

test("snapshot-percentages-ignore-invalid-denominators", () => {
for(const possible of [0,-1,Infinity])assert.equal(api.assignmentPercent({...work,possible}),null);
});

test("scenario-replaces-rather-than-duplicates-assignment-id", () => {
const c=api.scenarioCourse(course,work,90);assert.equal(c.assignments.length,1);assert.equal(c.assignments[0].earned,90);assert.equal(work.earned,80);
});

test("scenario-appends-new-assignments-without-mutating-input", () => {
const c=api.scenarioCourse(course,{...work,id:'new'},50);assert.equal(c.assignments.length,2);assert.equal(course.assignments.length,1);
});

test("required-score-reports-unattainable-targets", () => {
assert.equal(api.requiredScore(course,work,101),null);
});

test("required-score-rejects-nonfinite-targets", () => {
for(const target of [NaN,Infinity])assert.equal(api.requiredScore(course,work,target),null);
});

test("required-score-zero-needs-no-positive-points", () => {
assert.equal(api.requiredScore(course,work,0),0);
});

test("attainable-grade-range-preserves-inputs", () => {
const before=JSON.stringify(course);assert.deepEqual(api.assignmentGradeRange(course,work),{minimum:0,maximum:100});assert.equal(JSON.stringify(course),before);
});

test("gpa-excludes-zero-credit-courses", () => {
assert.equal(api.gpa([{...course,credits:0}],defaultPolicy),null);
});

test("gpa-excludes-unknown-grades", () => {
assert.equal(api.gpa([{...course,assignments:[]}],defaultPolicy),null);
});

test("gpa-credit-weighting-matches-quality-points", () => {
const g=api.gpa([course,{...course,id:'second',credits:3}],defaultPolicy);assert.equal(g.credits,4);assert.equal(g.qualityPoints,g.value*4);
});

test("unweighted-gpa-does-not-add-ap-bonuses", () => {
const c={...course,level:'AP',assignments:[{...work,earned:100}]};assert.ok(api.gpa([c],defaultPolicy,true).value>=api.gpa([c],defaultPolicy,false).value);
});

test("cumulative-gpa-rejects-invalid-prior-credit-inputs", () => {
for(const priorCredits of [-1,Infinity,NaN])assert.equal(api.cumulativeGpa([course],{...defaultPolicy,priorCredits}),null);
});

test("cumulative-gpa-rejects-invalid-prior-grade-inputs", () => {
assert.equal(api.cumulativeGpa([course],{...defaultPolicy,priorGpa:NaN}),null);
});

test("grade-letter-keeps-unknown-grades-distinct", () => {
assert.equal(api.gradeLetter(null,defaultPolicy),'—');assert.equal(typeof api.gradeLetter(100,defaultPolicy),'string');
});

test("category-breakdown-preserves-category-order", () => {
assert.deepEqual(api.categoryBreakdown(course).map(c=>c.id),['c']);assert.equal(api.categoryBreakdown(course)[0].earned,80);
});

test("snapshots-are-detached-from-later-assignment-edits", () => {
const c=structuredClone(course),s=api.snapshotScores([c]);c.assignments[0].earned=0;assert.equal(s.grades.c,80);
});

test("invalid-semester-end-dates-remain-unknown", () => {
for(const date of ['bad','2026-02-30','2026-13-01'])assert.equal(api.semesterDaysRemaining(date,now),null);
});

test("past-semester-ends-never-have-negative-remaining-days", () => {
assert.equal(api.semesterDaysRemaining('2026-01-01',now),0);
});

test("calendar-days-exclude-the-current-day", () => {
assert.equal(api.semesterDaysRemaining('2026-10-23',now),0);assert.equal(api.semesterDaysRemaining('2026-10-24',now),1);
});

test("weekday-counts-exclude-weekends", () => {
assert.equal(api.semesterWeekdaysRemaining('2026-10-26',now),1);
});

test("weekday-exclusions-deduplicate-identical-dates", () => {
assert.equal(api.semesterWeekdaysRemaining('2026-10-30',now,['2026-10-26','2026-10-26']),4);
});

test("weekend-exclusions-do-not-remove-weekdays", () => {
assert.equal(api.semesterWeekdaysRemaining('2026-10-30',now,['2026-10-25']),5);
});

test("out-of-range-exclusions-do-not-reduce-the-total", () => {
assert.equal(api.semesterWeekdaysRemaining('2026-10-30',now,['2026-11-01','2026-10-01']),5);
});

test("custom-study-days-can-include-weekends", () => {
assert.equal(api.semesterStudyDaysRemaining('2026-10-30',now,[0,6]),2);
});

test("duplicate-study-weekdays-are-counted-once", () => {
assert.equal(api.semesterStudyDaysRemaining('2026-10-30',now,[1,1,3]),2);
});

test("empty-study-schedules-have-zero-study-days", () => {
assert.equal(api.semesterStudyDaysRemaining('2026-10-30',now,[]),0);
});
