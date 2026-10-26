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
