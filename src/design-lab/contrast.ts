function luminance(hex: string) {
  const values = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((x) => parseInt(x, 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
}
export function contrastRatio(a: string, b: string) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export function readableAccent(hex: string, theme: "dark" | "light") {
  let values = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((x) => parseInt(x, 16));
  let result = hex;
  const background = theme === "light" ? "#edf0f3" : "#26303b";
  for (let i = 0; i < 30 && contrastRatio(result, background) < 5; i++) {
    values = values.map((c) =>
      theme === "light"
        ? Math.round(c * 0.86)
        : Math.round(c + (255 - c) * 0.14),
    );
    result = "#" + values.map((c) => c.toString(16).padStart(2, "0")).join("");
  }
  return result;
}
export function onAccent(hex: string) {
  return contrastRatio(hex, "#ffffff") >= contrastRatio(hex, "#171c24")
    ? "#ffffff"
    : "#171c24";
}
