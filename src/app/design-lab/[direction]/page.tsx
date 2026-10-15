import { notFound } from "next/navigation";
import { DesignWorkspace } from "@/design-lab/workspace";
import { directions, type Direction } from "@/design-lab/types";
export function generateStaticParams() {
  return directions.map((direction) => ({ direction }));
}
