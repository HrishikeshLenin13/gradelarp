import { expect, it } from "vitest";
import { applyScenario } from "../src/product/engine";
import { createDemo } from "./fixtures/demo-data";
import type { Course } from "../src/lib/model";

function fixture(count: number, readId?: () => void) {
  const course = createDemo().courses[0];
  const template = course.assignments[0];
  course.assignments = Array.from({ length: count }, (_, index) => {
    const id = `assignment-${index}`;
    const assignment = { ...template, id };
    if (readId)
      Object.defineProperty(assignment, "id", {
        enumerable: true,
        get() {
          readId();
          return id;
        },
      });
    return assignment;
  });
  const scenario = {
    courseId: course.id,
    changes: Array.from({ length: count }, (_, index) => ({
      assignmentId: `assignment-${index}`,
      earned: 0,
      status: "graded" as const,
    })),
    additions: [],
  };
  return { course, scenario };
}

it("applies a large scenario with linearly bounded source ID reads", () => {
  let reads = 0;
  const { course, scenario } = fixture(1000, () => reads++);
  const before = JSON.stringify(course);
  reads = 0;
  const result = applyScenario(course, scenario);
  const operationReads = reads;
  expect(result.assignments).toHaveLength(1000);
  expect(
    result.assignments.every((assignment) => assignment.earned === 0),
  ).toBe(true);
  expect(JSON.stringify(course)).toBe(before);
  expect(operationReads).toBeLessThan(1000 * 10);
});

it("preserves unchanged records and additions in input order", () => {
  const { course, scenario } = fixture(3);
  const addition = { ...course.assignments[0], id: "addition" };
  const original = structuredClone(course);
  const result = applyScenario(course, {
    ...scenario,
    changes: [scenario.changes[1]],
    additions: [addition],
  });
  expect(result.assignments.map((assignment) => assignment.id)).toEqual([
    "assignment-0",
    "assignment-1",
    "assignment-2",
    "addition",
  ]);
  expect(result.assignments[0]).toEqual(original.assignments[0]);
  expect(result.assignments[1].earned).toBe(0);
  expect(result.assignments[2]).toEqual(original.assignments[2]);
  expect(result.assignments[3]).toEqual(addition);
  expect(course).toEqual(original);
});

it.runIf(process.env.GRADELARP_BENCHMARK === "1")(
  "reports warmed scenario benchmark medians",
  () => {
    const results: { assignments: number; medianMs: number }[] = [];
    for (const count of [100, 1000, 5000]) {
      const { course, scenario } = fixture(count);
      for (let i = 0; i < 5; i++) applyScenario(course, scenario);
      const samples: number[] = [];
      for (let i = 0; i < 15; i++) {
        const start = performance.now();
        const result: Course = applyScenario(course, scenario);
        samples.push(performance.now() - start);
        expect(result.assignments[count - 1].earned).toBe(0);
      }
      samples.sort((a, b) => a - b);
      results.push({
        assignments: count,
        medianMs: Number(samples[7].toFixed(3)),
      });
    }
    process.stdout.write(
      "SCENARIO_BENCHMARK " + JSON.stringify(results) + "\n",
    );
  },
  30_000,
);
