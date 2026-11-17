/**
 * Lifts a plain studio background (white or near-white) off a product photo, in
 * the browser, for display only. The original file is never changed.
 *
 * - Only pixels connected to the photo's border that match the backdrop colour
 *   are made transparent, plus large flat backdrop-coloured pockets enclosed by
 *   the body (e.g. between an arm and the waist).
 * - Everything else — model, clothing, print — keeps its exact pixel colours.
 *   Only a 2px edge ring gets soft alpha (with the backdrop's colour taken out)
 *   so the outline isn't jagged or haloed.
 * - Photos without a plain backdrop (lifestyle shots, charts, coloured walls)
 *   return null and are shown as they are.
 *
 * Output is a lossless PNG blob URL.
 */

const TOL = 24; // max per-channel difference from the backdrop colour
const MAX_SIDE = 1100;

export type Cutout = { url: string; w: number; h: number };

const cache = new Map<string, Promise<Cutout | null>>();

export function cutout(src: string): Promise<Cutout | null> {
  let p = cache.get(src);
  if (!p) {
    p = run(src).catch(() => null);
    cache.set(src, p);
  }
  return p;
}

async function run(src: string): Promise<Cutout | null> {
  const res = await fetch(`/api/img?src=${encodeURIComponent(src)}`);
  if (!res.ok) return null;
  const bmp = await createImageBitmap(await res.blob());
  const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * k);
  const h = Math.round(bmp.height * k);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close?.();
  const img = ctx.getImageData(0, 0, w, h);
  if (!lift(img.data, w, h)) return null;
  ctx.putImageData(img, 0, 0);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
  return blob ? { url: URL.createObjectURL(blob), w, h } : null;
}

/** Mutates `px` in place. Returns false when the photo has no plain backdrop. */
function lift(px: Uint8ClampedArray, w: number, h: number): boolean {
  const n = w * h;

  // 1. Backdrop colour = median of the border pixels; the border must be mostly that colour.
  const border: number[] = [];
  for (let x = 0; x < w; x++) border.push(x, (h - 1) * w + x);
  for (let y = 1; y < h - 1; y++) border.push(y * w, y * w + w - 1);
  const ch = (c: number) => border.map((i) => px[i * 4 + c]).sort((a, b) => a - b)[border.length >> 1];
  const bg = [ch(0), ch(1), ch(2)];
  if (Math.min(...bg) < 200) return false; // not a light studio backdrop
  const diff = (i: number) => {
    const o = i * 4;
    return Math.max(Math.abs(px[o] - bg[0]), Math.abs(px[o + 1] - bg[1]), Math.abs(px[o + 2] - bg[2]));
  };
  const onBorder = border.filter((i) => diff(i) <= TOL).length / border.length;
  if (onBorder < 0.8) return false;

  // 2. Flood fill the backdrop from the border.
  const mask = new Uint8Array(n); // 1 = backdrop
  const queue = new Int32Array(n);
  let head = 0, tail = 0;
  for (const i of border) if (!mask[i] && diff(i) <= TOL) { mask[i] = 1; queue[tail++] = i; }
  while (head < tail) {
    const i = queue[head++];
    const x = i % w;
    const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w];
    for (const j of nb) if (j >= 0 && j < n && !mask[j] && diff(j) <= TOL) { mask[j] = 1; queue[tail++] = j; }
  }

  // 3. Enclosed pockets: large, flat regions very close to the backdrop colour.
  //    White fabric has folds and texture, so it fails the flatness test and stays.
  const seen = new Uint8Array(n);
  const minArea = n * 0.0015;
  for (let s = 0; s < n; s++) {
    if (mask[s] || seen[s] || diff(s) > 8) continue;
    head = 0; tail = 0;
    queue[tail++] = s; seen[s] = 1;
    let sum = 0, sum2 = 0;
    while (head < tail) {
      const i = queue[head++];
      const o = i * 4;
      const l = px[o] + px[o + 1] + px[o + 2];
      sum += l; sum2 += l * l;
      const x = i % w;
      const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w];
      for (const j of nb) if (j >= 0 && j < n && !mask[j] && !seen[j] && diff(j) <= 8) { seen[j] = 1; queue[tail++] = j; }
    }
    const mean = sum / tail;
    const sd = Math.sqrt(Math.max(0, sum2 / tail - mean * mean)) / 3;
    if (tail >= minArea && sd < 2.2) for (let q = 0; q < tail; q++) mask[queue[q]] = 1;
  }

  const removed = mask.reduce((a, v) => a + v, 0) / n;
  if (removed < 0.06 || removed > 0.96) return false;

  // 4. Alpha: backdrop → 0; a 2px ring of subject pixels next to it → soft, backdrop colour removed.
  const dist = new Uint8Array(n).fill(255);
  for (let i = 0; i < n; i++) if (mask[i]) dist[i] = 0;
  for (let pass = 1; pass <= 2; pass++)
    for (let i = 0; i < n; i++) {
      if (dist[i] !== 255) continue;
      const x = i % w;
      if ((x > 0 && dist[i - 1] === pass - 1) || (x < w - 1 && dist[i + 1] === pass - 1) || (i >= w && dist[i - w] === pass - 1) || (i + w < n && dist[i + w] === pass - 1))
        dist[i] = pass;
    }
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    if (dist[i] === 0) { px[o + 3] = 0; continue; }
    if (dist[i] > 2) continue; // subject interior: untouched
    const a = Math.min(1, Math.max(0, (diff(i) - TOL * 0.5) / (TOL * 3)) + (dist[i] === 2 ? 0.5 : 0));
    if (a >= 1) continue;
    if (a <= 0.02) { px[o + 3] = 0; continue; }
    for (let c = 0; c < 3; c++) px[o + c] = Math.min(255, Math.max(0, (px[o + c] - bg[c] * (1 - a)) / a));
    px[o + 3] = Math.round(a * 255);
  }
  return true;
}
