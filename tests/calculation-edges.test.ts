import { describe, it, expect } from 'vitest';
import { requiredScore, semesterProgress, semesterDaysRemaining } from '../src/lib/calculations';
import type { Course, Assignment } from '../src/lib/model';
const assignment = { id:'a', categoryId:'c', possible:100, earned:0, status:'future', name:'Final', due:'2026-12-01' } as Assignment;
const course = { id:'c', mode:'points', assignments:[], categories:[] } as unknown as Course;

describe('what-if input bounds', () => {
  it('does not invent scores for invalid targets or zero-point work', () => {
    for (const target of [NaN, Infinity, -Infinity]) expect(requiredScore(course, assignment, target)).toBeNull();
    expect(requiredScore(course, {...assignment, possible:0}, 80)).toBeNull();
    expect(requiredScore(course, assignment, 80)).toBe(80);
    expect(requiredScore(course, assignment, 101)).toBeNull();
  });
});

it('keeps semester progress finite for invalid or reversed dates', () => {
  expect(semesterProgress('', '', new Date())).toBe(0);
  expect(semesterProgress('2026-12-01', '2026-01-01')).toBe(0);
  expect(semesterProgress('2026-01-01', '2026-12-01', new Date('bad'))).toBe(0);
  expect(semesterProgress('2026-01-01', '2026-12-01', new Date('2025-01-01'))).toBe(0);
  expect(semesterProgress('2026-01-01', '2026-12-01', new Date('2027-01-01'))).toBe(100);
});

it('counts remaining calendar days independently of DST hour lengths', () => {
  expect(semesterDaysRemaining('2026-03-09', new Date(2026, 2, 7, 23))).toBe(2);
  expect(semesterDaysRemaining('2026-10-26', new Date(2026, 9, 26, 12))).toBe(0);
  expect(semesterDaysRemaining('2026-10-25', new Date(2026, 9, 26))).toBe(0);
  for (const date of ['bad', '2026-02-30', '2026-13-01']) expect(semesterDaysRemaining(date)).toBeNull();
});
