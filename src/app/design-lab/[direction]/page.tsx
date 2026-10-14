import { notFound } from "next/navigation";
import { DesignWorkspace } from "@/design-lab/workspace";
import { directions, type Direction } from "@/design-lab/types";
export function generateStaticParams() {
  return directions.map((direction) => ({ direction }));
}
export default async function DesignPage({
  params,
}: {
  params: Promise<{ direction: string }>;
}) {
  const { direction } = await params;
  if (!directions.includes(direction as Direction)) notFound();
  return <DesignWorkspace key={direction} direction={direction as Direction} />;
}
