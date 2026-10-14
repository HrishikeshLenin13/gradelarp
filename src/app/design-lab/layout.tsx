import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "gradelarp. / Design laboratory",
  robots: { index: false, follow: false },
  description:
    "Three isolated interactive design previews. Production and student data remain unchanged.",
};
export default function DesignLabLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
