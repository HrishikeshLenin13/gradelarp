"use client";
import { useState } from "react";
import {
  BarChart,
  Bar,
  Cell,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import { courseGrade, gradeLetter } from "@/lib/calculations";
import type { Course, GpaPolicy } from "@/lib/model";
import { cn } from "@/lib/utils";
import styles from "./charts.module.css";
export function LabCourseChart({
  courses,
  policy,
  onSelect,
  selectedId,
  kind = "grades",
  presentation = "bars",
}: {
  courses: Course[];
  policy: GpaPolicy;
  onSelect?: (id: string) => void;
  selectedId?: string;
  kind?: "grades" | "goals";
  presentation?: "bars" | "dots";
}) {
  const [mode, setMode] = useState<"grades" | "goals">(kind);
  const data = courses.map((c) => ({
    id: c.id,
    name: c.name.replace("AP ", "").replace("Honors ", ""),
    grade: courseGrade(c),
    target: c.target,
    gap: courseGrade(c) === null ? null : courseGrade(c)! - c.target,
    color: c.color,
  }));
  return (
    <div className={styles.chartWrap} data-testid="course-comparison">
      <div className={styles.mode} role="group" aria-label="Chart measure">
        <button
          aria-pressed={mode === "grades"}
          onClick={() => setMode("grades")}
        >
          Course grades
        </button>
        <button
          aria-pressed={mode === "goals"}
          onClick={() => setMode("goals")}
        >
          Target gaps
        </button>
      </div>
      <div
        className={styles.plot}
        role="img"
        aria-label={data
          .map(
            (d) =>
              `${d.name} ${d.grade?.toFixed(1) ?? "ungraded"} percent, target ${d.target}`,
          )
          .join("; ")}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 8, right: 24, left: 0, bottom: 4 }}
          >
            <CartesianGrid
              horizontal={false}
              stroke="var(--dl-line)"
              strokeDasharray="2 5"
            />
            <XAxis
              type="number"
              domain={mode === "grades" ? [0, 100] : ["auto", "auto"]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--dl-muted)", fontSize: 12 }}
              tickFormatter={(n) =>
                mode === "grades" ? `${n}%` : `${n > 0 ? "+" : ""}${n}`
              }
            />
            <YAxis
              dataKey="name"
              type="category"
              width={120}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--dl-text)", fontSize: 12 }}
            />
            <Tooltip
              cursor={{ fill: "var(--dl-raised)" }}
              contentStyle={{
                background: "var(--dl-surface)",
                color: "var(--dl-text)",
                border: "1px solid var(--dl-line)",
                borderRadius: 8,
                fontSize: 13,
              }}
              formatter={(value) => [
                `${Number(value).toFixed(1)}${mode === "grades" ? "%" : " pts"}`,
                mode === "grades" ? "Current grade" : "Above / below target",
              ]}
            />
            <ReferenceLine
              x={mode === "grades" ? 90 : 0}
              stroke="var(--dl-muted)"
              strokeDasharray="3 5"
            />
            <Bar
              shape={
                presentation === "dots"
                  ? (props: unknown) => {
                      const p = props as {
                        x: number;
                        y: number;
                        width: number;
                        height: number;
                        fill: string;
                        payload?: { gap: number | null };
                      };
                      return (
                        <circle
                          cx={
                            mode === "goals" && (p.payload?.gap ?? 0) < 0
                              ? p.x
                              : p.x + p.width
                          }
                          cy={p.y + p.height / 2}
                          r={6}
                          fill={p.fill}
                        />
                      );
                    }
                  : undefined
              }
              dataKey={mode === "grades" ? "grade" : "gap"}
              barSize={18}
              radius={3}
              isAnimationActive={false}
            >
              {data.map((d) => (
                <Cell
                  key={d.id}
                  fill={
                    d.id === selectedId
                      ? "var(--dl-accent)"
                      : mode === "goals" && d.gap !== null && d.gap < 0
                        ? "var(--dl-warning)"
                        : "var(--dl-chart-secondary)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className={styles.legend} aria-label="Select a course">
        {courses.map((c) => (
          <button
            className={cn(
              styles.course,
              selectedId === c.id && styles.selected,
            )}
            key={c.id}
            onClick={() => onSelect?.(c.id)}
            aria-pressed={selectedId === c.id}
            disabled={!onSelect}
          >
            <span className={styles.dot} style={{ background: c.color }} />
            {c.name.replace("AP ", "").replace("Honors ", "")}
            <b>{gradeLetter(courseGrade(c), policy)}</b>
          </button>
        ))}
      </div>
    </div>
  );
}
