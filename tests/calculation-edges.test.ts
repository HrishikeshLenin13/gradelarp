import { describe, it, expect } from 'vitest';
import { requiredScore, semesterProgress } from '../src/lib/calculations';
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
