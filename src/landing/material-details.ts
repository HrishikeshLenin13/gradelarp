import {
  CanvasTexture,
  NoColorSpace,
  PlaneGeometry,
  RepeatWrapping,
} from "three";

export type SurfaceKind = "cloth" | "paper" | "wood";
/** Deterministic non-color height data, not a photograph. */
export function surfaceHeight(x: number, y: number, kind: SurfaceKind) {
  let n = Math.imul(x + 17, 374761393) ^ Math.imul(y + 29, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  const noise = ((n ^ (n >>> 16)) >>> 0) / 4294967295 - 0.5;
  const relief =
    kind === "cloth"
      ? ((x % 4 === 0 ? 1 : 0) + (y % 4 === 0 ? 1 : 0)) * 0.17 + noise * 0.12
      : kind === "paper"
        ? Math.sin(x * 0.17 + y * 0.8) * 0.035 + noise * 0.16
        : Math.sin(y * 0.24 + Math.sin(x * 0.04)) * 0.23 + noise * 0.06;
  return Math.max(0, Math.min(1, 0.42 + relief));
}
export function surfaceRelief(kind: SurfaceKind) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Surface texture unavailable");
  const pixels = ctx.createImageData(256, 256);
  for (let y = 0; y < 256; y++)
    for (let x = 0; x < 256; x++) {
      const offset = (y * 256 + x) * 4;
      const height = Math.round(surfaceHeight(x, y, kind) * 255);
      pixels.data[offset] =
        pixels.data[offset + 1] =
        pixels.data[offset + 2] =
          height;
      pixels.data[offset + 3] = 255;
    }
  ctx.putImageData(pixels, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = NoColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.setScalar(kind === "cloth" ? 3 : kind === "wood" ? 2 : 1);
  texture.anisotropy = 4;
  return texture;
}
export function printedRoughness(art: HTMLCanvasElement) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 700;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Printed finish unavailable");
  ctx.drawImage(art, 0, 0, 512, 700);
  const pixels = ctx.getImageData(0, 0, 512, 700);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const level = Math.round(235 - pixels.data[i + 1] * 0.65);
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = level;
  }
  ctx.putImageData(pixels, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = NoColorSpace;
  return texture;
}
export function paperGeometry() {
  const geometry = new PlaneGeometry(4.1, 5.63, 24, 12);
  const positions = geometry.getAttribute("position");
  for (let i = 0; i < positions.count; i++) {
    const edge = (positions.getX(i) + 2.05) / 4.1;
    const curl =
      0.055 * edge ** 3 + Math.sin(positions.getY(i) * 2.4) * 0.006 * edge ** 2;
    positions.setZ(i, curl);
  }
  geometry.computeVertexNormals();
  return geometry;
}
