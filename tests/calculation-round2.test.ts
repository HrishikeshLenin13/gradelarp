import { it, expect } from 'vitest';
import * as api from '../src/lib/calculations';
import type { Course, Assignment, GpaPolicy } from '../src/lib/model';
const assignment={id:'a',categoryId:'work',possible:100,earned:null,status:'future',name:'Final',due:'2026-12-01'} as Assignment;
const course={id:'c',mode:'points',assignments:[],categories:[{id:'work',weight:100}]} as unknown as Course;
it('counts weekdays and explicit exclusions once', () => { const now=new Date(2026,9,23,12); expect(api.semesterWeekdaysRemaining('2026-10-30',now)).toBe(5); expect(api.semesterWeekdaysRemaining('2026-10-30',now,['2026-10-26','2026-10-26','2026-10-25'])).toBe(4); expect(api.semesterWeekdaysRemaining('bad',now)).toBeNull(); });
it('normalizes snapshot percentages by assignment state', () => { expect(api.assignmentPercent({...assignment,status:'graded',earned:40,possible:50})).toBe(80); expect(api.assignmentPercent({...assignment,status:'missing',earned:99})).toBe(0); expect(api.assignmentPercent({...assignment,status:'graded',earned:1,possible:0})).toBeNull(); });
it('excludes invalid credits from GPA totals', () => { const policy={scale:[{min:0,points:4,letter:'A'}],bonusMinimum:90,apBonus:1,honorsBonus:.5} as GpaPolicy; for (const credits of [0,-1,NaN,Infinity]) expect(api.gpa([{...course,credits,assignments:[{...assignment,status:'graded',earned:100}]}],policy)).toBeNull(); });
it('reports attainable bounds without changing saved assignments', () => { expect(api.assignmentGradeRange(course,assignment)).toEqual({minimum:0,maximum:100}); expect(course.assignments).toHaveLength(0); expect(api.assignmentGradeRange(course,{...assignment,possible:0})).toBeNull(); });
it('solves linear targets across a score range', () => { for (let target=0;target<=100;target++) expect(api.requiredScore(course,assignment,target)).toBe(target); expect(api.requiredScore(course,assignment,101)).toBeNull(); });

it('weekday arithmetic matches an independent local-calendar walk across month and DST boundaries', () => {
  for(const month of [1,2,9,10,11]) for(let start=1;start<=28;start+=3) for(const days of [0,1,6,7,8,29,60]) {
    const now=new Date(2026,month,start,12), end=new Date(now);end.setDate(end.getDate()+days);
    const key=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    let expected=0;
    for(let offset=1;offset<=days;offset++) {const d=new Date(now);d.setDate(d.getDate()+offset);if(d.getDay()!==0 && d.getDay()!==6) expected++;}
    expect(api.semesterWeekdaysRemaining(key(end),now)).toBe(expected);
  }
});
it('analytic solver agrees with an independent binary-search reference for weighted courses', () => {
  for(const weight of [10,40,90]) {
    const c={...course,mode:'weighted',categories:[{id:'work',weight},{id:'other',weight:100-weight}],assignments:[{...assignment,id:'past',categoryId:'other',status:'graded',earned:75}]} as Course;
    for(let target=0;target<=100;target+=3) {
      const grade=(score:number)=>api.courseGrade(api.scenarioCourse(c,assignment,score))!;
      const actual=api.requiredScore(c,assignment,target);
      if(target>grade(100)+1e-8) {expect(actual).toBeNull();continue;}
      if(grade(0)>=target) {expect(actual).toBe(0);continue;}
      let lo=0,hi=100;for(let i=0;i<60;i++){const mid=(lo+hi)/2;if(grade(mid)>=target)hi=mid;else lo=mid;}
      expect(actual).toBeCloseTo(Math.ceil(hi*100-1e-8)/100,8);
    }
  }
});
