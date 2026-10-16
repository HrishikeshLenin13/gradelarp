import { CanvasTexture, SRGBColorSpace } from "three";

function page() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1400;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D page textures unavailable");
  return { canvas, ctx };
}
function finish(canvas: HTMLCanvasElement) {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/** Printed cover artwork, not a generated photograph or an application screenshot. */
export function coverTexture() {
  const { canvas, ctx } = page();
  ctx.fillStyle = "#555775";
  ctx.fillRect(0, 0, 1024, 1400);
  ctx.strokeStyle = "#9898b9";
  ctx.lineWidth = 2;
  ctx.strokeRect(65, 65, 894, 1270);
  ctx.fillStyle = "#f5eedf";
  ctx.font = "bold 65px Arial";
  ctx.fillText("gradelarp", 110, 175);
  ctx.font = "bold 590px Arial";
  ctx.fillText("g", 300, 795);
  ctx.fillStyle = "#c6c3e4";
  ctx.fillRect(115, 1000, 790, 2);
  ctx.font = "35px Arial";
  ctx.fillText("Your grades.", 115, 1080);
  ctx.fillText("Your next steps.", 115, 1135);
  ctx.font = "23px Arial";
  ctx.fillText("GRADES   /   ASSIGNMENTS   /   PLANS", 115, 1250);
  return finish(canvas);
}

/** Conceptual record pages deliberately use no invented marks or student data. */
export function recordTexture(section: number) {
  const { canvas, ctx } = page();
  ctx.fillStyle = "#f5eedf";
  ctx.fillRect(0, 0, 1024, 1400);
  ctx.strokeStyle = "#d7d9de";
  ctx.lineWidth = 1;
  for (let y = 0; y < 1400; y += 38) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }
  ctx.fillStyle = "#393a53";
  ctx.font = "bold 35px Arial";
  ctx.fillText("gradelarp", 105, 135);
  ctx.font = "bold 82px Arial";
  const names = ["Grades", "Assignments", "Planner"];
  ctx.fillText(names[section], 105, 285);
  ctx.font = "25px Arial";
  ctx.fillStyle = "#747386";
  ctx.fillText("A clearer view of school.", 105, 345);
  const labels =
    section === 0
      ? ["Courses", "Reported averages", "Source details", "Last synced"]
      : section === 1
        ? ["Assignment marks", "Category details", "Missing work", "Due dates"]
        : [
            "Tasks and goals",
            "Study priorities",
            "What-if (manual)",
            "GPA (manual)",
          ];
  labels.forEach((label, index) => {
    const y = 475 + index * 170;
    ctx.fillStyle = "#e8e4dc";
    ctx.fillRect(100, y - 45, 825, 125);
    ctx.fillStyle = "#4f5066";
    ctx.font = "bold 30px Arial";
    ctx.fillText(label, 130, y + 4);
    ctx.fillStyle = "#858595";
    ctx.font = "24px Arial";
    ctx.fillText(
      section === 2
        ? [
            "Your own task list",
            "Personal priorities",
            "Your own grading rules",
            "Your own credits and scale",
          ][index]
        : "From your school records",
      130,
      y + 45,
    );
    ctx.fillText("—", 840, y + 15);
  });
  ctx.fillStyle = "#747386";
  ctx.font = "21px Arial";
  ctx.fillText("Concept illustration · No student records", 105, 1290);
  return finish(canvas);
}
