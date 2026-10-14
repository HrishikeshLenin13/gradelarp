import {
  defaultPolicy,
  defaultSettings,
  type AppState,
  type Course,
  type Assignment,
} from "./model";
import { snapshotScores } from "./calculations";
function date(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function createDemo(): AppState {
  const specs = [
    ["AP Calculus AB", "Ms. Patel", "AP", "#ada0ed", [94, 92, 98, 95, 96, 93]],
    [
      "AP English Literature",
      "Mr. Bennett",
      "AP",
      "#88add9",
      [92, 90, 94, 88, 93, 91],
    ],
    [
      "Honors Chemistry",
      "Dr. Chen",
      "Honors",
      "#d5ab78",
      [88, 86, 93, 87, 91, 90],
    ],
    [
      "AP U.S. History",
      "Ms. Williams",
      "AP",
      "#b999d9",
      [96, 98, 94, 97, 96, 98],
    ],
    [
      "Spanish III",
      "Mr. García",
      "Regular",
      "#77c5b4",
      [92, 94, 96, 91, 95, 93],
    ],
    [
      "Digital Art & Design",
      "Ms. Davis",
      "Regular",
      "#d595aa",
      [98, 96, 99, 100, 97, 98],
    ],
  ] as const;
  const courses: Course[] = specs.map(
    ([name, teacher, level, color, scores], i) => ({
      id: `demo-course-${i}`,
      name,
      teacher,
      level,
      color,
      semester: "Fall 2026",
      credits: 0.5,
      mode: "weighted",
      target: 90,
      categories: [
        { id: "major", name: "Major grades", weight: 60 },
        { id: "daily", name: "Daily work", weight: 40 },
      ],
      assignments: scores
        .map<Assignment>((score, j) => ({
          id: `demo-${i}-${j}`,
          name: [
            [
              "Limits & continuity test",
              "Derivative practice",
              "Unit 2 quiz",
              "Problem set 04",
              "Application of derivatives",
              "Practice exam",
            ],
            [
              "Poetry analysis",
              "Reading response",
              "Literary essay",
              "Seminar notes",
              "Close reading",
              "Discussion reflection",
            ],
            [
              "Atomic structure test",
              "Lab: periodic trends",
              "Bonding quiz",
              "Lab notebook",
              "Chemical equations",
              "Mole calculations",
            ],
            [
              "Unit 3 assessment",
              "Primary source analysis",
              "DBQ practice",
              "Reading notes",
              "Progressive Era quiz",
              "Chapter review",
            ],
            [
              "Conversation assessment",
              "Vocabulary practice",
              "Culture presentation",
              "Reading exercise",
              "Listening activity",
              "Grammar practice",
            ],
            [
              "Typography project",
              "Composition study",
              "Brand identity",
              "Sketchbook review",
              "Color theory",
              "Portfolio critique",
            ],
          ][i][j],
          categoryId: j % 2 === 0 ? "major" : "daily",
          earned: score,
          possible: 100,
          status: "graded" as const,
          due: date(-15 + j * 2),
        }))
        .concat([
          {
            id: `demo-future-${i}`,
            name: [
              "Unit 3: applications test",
              "Modern poetry essay",
              "Lab: reaction rates",
              "Unit 4 assessment",
              "Oral presentation",
              "Editorial design project",
            ][i],
            categoryId: "major",
            earned: null,
            possible: 100,
            status: "future",
            due: date(i === 0 ? 1 : i === 1 ? 2 : i === 2 ? 3 : 5 + i),
          },
        ]),
    }),
  );
  return {
    version: 1,
    demo: true,
    courses,
    settings: { ...defaultSettings },
    policy: { ...defaultPolicy },
    snapshots: [
      {
        at: new Date().toISOString(),
        semester: "Fall 2026",
        ...snapshotScores(courses),
      },
    ],
  };
}
export function emptyState(): AppState {
  return {
    version: 1,
    demo: false,
    courses: [],
    settings: { ...defaultSettings, name: "Student" },
    policy: { ...defaultPolicy },
    snapshots: [],
  };
}
