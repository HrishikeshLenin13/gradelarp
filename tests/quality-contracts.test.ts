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
