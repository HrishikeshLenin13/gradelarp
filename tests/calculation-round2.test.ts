import { it, expect } from 'vitest';
import * as api from '../src/lib/calculations';
import type { Course, Assignment } from '../src/lib/model';
const assignment={id:'a',categoryId:'work',possible:100,earned:null,status:'future',name:'Final',due:'2026-12-01'} as Assignment;
const course={id:'c',mode:'points',assignments:[],categories:[{id:'work',weight:100}]} as unknown as Course;
it('counts weekdays and explicit exclusions once', () => { const now=new Date(2026,9,23,12); expect(api.semesterWeekdaysRemaining('2026-10-30',now)).toBe(5); expect(api.semesterWeekdaysRemaining('2026-10-30',now,['2026-10-26','2026-10-26','2026-10-25'])).toBe(4); expect(api.semesterWeekdaysRemaining('bad',now)).toBeNull(); });
it('normalizes snapshot percentages by assignment state', () => { expect(api.assignmentPercent({...assignment,status:'graded',earned:40,possible:50})).toBe(80); expect(api.assignmentPercent({...assignment,status:'missing',earned:99})).toBe(0); expect(api.assignmentPercent({...assignment,status:'graded',earned:1,possible:0})).toBeNull(); });
it('excludes invalid credits from GPA totals', () => { const policy={scale:[{min:0,points:4,letter:'A'}],bonusMinimum:90,apBonus:1,honorsBonus:.5} as any; for (const credits of [0,-1,NaN,Infinity]) expect(api.gpa([{...course,credits,assignments:[{...assignment,status:'graded',earned:100}]}],policy)).toBeNull(); });
it('reports attainable bounds without changing saved assignments', () => { expect(api.assignmentGradeRange(course,assignment)).toEqual({minimum:0,maximum:100}); expect(course.assignments).toHaveLength(0); expect(api.assignmentGradeRange(course,{...assignment,possible:0})).toBeNull(); });
