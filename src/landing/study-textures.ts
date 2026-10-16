import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";
function random(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let n = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}
function surface(size: number) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas texture generation unavailable");
  return { canvas, context };
}
function texture(canvas: HTMLCanvasElement, repeat = 1) {
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  map.wrapS = map.wrapT = RepeatWrapping;
  map.repeat.set(repeat, repeat);
  map.anisotropy = 8;
  return map;
}
export function woodTexture() {
  const { canvas, context } = surface(1024);
  const rng = random(92);
  const pixels = context.createImageData(1024, 1024);
  for (let y = 0; y < 1024; y++)
    for (let x = 0; x < 1024; x++) {
      const grain =
        Math.sin(y * 0.52 + Math.sin(x * 0.007) * 1.5) * 3 +
        Math.sin(y * 0.093 + x * 0.0006) * 5 +
        (rng() - 0.5) * 8;
      const band = Math.sin(y * 0.009) * 6;
      const p = (y * 1024 + x) * 4;
      pixels.data[p] = 113 + grain + band;
      pixels.data[p + 1] = 82 + grain * 0.8 + band;
      pixels.data[p + 2] = 53 + grain * 0.6 + band;
      pixels.data[p + 3] = 255;
    }
  context.putImageData(pixels, 0, 0);
  return texture(canvas, 2);
}
export function matTexture() {
  const { canvas, context } = surface(2048);
  context.fillStyle = "#e7e2d7";
  context.fillRect(0, 0, 2048, 2048);
  context.strokeStyle = "#bac1ca";
  context.globalAlpha = 0.6;
  context.lineWidth = 2;
  for (let y = 0; y < 2048; y += 64) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(2048, y);
    context.stroke();
  }
  context.strokeStyle = "#c3a6aa";
  context.beginPath();
  context.moveTo(150, 0);
  context.lineTo(150, 2048);
  context.stroke();
  context.globalAlpha = 0.8;
  context.fillStyle = "#7c7b8c";
  context.font = "28px Arial";
  context.fillText("A little room to think.", 220, 180);
  return texture(canvas);
}
