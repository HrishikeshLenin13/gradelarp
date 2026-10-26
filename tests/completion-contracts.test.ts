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
