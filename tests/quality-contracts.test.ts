import {it as test} from 'vitest';
import assert from 'node:assert/strict';
// Dynamic loading deliberately exercises runtime guards with malformed input records.
const sourcePath = '../src/lib/calculations.ts';
const api = await import(sourcePath);
import {defaultPolicy} from '../src/lib/model';
const work={id:'a',name:'Work',categoryId:'c',status:'graded',earned:80,possible:100};
const course={id:'c',mode:'points',credits:1,level:'Regular',categories:[{id:'c',weight:100}],assignments:[work]};
const now=new Date(2026,9,23,12);

test("calendar-planning-boundary-1", () => {
const now=new Date("2026-03-06T12:00:00");assert.equal(api.semesterDaysRemaining("2026-03-10",now),4);assert.equal(api.semesterWeekdaysRemaining("2026-03-10",now),2);assert.equal(api.semesterStudyDaysRemaining("2026-03-10",now,[0,1,2,3,4,5,6]),4);
});

test("calendar-planning-boundary-2", () => {
const now=new Date("2026-10-30T12:00:00");assert.equal(api.semesterDaysRemaining("2026-11-03",now),4);assert.equal(api.semesterWeekdaysRemaining("2026-11-03",now),2);assert.equal(api.semesterStudyDaysRemaining("2026-11-03",now,[0,1,2,3,4,5,6]),4);
});

test("calendar-planning-boundary-3", () => {
const now=new Date("2024-02-27T12:00:00");assert.equal(api.semesterDaysRemaining("2024-03-03",now),5);assert.equal(api.semesterWeekdaysRemaining("2024-03-03",now),3);assert.equal(api.semesterStudyDaysRemaining("2024-03-03",now,[0,1,2,3,4,5,6]),5);
});

test("calendar-planning-boundary-4", () => {
const now=new Date("2026-12-29T12:00:00");assert.equal(api.semesterDaysRemaining("2027-01-04",now),6);assert.equal(api.semesterWeekdaysRemaining("2027-01-04",now),4);assert.equal(api.semesterStudyDaysRemaining("2027-01-04",now,[0,1,2,3,4,5,6]),6);
});

test("calendar-planning-boundary-5", () => {
const now=new Date("2026-01-01T12:00:00");assert.equal(api.semesterDaysRemaining("2026-01-01",now),0);assert.equal(api.semesterWeekdaysRemaining("2026-01-01",now),0);assert.equal(api.semesterStudyDaysRemaining("2026-01-01",now,[0,1,2,3,4,5,6]),0);
});

test("calendar-planning-boundary-6", () => {
const now=new Date("2026-01-03T12:00:00");assert.equal(api.semesterDaysRemaining("2026-01-02",now),0);assert.equal(api.semesterWeekdaysRemaining("2026-01-02",now),0);assert.equal(api.semesterStudyDaysRemaining("2026-01-02",now,[0,1,2,3,4,5,6]),0);
});

test("calendar-planning-boundary-7", () => {
const now=new Date("2026-10-27T12:00:00");assert.equal(api.semesterDaysRemaining("2026-11-27",now),31);assert.equal(api.semesterWeekdaysRemaining("2026-11-27",now),23);assert.equal(api.semesterStudyDaysRemaining("2026-11-27",now,[0,1,2,3,4,5,6]),31);
});

test("calendar-planning-boundary-8", () => {
const now=new Date("2026-01-31T12:00:00");assert.equal(api.semesterDaysRemaining("2026-02-28",now),28);assert.equal(api.semesterWeekdaysRemaining("2026-02-28",now),20);assert.equal(api.semesterStudyDaysRemaining("2026-02-28",now,[0,1,2,3,4,5,6]),28);
});

test("calendar-planning-boundary-9", () => {
const now=new Date("2024-02-28T12:00:00");assert.equal(api.semesterDaysRemaining("2024-02-29",now),1);assert.equal(api.semesterWeekdaysRemaining("2024-02-29",now),1);assert.equal(api.semesterStudyDaysRemaining("2024-02-29",now,[0,1,2,3,4,5,6]),1);
});

test("calendar-planning-boundary-10", () => {
const now=new Date("2100-02-28T12:00:00");assert.equal(api.semesterDaysRemaining("2100-03-02",now),2);assert.equal(api.semesterWeekdaysRemaining("2100-03-02",now),2);assert.equal(api.semesterStudyDaysRemaining("2100-03-02",now,[0,1,2,3,4,5,6]),2);
});

test("calendar-planning-boundary-11", () => {
const now=new Date("2000-02-28T12:00:00");assert.equal(api.semesterDaysRemaining("2000-03-02",now),3);assert.equal(api.semesterWeekdaysRemaining("2000-03-02",now),3);assert.equal(api.semesterStudyDaysRemaining("2000-03-02",now,[0,1,2,3,4,5,6]),3);
});

test("calendar-planning-boundary-12", () => {
const now=new Date("2026-10-27T12:00:00");assert.equal(api.semesterDaysRemaining("2026-11-10",now),14);assert.equal(api.semesterWeekdaysRemaining("2026-11-10",now),10);assert.equal(api.semesterStudyDaysRemaining("2026-11-10",now,[0,1,2,3,4,5,6]),14);
});

test("calendar-planning-boundary-13", () => {
const now=new Date("2026-10-31T12:00:00");assert.equal(api.semesterDaysRemaining("2026-11-01",now),1);assert.equal(api.semesterWeekdaysRemaining("2026-11-01",now),0);assert.equal(api.semesterStudyDaysRemaining("2026-11-01",now,[0,1,2,3,4,5,6]),1);
});

test("calendar-planning-boundary-14", () => {
const now=new Date("2026-03-07T12:00:00");assert.equal(api.semesterDaysRemaining("2026-03-08",now),1);assert.equal(api.semesterWeekdaysRemaining("2026-03-08",now),0);assert.equal(api.semesterStudyDaysRemaining("2026-03-08",now,[0,1,2,3,4,5,6]),1);
});

test("calendar-planning-boundary-15", () => {
const now=new Date("2026-04-30T12:00:00");assert.equal(api.semesterDaysRemaining("2026-05-04",now),4);assert.equal(api.semesterWeekdaysRemaining("2026-05-04",now),2);assert.equal(api.semesterStudyDaysRemaining("2026-05-04",now,[0,1,2,3,4,5,6]),4);
});

test("selected-weekdays-set-1", () => {
const days=[];const value=api.semesterStudyDaysRemaining('2026-11-10',new Date(2026,9,27,12),days);assert.equal(value,0);assert.equal(api.semesterStudyDaysRemaining('2026-11-10',new Date(2026,9,27,12),days,['invalid','2026-10-27','2026-11-11']),value);
});

test("selected-weekdays-set-2", () => {
const days=[0];const value=api.semesterStudyDaysRemaining('2026-11-10',new Date(2026,9,27,12),days);assert.equal(value,2);assert.equal(api.semesterStudyDaysRemaining('2026-11-10',new Date(2026,9,27,12),days,['invalid','2026-10-27','2026-11-11']),value);
});

test("selected-weekdays-set-3", () => {
const days=[1];const value=api.semesterStudyDaysRemaining('2026-11-10',new Date(2026,9,27,12),days);assert.equal(value,2);assert.equal(api.semesterStudyDaysRemaining('2026-11-10',new Date(2026,9,27,12),days,['invalid','2026-10-27','2026-11-11']),value);
});

test("selected-weekdays-set-4", () => {
const days=[2];const value=api.semesterStudyDaysRemaining('2026-11-10',new Date(2026,9,27,12),days);assert.equal(value,2);assert.equal(api.semesterStudyDaysRemaining('2026-11-10',new Date(2026,9,27,12),days,['invalid','2026-10-27','2026-11-11']),value);
});

test("selected-weekdays-set-5", () => {
const days=[3];const value=api.semesterStudyDaysRemaining('2026-11-10',new Date(2026,9,27,12),days);assert.equal(value,2);assert.equal(api.semesterStudyDaysRemaining('2026-11-10',new Date(2026,9,27,12),days,['invalid','2026-10-27','2026-11-11']),value);
});

test("selected-weekdays-set-6", () => {
const days=[4];const value=api.semesterStudyDaysRemaining('2026-11-10',new Date(2026,9,27,12),days);assert.equal(value,2);assert.equal(api.semesterStudyDaysRemaining('2026-11-10',new Date(2026,9,27,12),days,['invalid','2026-10-27','2026-11-11']),value);
});

test("selected-weekdays-set-7", () => {
const days=[5];const value=api.semesterStudyDaysRemaining('2026-11-10',new Date(2026,9,27,12),days);assert.equal(value,2);assert.equal(api.semesterStudyDaysRemaining('2026-11-10',new Date(2026,9,27,12),days,['invalid','2026-10-27','2026-11-11']),value);
});

test("selected-weekdays-set-8", () => {
const days=[6];const value=api.semesterStudyDaysRemaining('2026-11-10',new Date(2026,9,27,12),days);assert.equal(value,2);assert.equal(api.semesterStudyDaysRemaining('2026-11-10',new Date(2026,9,27,12),days,['invalid','2026-10-27','2026-11-11']),value);
});

test("selected-weekdays-set-9", () => {
const days=[0, 6];const value=api.semesterStudyDaysRemaining('2026-11-10',new Date(2026,9,27,12),days);assert.equal(value,4);assert.equal(api.semesterStudyDaysRemaining('2026-11-10',new Date(2026,9,27,12),days,['invalid','2026-10-27','2026-11-11']),value);
});

test("selected-weekdays-set-10", () => {
const days=[1, 2, 3, 4, 5];const value=api.semesterStudyDaysRemaining('2026-11-10',new Date(2026,9,27,12),days);assert.equal(value,10);assert.equal(api.semesterStudyDaysRemaining('2026-11-10',new Date(2026,9,27,12),days,['invalid','2026-10-27','2026-11-11']),value);
});

test("selected-weekdays-set-11", () => {
const days=[0, 1, 2, 3, 4, 5, 6];const value=api.semesterStudyDaysRemaining('2026-11-10',new Date(2026,9,27,12),days);assert.equal(value,14);assert.equal(api.semesterStudyDaysRemaining('2026-11-10',new Date(2026,9,27,12),days,['invalid','2026-10-27','2026-11-11']),value);
});

test("selected-weekdays-set-12", () => {
const days=[1, 1, 1];const value=api.semesterStudyDaysRemaining('2026-11-10',new Date(2026,9,27,12),days);assert.equal(value,2);assert.equal(api.semesterStudyDaysRemaining('2026-11-10',new Date(2026,9,27,12),days,['invalid','2026-10-27','2026-11-11']),value);
});

test("selected-weekdays-set-13", () => {
const days=[0, 2, 4, 6];const value=api.semesterStudyDaysRemaining('2026-11-10',new Date(2026,9,27,12),days);assert.equal(value,8);assert.equal(api.semesterStudyDaysRemaining('2026-11-10',new Date(2026,9,27,12),days,['invalid','2026-10-27','2026-11-11']),value);
});

test("selected-weekdays-set-14", () => {
const days=[1, 3, 5];const value=api.semesterStudyDaysRemaining('2026-11-10',new Date(2026,9,27,12),days);assert.equal(value,6);assert.equal(api.semesterStudyDaysRemaining('2026-11-10',new Date(2026,9,27,12),days,['invalid','2026-10-27','2026-11-11']),value);
});

test("selected-weekdays-set-15", () => {
const days=[5, 6];const value=api.semesterStudyDaysRemaining('2026-11-10',new Date(2026,9,27,12),days);assert.equal(value,4);assert.equal(api.semesterStudyDaysRemaining('2026-11-10',new Date(2026,9,27,12),days,['invalid','2026-10-27','2026-11-11']),value);
});

test("points-scenario-range-1", () => {
const assignment={...work,id:'new',possible:100,status:'future'};const input={...course,assignments:[{...work,earned:50},assignment]};const copy=JSON.stringify(input);const projected=api.scenarioCourse(input,assignment,0);assert.ok(Math.abs(api.courseGrade(projected)-25.0)<1e-9);assert.deepEqual(api.assignmentGradeRange(input,assignment),{minimum:25,maximum:75});assert.equal(JSON.stringify(input),copy);assert.equal(projected.assignments.length,2);
});

test("points-scenario-range-2", () => {
const assignment={...work,id:'new',possible:100,status:'future'};const input={...course,assignments:[{...work,earned:50},assignment]};const copy=JSON.stringify(input);const projected=api.scenarioCourse(input,assignment,1);assert.ok(Math.abs(api.courseGrade(projected)-25.5)<1e-9);assert.deepEqual(api.assignmentGradeRange(input,assignment),{minimum:25,maximum:75});assert.equal(JSON.stringify(input),copy);assert.equal(projected.assignments.length,2);
});

test("points-scenario-range-3", () => {
const assignment={...work,id:'new',possible:100,status:'future'};const input={...course,assignments:[{...work,earned:50},assignment]};const copy=JSON.stringify(input);const projected=api.scenarioCourse(input,assignment,10);assert.ok(Math.abs(api.courseGrade(projected)-30.0)<1e-9);assert.deepEqual(api.assignmentGradeRange(input,assignment),{minimum:25,maximum:75});assert.equal(JSON.stringify(input),copy);assert.equal(projected.assignments.length,2);
});

test("points-scenario-range-4", () => {
const assignment={...work,id:'new',possible:100,status:'future'};const input={...course,assignments:[{...work,earned:50},assignment]};const copy=JSON.stringify(input);const projected=api.scenarioCourse(input,assignment,25);assert.ok(Math.abs(api.courseGrade(projected)-37.5)<1e-9);assert.deepEqual(api.assignmentGradeRange(input,assignment),{minimum:25,maximum:75});assert.equal(JSON.stringify(input),copy);assert.equal(projected.assignments.length,2);
});

test("points-scenario-range-5", () => {
const assignment={...work,id:'new',possible:100,status:'future'};const input={...course,assignments:[{...work,earned:50},assignment]};const copy=JSON.stringify(input);const projected=api.scenarioCourse(input,assignment,33.33);assert.ok(Math.abs(api.courseGrade(projected)-41.665)<1e-9);assert.deepEqual(api.assignmentGradeRange(input,assignment),{minimum:25,maximum:75});assert.equal(JSON.stringify(input),copy);assert.equal(projected.assignments.length,2);
});

test("points-scenario-range-6", () => {
const assignment={...work,id:'new',possible:100,status:'future'};const input={...course,assignments:[{...work,earned:50},assignment]};const copy=JSON.stringify(input);const projected=api.scenarioCourse(input,assignment,49.99);assert.ok(Math.abs(api.courseGrade(projected)-49.995000000000005)<1e-9);assert.deepEqual(api.assignmentGradeRange(input,assignment),{minimum:25,maximum:75});assert.equal(JSON.stringify(input),copy);assert.equal(projected.assignments.length,2);
});

test("points-scenario-range-7", () => {
const assignment={...work,id:'new',possible:100,status:'future'};const input={...course,assignments:[{...work,earned:50},assignment]};const copy=JSON.stringify(input);const projected=api.scenarioCourse(input,assignment,50);assert.ok(Math.abs(api.courseGrade(projected)-50.0)<1e-9);assert.deepEqual(api.assignmentGradeRange(input,assignment),{minimum:25,maximum:75});assert.equal(JSON.stringify(input),copy);assert.equal(projected.assignments.length,2);
});

test("points-scenario-range-8", () => {
const assignment={...work,id:'new',possible:100,status:'future'};const input={...course,assignments:[{...work,earned:50},assignment]};const copy=JSON.stringify(input);const projected=api.scenarioCourse(input,assignment,60);assert.ok(Math.abs(api.courseGrade(projected)-55.0)<1e-9);assert.deepEqual(api.assignmentGradeRange(input,assignment),{minimum:25,maximum:75});assert.equal(JSON.stringify(input),copy);assert.equal(projected.assignments.length,2);
});

test("points-scenario-range-9", () => {
const assignment={...work,id:'new',possible:100,status:'future'};const input={...course,assignments:[{...work,earned:50},assignment]};const copy=JSON.stringify(input);const projected=api.scenarioCourse(input,assignment,69.99);assert.ok(Math.abs(api.courseGrade(projected)-59.995)<1e-9);assert.deepEqual(api.assignmentGradeRange(input,assignment),{minimum:25,maximum:75});assert.equal(JSON.stringify(input),copy);assert.equal(projected.assignments.length,2);
});

test("points-scenario-range-10", () => {
const assignment={...work,id:'new',possible:100,status:'future'};const input={...course,assignments:[{...work,earned:50},assignment]};const copy=JSON.stringify(input);const projected=api.scenarioCourse(input,assignment,70);assert.ok(Math.abs(api.courseGrade(projected)-60.0)<1e-9);assert.deepEqual(api.assignmentGradeRange(input,assignment),{minimum:25,maximum:75});assert.equal(JSON.stringify(input),copy);assert.equal(projected.assignments.length,2);
});

test("points-scenario-range-11", () => {
const assignment={...work,id:'new',possible:100,status:'future'};const input={...course,assignments:[{...work,earned:50},assignment]};const copy=JSON.stringify(input);const projected=api.scenarioCourse(input,assignment,79.99);assert.ok(Math.abs(api.courseGrade(projected)-64.995)<1e-9);assert.deepEqual(api.assignmentGradeRange(input,assignment),{minimum:25,maximum:75});assert.equal(JSON.stringify(input),copy);assert.equal(projected.assignments.length,2);
});

test("points-scenario-range-12", () => {
const assignment={...work,id:'new',possible:100,status:'future'};const input={...course,assignments:[{...work,earned:50},assignment]};const copy=JSON.stringify(input);const projected=api.scenarioCourse(input,assignment,80);assert.ok(Math.abs(api.courseGrade(projected)-65.0)<1e-9);assert.deepEqual(api.assignmentGradeRange(input,assignment),{minimum:25,maximum:75});assert.equal(JSON.stringify(input),copy);assert.equal(projected.assignments.length,2);
});

test("points-scenario-range-13", () => {
const assignment={...work,id:'new',possible:100,status:'future'};const input={...course,assignments:[{...work,earned:50},assignment]};const copy=JSON.stringify(input);const projected=api.scenarioCourse(input,assignment,89.99);assert.ok(Math.abs(api.courseGrade(projected)-69.995)<1e-9);assert.deepEqual(api.assignmentGradeRange(input,assignment),{minimum:25,maximum:75});assert.equal(JSON.stringify(input),copy);assert.equal(projected.assignments.length,2);
});

test("points-scenario-range-14", () => {
const assignment={...work,id:'new',possible:100,status:'future'};const input={...course,assignments:[{...work,earned:50},assignment]};const copy=JSON.stringify(input);const projected=api.scenarioCourse(input,assignment,90);assert.ok(Math.abs(api.courseGrade(projected)-70.0)<1e-9);assert.deepEqual(api.assignmentGradeRange(input,assignment),{minimum:25,maximum:75});assert.equal(JSON.stringify(input),copy);assert.equal(projected.assignments.length,2);
});

test("points-scenario-range-15", () => {
const assignment={...work,id:'new',possible:100,status:'future'};const input={...course,assignments:[{...work,earned:50},assignment]};const copy=JSON.stringify(input);const projected=api.scenarioCourse(input,assignment,100);assert.ok(Math.abs(api.courseGrade(projected)-75.0)<1e-9);assert.deepEqual(api.assignmentGradeRange(input,assignment),{minimum:25,maximum:75});assert.equal(JSON.stringify(input),copy);assert.equal(projected.assignments.length,2);
});

test("weighted-category-renormalization-1", () => {
const c={...course,mode:'weighted',categories:[{id:'a',weight:0},{id:'b',weight:100}],assignments:[{...work,id:'one',categoryId:'a',earned:80},{...work,id:'two',categoryId:'b',earned:20}]};assert.ok(Math.abs(api.courseGrade(c)-20.0)<1e-9);assert.ok(Math.abs(api.courseGrade({...c,categories:c.categories.map((x:{id:string;weight:number})=>({...x,weight:x.weight*2}))})-20.0)<1e-9);
});

test("weighted-category-renormalization-2", () => {
const c={...course,mode:'weighted',categories:[{id:'a',weight:10},{id:'b',weight:90}],assignments:[{...work,id:'one',categoryId:'a',earned:80},{...work,id:'two',categoryId:'b',earned:20}]};assert.ok(Math.abs(api.courseGrade(c)-26.0)<1e-9);assert.ok(Math.abs(api.courseGrade({...c,categories:c.categories.map((x:{id:string;weight:number})=>({...x,weight:x.weight*2}))})-26.0)<1e-9);
});

test("weighted-category-renormalization-3", () => {
const c={...course,mode:'weighted',categories:[{id:'a',weight:20},{id:'b',weight:80}],assignments:[{...work,id:'one',categoryId:'a',earned:80},{...work,id:'two',categoryId:'b',earned:20}]};assert.ok(Math.abs(api.courseGrade(c)-32.0)<1e-9);assert.ok(Math.abs(api.courseGrade({...c,categories:c.categories.map((x:{id:string;weight:number})=>({...x,weight:x.weight*2}))})-32.0)<1e-9);
});

test("weighted-category-renormalization-4", () => {
const c={...course,mode:'weighted',categories:[{id:'a',weight:25},{id:'b',weight:75}],assignments:[{...work,id:'one',categoryId:'a',earned:80},{...work,id:'two',categoryId:'b',earned:20}]};assert.ok(Math.abs(api.courseGrade(c)-35.0)<1e-9);assert.ok(Math.abs(api.courseGrade({...c,categories:c.categories.map((x:{id:string;weight:number})=>({...x,weight:x.weight*2}))})-35.0)<1e-9);
});

test("weighted-category-renormalization-5", () => {
const c={...course,mode:'weighted',categories:[{id:'a',weight:33},{id:'b',weight:67}],assignments:[{...work,id:'one',categoryId:'a',earned:80},{...work,id:'two',categoryId:'b',earned:20}]};assert.ok(Math.abs(api.courseGrade(c)-39.8)<1e-9);assert.ok(Math.abs(api.courseGrade({...c,categories:c.categories.map((x:{id:string;weight:number})=>({...x,weight:x.weight*2}))})-39.8)<1e-9);
});

test("weighted-category-renormalization-6", () => {
const c={...course,mode:'weighted',categories:[{id:'a',weight:40},{id:'b',weight:60}],assignments:[{...work,id:'one',categoryId:'a',earned:80},{...work,id:'two',categoryId:'b',earned:20}]};assert.ok(Math.abs(api.courseGrade(c)-44.0)<1e-9);assert.ok(Math.abs(api.courseGrade({...c,categories:c.categories.map((x:{id:string;weight:number})=>({...x,weight:x.weight*2}))})-44.0)<1e-9);
});

test("weighted-category-renormalization-7", () => {
const c={...course,mode:'weighted',categories:[{id:'a',weight:50},{id:'b',weight:50}],assignments:[{...work,id:'one',categoryId:'a',earned:80},{...work,id:'two',categoryId:'b',earned:20}]};assert.ok(Math.abs(api.courseGrade(c)-50.0)<1e-9);assert.ok(Math.abs(api.courseGrade({...c,categories:c.categories.map((x:{id:string;weight:number})=>({...x,weight:x.weight*2}))})-50.0)<1e-9);
});

test("weighted-category-renormalization-8", () => {
const c={...course,mode:'weighted',categories:[{id:'a',weight:60},{id:'b',weight:40}],assignments:[{...work,id:'one',categoryId:'a',earned:80},{...work,id:'two',categoryId:'b',earned:20}]};assert.ok(Math.abs(api.courseGrade(c)-56.0)<1e-9);assert.ok(Math.abs(api.courseGrade({...c,categories:c.categories.map((x:{id:string;weight:number})=>({...x,weight:x.weight*2}))})-56.0)<1e-9);
});

test("weighted-category-renormalization-9", () => {
const c={...course,mode:'weighted',categories:[{id:'a',weight:67},{id:'b',weight:33}],assignments:[{...work,id:'one',categoryId:'a',earned:80},{...work,id:'two',categoryId:'b',earned:20}]};assert.ok(Math.abs(api.courseGrade(c)-60.2)<1e-9);assert.ok(Math.abs(api.courseGrade({...c,categories:c.categories.map((x:{id:string;weight:number})=>({...x,weight:x.weight*2}))})-60.2)<1e-9);
});

test("weighted-category-renormalization-10", () => {
const c={...course,mode:'weighted',categories:[{id:'a',weight:75},{id:'b',weight:25}],assignments:[{...work,id:'one',categoryId:'a',earned:80},{...work,id:'two',categoryId:'b',earned:20}]};assert.ok(Math.abs(api.courseGrade(c)-65.0)<1e-9);assert.ok(Math.abs(api.courseGrade({...c,categories:c.categories.map((x:{id:string;weight:number})=>({...x,weight:x.weight*2}))})-65.0)<1e-9);
});

test("weighted-category-renormalization-11", () => {
const c={...course,mode:'weighted',categories:[{id:'a',weight:80},{id:'b',weight:20}],assignments:[{...work,id:'one',categoryId:'a',earned:80},{...work,id:'two',categoryId:'b',earned:20}]};assert.ok(Math.abs(api.courseGrade(c)-68.0)<1e-9);assert.ok(Math.abs(api.courseGrade({...c,categories:c.categories.map((x:{id:string;weight:number})=>({...x,weight:x.weight*2}))})-68.0)<1e-9);
});

test("weighted-category-renormalization-12", () => {
const c={...course,mode:'weighted',categories:[{id:'a',weight:90},{id:'b',weight:10}],assignments:[{...work,id:'one',categoryId:'a',earned:80},{...work,id:'two',categoryId:'b',earned:20}]};assert.ok(Math.abs(api.courseGrade(c)-74.0)<1e-9);assert.ok(Math.abs(api.courseGrade({...c,categories:c.categories.map((x:{id:string;weight:number})=>({...x,weight:x.weight*2}))})-74.0)<1e-9);
});

test("weighted-category-renormalization-13", () => {
const c={...course,mode:'weighted',categories:[{id:'a',weight:100},{id:'b',weight:0}],assignments:[{...work,id:'one',categoryId:'a',earned:80},{...work,id:'two',categoryId:'b',earned:20}]};assert.ok(Math.abs(api.courseGrade(c)-80.0)<1e-9);assert.ok(Math.abs(api.courseGrade({...c,categories:c.categories.map((x:{id:string;weight:number})=>({...x,weight:x.weight*2}))})-80.0)<1e-9);
});

test("weighted-category-renormalization-14", () => {
const c={...course,mode:'weighted',categories:[{id:'a',weight:1},{id:'b',weight:99}],assignments:[{...work,id:'one',categoryId:'a',earned:80},{...work,id:'two',categoryId:'b',earned:20}]};assert.ok(Math.abs(api.courseGrade(c)-20.6)<1e-9);assert.ok(Math.abs(api.courseGrade({...c,categories:c.categories.map((x:{id:string;weight:number})=>({...x,weight:x.weight*2}))})-20.6)<1e-9);
});

test("weighted-category-renormalization-15", () => {
const c={...course,mode:'weighted',categories:[{id:'a',weight:99},{id:'b',weight:1}],assignments:[{...work,id:'one',categoryId:'a',earned:80},{...work,id:'two',categoryId:'b',earned:20}]};assert.ok(Math.abs(api.courseGrade(c)-79.4)<1e-9);assert.ok(Math.abs(api.courseGrade({...c,categories:c.categories.map((x:{id:string;weight:number})=>({...x,weight:x.weight*2}))})-79.4)<1e-9);
});

test("assignment-status-graded-1", () => {
const a={...work,status:"graded",earned:null};assert.equal(api.assignmentPercent(a),null);assert.equal(api.included(a),true);assert.equal(api.snapshotScores([{...course,assignments:[a]}]).assignments.c.a.percent,null);
});

test("assignment-status-graded-2", () => {
const a={...work,status:"graded",earned:0};assert.equal(api.assignmentPercent(a),0);assert.equal(api.included(a),true);assert.equal(api.snapshotScores([{...course,assignments:[a]}]).assignments.c.a.percent,0);
});

test("assignment-status-graded-3", () => {
const a={...work,status:"graded",earned:80};assert.equal(api.assignmentPercent(a),80);assert.equal(api.included(a),true);assert.equal(api.snapshotScores([{...course,assignments:[a]}]).assignments.c.a.percent,80);
});

test("assignment-status-missing-1", () => {
const a={...work,status:"missing",earned:null};assert.equal(api.assignmentPercent(a),0);assert.equal(api.included(a),true);assert.equal(api.snapshotScores([{...course,assignments:[a]}]).assignments.c.a.percent,0);
});

test("assignment-status-missing-2", () => {
const a={...work,status:"missing",earned:0};assert.equal(api.assignmentPercent(a),0);assert.equal(api.included(a),true);assert.equal(api.snapshotScores([{...course,assignments:[a]}]).assignments.c.a.percent,0);
});

test("assignment-status-missing-3", () => {
const a={...work,status:"missing",earned:80};assert.equal(api.assignmentPercent(a),0);assert.equal(api.included(a),true);assert.equal(api.snapshotScores([{...course,assignments:[a]}]).assignments.c.a.percent,0);
});

test("assignment-status-ungraded-1", () => {
const a={...work,status:"ungraded",earned:null};assert.equal(api.assignmentPercent(a),null);assert.equal(api.included(a),false);assert.equal(api.snapshotScores([{...course,assignments:[a]}]).assignments.c.a.percent,null);
});

test("assignment-status-ungraded-2", () => {
const a={...work,status:"ungraded",earned:0};assert.equal(api.assignmentPercent(a),null);assert.equal(api.included(a),false);assert.equal(api.snapshotScores([{...course,assignments:[a]}]).assignments.c.a.percent,null);
});

test("assignment-status-ungraded-3", () => {
const a={...work,status:"ungraded",earned:80};assert.equal(api.assignmentPercent(a),null);assert.equal(api.included(a),false);assert.equal(api.snapshotScores([{...course,assignments:[a]}]).assignments.c.a.percent,null);
});

test("assignment-status-future-1", () => {
const a={...work,status:"future",earned:0};assert.equal(api.assignmentPercent(a),null);assert.equal(api.included(a),false);assert.equal(api.snapshotScores([{...course,assignments:[a]}]).assignments.c.a.percent,null);
});
