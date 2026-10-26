import { it, expect } from 'vitest';
import * as api from '../src/lib/calculations';
import type { Course, Assignment } from '../src/lib/model';
const assignment={id:'a',categoryId:'work',possible:100,earned:null,status:'future',name:'Final',due:'2026-12-01'} as Assignment;
const course={id:'c',mode:'points',assignments:[],categories:[{id:'work',weight:100}]} as unknown as Course;
it('counts weekdays and explicit exclusions once', () => { const now=new Date(2026,9,23,12); expect(api.semesterWeekdaysRemaining('2026-10-30',now)).toBe(5); expect(api.semesterWeekdaysRemaining('2026-10-30',now,['2026-10-26','2026-10-26','2026-10-25'])).toBe(4); expect(api.semesterWeekdaysRemaining('bad',now)).toBeNull(); });
