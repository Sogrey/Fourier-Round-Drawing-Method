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

function largestOuterRing(geo) {
  const feat = geo.features?.[0] || geo;
  const geom = feat.geometry;
  const polys = geom.type === "MultiPolygon" ? geom.coordinates : [geom.coordinates];
  let best = null;
  let bestA = -1;
  for (const poly of polys) {
    const ring = poly[0];
    const a = ringArea(ring);
    if (a > bestA) {
      bestA = a;
      best = ring;
    }
  }
  return { ring: best, area: bestA, polyCount: polys.length };
}

function cleanRing(ring) {
  let pts = ring.map(([lon, lat]) => [lon, lat]);
  const a = pts[0];
  const b = pts[pts.length - 1];
  if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-9) pts = pts.slice(0, -1);
  return pts;
}

function pickEps(points, candidates) {
  let best = null;
  let bestScore = Infinity;
  for (const eps of candidates) {
    const s = douglasPeucker(points.concat([points[0]]), eps).slice(0, -1);
    const score = Math.abs(s.length - 110);
    console.log(`  eps ${eps} -> ${s.length}`);
    if (score < bestScore) {
      bestScore = score;
      best = s;
    }
  }
  return best;
}

function toLocal(points, nTarget, epsCandidates) {
  const simplified = pickEps(points, epsCandidates);
  const evenly = resample(simplified, nTarget);
  const xs = evenly.map((p) => p[0]);
  const ys = evenly.map((p) => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  return evenly.map(([lon, lat]) => [
    Math.round((lon - cx) * 1000) / 1000,
    Math.round((lat - cy) * 1000) / 1000,
  ]);
}

function ascii(out, w = 36, h = 48) {
  const grid = Array.from({ length: h }, () => Array(w).fill(" "));
  const minx = Math.min(...out.map((p) => p[0]));
  const maxx = Math.max(...out.map((p) => p[0]));
  const miny = Math.min(...out.map((p) => p[1]));
  const maxy = Math.max(...out.map((p) => p[1]));
  for (const [x, y] of out) {
    const gx = Math.round(((x - minx) / (maxx - minx || 1)) * (w - 1));
    const gy = Math.round((1 - (y - miny) / (maxy - miny || 1)) * (h - 1));
    if (grid[gy]) grid[gy][gx] = "#";
  }
  return grid.map((r) => r.join("")).join("\n");
}

function writeJs(name, points) {
  const dir = path.join(root, "src", "data");
  fs.mkdirSync(dir, { recursive: true });
  const body =
    "/** Simplified from Aliyun DataV boundary (WGS84). */\nexport default " +
    JSON.stringify(points) +
    ";\n";
  fs.writeFileSync(path.join(dir, `${name}.js`), body);
  console.log(`wrote src/data/${name}.js (${points.length} pts)`);
  console.log(ascii(points));
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`);
  return res.json();
}

const jobs = [
  {
    name: "taiwan",
    url: "https://geo.datav.aliyun.com/areas_v3/bound/710000.json",
    n: 100,
    eps: [0.02, 0.03, 0.04, 0.05, 0.06, 0.08],
  },
  {
    name: "china",
    url: "https://geo.datav.aliyun.com/areas_v3/bound/100000.json",
    n: 180,
    eps: [0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6],
  },
];

for (const job of jobs) {
  console.log("\n===", job.name, "===");
  const geo = await fetchJson(job.url);
  const { ring, polyCount } = largestOuterRing(geo);
  const pts = cleanRing(ring);
  console.log("source verts", pts.length, "polygons", polyCount);
  const local = toLocal(pts, job.n, job.eps);
  writeJs(job.name, local);
}
