import type { Metadata } from "next";
import { GradelarpApp } from "@/product/app";
export const metadata: Metadata = {
  title: "Gradelarp — Student workspace",
  robots: { index: false, follow: false },
};
export default function WorkspacePage() {
  return <GradelarpApp />;
}
