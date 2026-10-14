"use client";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  MeasuringStrategy,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ArrowUpRight } from "lucide-react";
import { courseGrade, gradeLetter } from "@/lib/calculations";
import type { Widget, Settings, Course, GpaPolicy } from "@/lib/model";
export function DashboardWidgets({
  settings,
  items,
  onReorder,
}: {
  settings: Settings;
  items: Record<Widget, React.ReactNode>;
  onReorder: (order: Widget[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 7 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      scrollBehavior: "auto",
    }),
  );
  const visible = settings.order.filter((w) => settings.widgets.includes(w));
  return (
    <DndContext
      sensors={sensors}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      collisionDetection={closestCenter}
      onDragEnd={({ active, over }) => {
        if (over && active.id !== over.id)
          onReorder(
            arrayMove(
              settings.order,
              settings.order.indexOf(active.id as Widget),
              settings.order.indexOf(over.id as Widget),
            ),
          );
      }}
    >
      <SortableContext items={visible} strategy={rectSortingStrategy}>
        <div className="product-dashboard-grid">
          {visible.map((w) => (
            <DashboardWidget key={w} id={w}>
              {items[w]}
            </DashboardWidget>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
function DashboardWidget({
  id,
  children,
}: {
  id: Widget;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  return (
    <section
      ref={setNodeRef}
      className={`product-widget product-widget-${id}`}
      data-widget={id}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 5 : undefined,
        opacity: isDragging ? 0.8 : 1,
      }}
    >
      <button
        ref={setActivatorNodeRef}
        className="product-widget-grip"
        title="Drag or press Space and use arrow keys to reorder"
        aria-label={`Reorder ${id} widget`}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </button>
      {children}
    </section>
  );
}
export function GradeDistribution({
  courses,
  policy,
  onNavigate,
}: {
  courses: Course[];
  policy: GpaPolicy;
  onNavigate: () => void;
}) {
  const letters = [
      ...new Set(
        [...policy.scale].sort((a, b) => b.min - a.min).map((s) => s.letter),
      ),
    ],
    graded = courses.filter((c) => courseGrade(c) !== null),
    belowTarget = graded.filter((c) => (courseGrade(c) ?? 0) < c.target).length,
    max = Math.max(
      1,
      ...letters.map(
        (l) =>
          graded.filter((c) => gradeLetter(courseGrade(c), policy) === l)
            .length,
      ),
    );
  return (
    <div className="product-distribution">
      <div className="product-section-heading">
        <h2>The bigger picture</h2>
        <button onClick={onNavigate}>
          Grade history <ArrowUpRight size={15} />
        </button>
      </div>
      <p>Grade distribution from {graded.length} calculated course grades.</p>
      <div className="product-distribution-bars">
        {letters.map((l) => {
          const count = graded.filter(
            (c) => gradeLetter(courseGrade(c), policy) === l,
          ).length;
          return (
            <button
              key={l}
              onClick={onNavigate}
              aria-label={`${l}: ${count} courses. Open grade analysis.`}
            >
              <span>{l}</span>
              <div>
                <i style={{ transform: `scaleX(${count / max})` }} />
              </div>
              <strong>{count}</strong>
            </button>
          );
        })}
      </div>
      <span className="helper">
        {belowTarget} {belowTarget === 1 ? "course" : "courses"} below target ·{" "}
        {courses.length - graded.length} without a grade
      </span>
    </div>
  );
}
