import { describe, it, expect } from 'vitest';
import { requiredScore } from '../src/lib/calculations';
import type { Course, Assignment } from '../src/lib/model';
const assignment = { id:'a', categoryId:'c', possible:100, earned:0, status:'planned', name:'Final' } as Assignment;
const course = { id:'c', mode:'points', assignments:[], categories:[] } as unknown as Course;

describe('what-if input bounds', () => {
  it('does not invent scores for invalid targets or zero-point work', () => {
    for (const target of [NaN, Infinity, -Infinity]) expect(requiredScore(course, assignment, target)).toBeNull();
    expect(requiredScore(course, {...assignment, possible:0}, 80)).toBeNull();
    expect(requiredScore(course, assignment, 80)).toBe(80);
    expect(requiredScore(course, assignment, 101)).toBeNull();
  });
});
