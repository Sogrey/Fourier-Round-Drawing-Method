/**
 * Build China outline as separate closed parts: mainland + Hainan + Taiwan.
 * Shared lon/lat frame so relative geography is preserved.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function resample(points, n) {
  const closed = points.slice();
  const a0 = closed[0];
  const a1 = closed[closed.length - 1];
  if (Math.hypot(a0[0] - a1[0], a0[1] - a1[1]) > 1e-12) closed.push(a0.slice());
  const lens = [];
  let total = 0;
  for (let i = 0; i < closed.length - 1; i++) {
    const d = Math.hypot(closed[i + 1][0] - closed[i][0], closed[i + 1][1] - closed[i][1]);
    lens.push(d);
    total += d;
  }
  const out = [];
  const step = total / n;
  let seg = 0;
  let covered = 0;
  for (let i = 0; i < n; i++) {
    const target = i * step;
    while (seg < lens.length - 1 && covered + lens[seg] < target) {
      covered += lens[seg];
      seg++;
    }
    const local = lens[seg] < 1e-18 ? 0 : (target - covered) / lens[seg];
    const a = closed[seg];
    const b = closed[seg + 1];
    out.push([a[0] + (b[0] - a[0]) * local, a[1] + (b[1] - a[1]) * local]);
  }
  return out;
}

function douglasPeucker(points, eps) {
  function distToSeg(p, a, b) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len2 = dx * dx + dy * dy;
    if (len2 < 1e-18) return Math.hypot(p[0] - a[0], p[1] - a[1]);
    let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
  }
  if (points.length < 3) return points;
  let maxD = 0;
  let idx = 0;
  const end = points.length - 1;
  for (let i = 1; i < end; i++) {
    const d = distToSeg(points[i], points[0], points[end]);
    if (d > maxD) {
      maxD = d;
      idx = i;
    }
  }
  if (maxD > eps) {
    const left = douglasPeucker(points.slice(0, idx + 1), eps);
    const right = douglasPeucker(points.slice(idx), eps);
    return left.slice(0, -1).concat(right);
  }
  return [points[0], points[end]];
}

function ringArea(ring) {
  let a = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    a += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return Math.abs(a / 2);
}

function cleanRing(ring) {
  let pts = ring.map(([lon, lat]) => [lon, lat]);
  const a = pts[0];
  const b = pts[pts.length - 1];
  if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-9) pts = pts.slice(0, -1);
  return pts;
}

function pickEps(points, candidates, target = 110) {
  let best = null;
  let bestScore = Infinity;
  for (const eps of candidates) {
    const s = douglasPeucker(points.concat([points[0]]), eps).slice(0, -1);
    const score = Math.abs(s.length - target);
    if (score < bestScore) {
      bestScore = score;
      best = s;
    }
  }
  return best;
}

function simplify(points, n, epsCandidates, target) {
  const simplified = pickEps(points, epsCandidates, target);
  return resample(simplified, n);
}

const geo = await (await fetch("https://geo.datav.aliyun.com/areas_v3/bound/100000.json")).json();
const polys = geo.features[0].geometry.coordinates;

const ranked = polys
  .map((poly, i) => ({ i, area: ringArea(poly[0]), ring: cleanRing(poly[0]) }))
  .sort((a, b) => b.area - a.area);

const mainland = ranked[0].ring;
// Taiwan ~ (121, 23.7), Hainan ~ (109.8, 19.3)
function mean(ring) {
  let x = 0;
  let y = 0;
  for (const p of ring) {
    x += p[0];
    y += p[1];
  }
  return [x / ring.length, y / ring.length];
}

let taiwan = null;
let hainan = null;
for (const item of ranked.slice(1, 8)) {
  const [cx, cy] = mean(item.ring);
  if (!taiwan && cx > 119 && cx < 123 && cy > 21 && cy < 26) taiwan = item.ring;
  if (!hainan && cx > 108 && cx < 112 && cy > 17 && cy < 21) hainan = item.ring;
}

if (!taiwan || !hainan) {
  throw new Error(`missing islands taiwan=${!!taiwan} hainan=${!!hainan}`);
}

const partsRaw = [
  { id: "mainland", label: "大陆", ring: mainland, n: 180, eps: [0.2, 0.25, 0.3, 0.4], target: 120 },
  { id: "hainan", label: "海南", ring: hainan, n: 64, eps: [0.02, 0.03, 0.04, 0.05], target: 50 },
  { id: "taiwan", label: "台湾", ring: taiwan, n: 80, eps: [0.02, 0.03, 0.04, 0.05], target: 60 },
];

const allPts = partsRaw.flatMap((p) => p.ring);
const xs = allPts.map((p) => p[0]);
const ys = allPts.map((p) => p[1]);
const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
const cy = (Math.min(...ys) + Math.max(...ys)) / 2;

const parts = partsRaw.map((p) => {
  const local = simplify(p.ring, p.n, p.eps, p.target).map(([lon, lat]) => [
    Math.round((lon - cx) * 1000) / 1000,
    Math.round((lat - cy) * 1000) / 1000,
  ]);
  console.log(p.id, "pts", local.length);
  return { id: p.id, label: p.label, points: local };
});

const out = {
  /** Shared centered lon/lat-derived XY; parts drawn separately. */
  parts,
};

const body =
  "/** China mainland + Hainan + Taiwan (Aliyun DataV 100000, simplified). */\n" +
  "export default " +
  JSON.stringify(out) +
  ";\n";

fs.writeFileSync(path.join(root, "src", "data", "china.js"), body);
console.log("wrote src/data/china.js");
