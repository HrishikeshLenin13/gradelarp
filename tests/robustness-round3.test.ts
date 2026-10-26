import {it,expect} from 'vitest';
import * as api from '../src/lib/calculations';
import {defaultPolicy} from '../src/lib/model';
import type {Course,Assignment} from '../src/lib/model';
const work={id:'a',name:'Work',categoryId:'c',status:'graded',earned:80,possible:100} as Assignment;
const course={id:'c',mode:'points',credits:1,level:'Regular',categories:[{id:'c',weight:100}],assignments:[work]} as unknown as Course;
it('returns unknown rather than poisoned totals for invalid included values',()=>{for(const possible of [NaN,Infinity,-1])expect(api.courseGrade({...course,assignments:[{...work,possible}]})).toBeNull();expect(api.courseGrade({...course,assignments:[{...work,earned:Infinity}]})).toBeNull();expect(api.courseGrade({...course,assignments:[work,{...work,id:'extra',possible:0,earned:5}]})).toBe(85);});
it('rejects ambiguous duplicate or nonfinite weighted category definitions',()=>{const weighted={...course,mode:'weighted'} as Course;expect(api.courseGrade({...weighted,categories:[...course.categories,...course.categories]})).toBeNull();expect(api.courseGrade({...weighted,categories:[{...course.categories[0],weight:Infinity}]})).toBeNull();expect(api.courseGrade(weighted)).toBe(80);});
it('supports customized study schedules without double counting weekdays',()=>{const now=new Date(2026,9,23,12);expect(api.semesterStudyDaysRemaining('2026-10-30',now,[1,3,5])).toBe(3);expect(api.semesterStudyDaysRemaining('2026-10-30',now,[1,1,3,5],['2026-10-26'])).toBe(2);expect(api.semesterStudyDaysRemaining('2026-10-30',now,[])).toBe(0);expect(()=>api.semesterStudyDaysRemaining('2026-10-30',now,[7])).toThrow();});
