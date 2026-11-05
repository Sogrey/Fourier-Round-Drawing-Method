import shaanxiCoords from "../data/shaanxi.js";
import taiwanCoords from "../data/taiwan.js";
import chinaCoords from "../data/china.js";

/** Normalize path to roughly fit [-1,1]×[-1,1] and center it. */
export function normalizePoints(points) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const scale = 1.7 / Math.max(maxX - minX, maxY - minY, 1e-9);
  return points.map((p) => ({
    x: (p.x - cx) * scale,
    y: (p.y - cy) * scale,
  }));
}

/** Resample a polyline to N points with roughly equal arc length. */
export function resampleClosed(points, n) {
  const closed = [...points];
  const first = points[0];
  const last = points[points.length - 1];
  if (Math.hypot(first.x - last.x, first.y - last.y) > 1e-9) {
    closed.push({ ...first });
  }

  const segLens = [];
  let total = 0;
  for (let i = 0; i < closed.length - 1; i++) {
    const d = Math.hypot(closed[i + 1].x - closed[i].x, closed[i + 1].y - closed[i].y);
    segLens.push(d);
    total += d;
  }

  const out = [];
  const step = total / n;
  let seg = 0;
  let covered = 0;

  for (let i = 0; i < n; i++) {
    const target = i * step;
    while (seg < segLens.length - 1 && covered + segLens[seg] < target) {
      covered += segLens[seg];
      seg++;
    }
    const local = segLens[seg] < 1e-12 ? 0 : (target - covered) / segLens[seg];
    const a = closed[seg];
    const b = closed[seg + 1];
    out.push({
      x: a.x + (b.x - a.x) * local,
      y: a.y + (b.y - a.y) * local,
    });
  }
  return out;
}

function parametric(fn, n) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    pts.push(fn(i / n));
  }
  return normalizePoints(pts);
}

function fromPolyline(points, n) {
  return resampleClosed(normalizePoints(points), n);
}

/** Shared normalize so multi-part maps keep relative geography. */
export function normalizeParts(parts) {
  const all = parts.flatMap((p) => p.points);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of all) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const scale = 1.7 / Math.max(maxX - minX, maxY - minY, 1e-9);
  return parts.map((part) => ({
    ...part,
    points: part.points.map((p) => ({
      x: (p.x - cx) * scale,
      y: (p.y - cy) * scale,
    })),
  }));
}

function perimeter(points) {
  let len = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    len += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return len;
}

function regularPolygon(sides, n, rotation = -Math.PI / 2) {
  const pts = [];
  for (let i = 0; i < sides; i++) {
    const a = rotation + (i * 2 * Math.PI) / sides;
    pts.push({ x: Math.cos(a), y: Math.sin(a) });
  }
  return fromPolyline(pts, n);
}

function starPolygon(points, innerRatio, n, rotation = -Math.PI / 2) {
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const a = rotation + (i * Math.PI) / points;
    const r = i % 2 === 0 ? 1 : innerRatio;
    pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
  }
  return fromPolyline(pts, n);
}

/** Real Shaanxi provincial boundary, simplified (~120 pts, north up). */
function shaanxiOutline() {
  return shaanxiCoords.map(([x, y]) => ({ x, y }));
}

function taiwanOutline() {
  return taiwanCoords.map(([x, y]) => ({ x, y }));
}

function chinaPartsRaw() {
  const src = chinaCoords.parts ? chinaCoords.parts : [{ id: "mainland", label: "大陆", points: chinaCoords }];
  return src.map((part) => ({
    id: part.id,
    label: part.label,
    points: part.points.map(([x, y]) => ({ x, y })),
  }));
}

/** Cat head silhouette (single closed stroke). */
function catOutline() {
  return [
    [-0.55, 0.05], [-0.7, 0.55], [-0.35, 0.35], [-0.15, 0.42], [0.15, 0.42],
    [0.35, 0.35], [0.7, 0.55], [0.55, 0.05], [0.62, -0.25], [0.45, -0.5],
    [0.15, -0.62], [-0.15, -0.62], [-0.45, -0.5], [-0.62, -0.25],
  ].map(([x, y]) => ({ x, y }));
}

/** Simple fish outline. */
function fishOutline() {
  return [
    [0.85, 0], [0.55, 0.28], [0.15, 0.38], [-0.25, 0.32], [-0.55, 0.18],
    [-0.75, 0.35], [-0.95, 0.15], [-0.85, 0], [-0.95, -0.15], [-0.75, -0.35],
    [-0.55, -0.18], [-0.25, -0.32], [0.15, -0.38], [0.55, -0.28],
  ].map(([x, y]) => ({ x, y }));
}

/** π glyph as a single closed loop (outer contour style). */
function piOutline() {
  return [
    [-0.7, 0.55], [-0.2, 0.55], [-0.15, 0.35], [-0.15, -0.45], [-0.05, -0.55],
    [0.15, -0.45], [0.15, 0.35], [0.25, 0.55], [0.75, 0.55], [0.75, 0.4],
    [0.35, 0.4], [0.35, -0.35], [0.45, -0.55], [0.2, -0.7], [-0.05, -0.55],
    [-0.35, -0.7], [-0.55, -0.45], [-0.35, -0.35], [-0.35, 0.4], [-0.7, 0.4],
  ].map(([x, y]) => ({ x, y }));
}

/** Mountain / skyline silhouette. */
function mountainOutline() {
  return [
    [-1, -0.45], [-0.7, 0.05], [-0.45, -0.2], [-0.15, 0.55], [0.05, 0.2],
    [0.25, 0.7], [0.55, -0.05], [0.75, 0.25], [1, -0.45],
  ].map(([x, y]) => ({ x, y }));
}

/**
 * Returns one or more closed polylines.
 * Multi-part shapes (e.g. China) keep islands as separate loops.
 */
export function getShapeParts(name, sampleCount) {
  if (name === "china") {
    const raw = normalizeParts(chinaPartsRaw());
    const total = raw.reduce((s, p) => s + perimeter(p.points), 0);
    return raw.map((part) => {
      const share = perimeter(part.points) / total;
      const n = Math.max(part.id === "mainland" ? 128 : 72, Math.round(sampleCount * share));
      return {
        id: part.id,
        label: part.label,
        points: resampleClosed(part.points, n),
      };
    });
  }

  const points = getShapePoints(name, sampleCount);
  return [{ id: name, label: name, points }];
}

export function getShapePoints(name, sampleCount) {
  switch (name) {
    case "heart":
      return parametric((t) => {
        const a = 2 * Math.PI * t;
        return {
          x: 16 * Math.sin(a) ** 3,
          y: -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)),
        };
      }, sampleCount);

    case "star":
      return starPolygon(5, 0.42, sampleCount);

    case "star6":
      return starPolygon(6, 0.48, sampleCount);

    case "circle":
      return parametric((t) => {
        const a = 2 * Math.PI * t;
        return { x: Math.cos(a), y: Math.sin(a) };
      }, sampleCount);

    case "ellipse":
      return parametric((t) => {
        const a = 2 * Math.PI * t;
        return { x: 1.4 * Math.cos(a), y: 0.75 * Math.sin(a) };
      }, sampleCount);

    case "square":
      return regularPolygon(4, sampleCount, Math.PI / 4);

    case "triangle":
      return regularPolygon(3, sampleCount);

    case "hexagon":
      return regularPolygon(6, sampleCount);

    case "infinity":
      // Lemniscate of Bernoulli
      return parametric((t) => {
        const a = 2 * Math.PI * t;
        const s = Math.sin(a);
        const denom = 1 + s * s;
        return { x: (Math.cos(a) ) / denom, y: (s * Math.cos(a)) / denom };
      }, sampleCount);

    case "butterfly":
      // Butterfly curve (Fay)
      return parametric((t) => {
        const a = 2 * Math.PI * t;
        const r =
          Math.exp(Math.cos(a)) -
          2 * Math.cos(4 * a) +
          Math.sin(a / 12) ** 5;
        return { x: Math.sin(a) * r, y: Math.cos(a) * r };
      }, sampleCount);

    case "rose3":
      return parametric((t) => {
        const a = 2 * Math.PI * t;
        const r = Math.cos(3 * a);
        return { x: r * Math.cos(a), y: r * Math.sin(a) };
      }, sampleCount);

    case "rose4":
      return parametric((t) => {
        const a = 2 * Math.PI * t;
        const r = Math.cos(2 * a);
        return { x: r * Math.cos(a), y: r * Math.sin(a) };
      }, sampleCount);

    case "clover":
      return parametric((t) => {
        const a = 2 * Math.PI * t;
        const r = 0.55 + 0.45 * Math.cos(3 * a);
        return { x: r * Math.cos(a), y: r * Math.sin(a) };
      }, sampleCount);

    case "lissajous":
      return parametric((t) => {
        const a = 2 * Math.PI * t;
        return { x: Math.sin(3 * a), y: Math.sin(2 * a + Math.PI / 4) };
      }, sampleCount);

    case "epitrochoid":
      // Rolling circle — naturally “Fourier-ish”
      return parametric((t) => {
        const a = 2 * Math.PI * t;
        const R = 1;
        const r = 0.35;
        const d = 0.55;
        return {
          x: (R + r) * Math.cos(a) - d * Math.cos(((R + r) / r) * a),
          y: (R + r) * Math.sin(a) - d * Math.sin(((R + r) / r) * a),
        };
      }, sampleCount);

    case "hypocycloid":
      // Astroid-like deltoid family
      return parametric((t) => {
        const a = 2 * Math.PI * t;
        const R = 1;
        const r = R / 4;
        return {
          x: (R - r) * Math.cos(a) + r * Math.cos(((R - r) / r) * a),
          y: (R - r) * Math.sin(a) - r * Math.sin(((R - r) / r) * a),
        };
      }, sampleCount);

    case "blob":
      return parametric((t) => {
        const a = 2 * Math.PI * t;
        const r =
          0.85 +
          0.18 * Math.cos(2 * a + 0.4) +
          0.12 * Math.sin(3 * a - 0.7) +
          0.07 * Math.cos(5 * a);
        return { x: r * Math.cos(a), y: r * Math.sin(a) };
      }, sampleCount);

    case "taiwan":
      return fromPolyline(taiwanOutline(), sampleCount);

    case "china":
      // Prefer getShapeParts('china'); kept for compatibility (mainland only).
      return getShapeParts("china", sampleCount)[0].points;

    case "cat":
      return fromPolyline(catOutline(), sampleCount);

    case "fish":
      return fromPolyline(fishOutline(), sampleCount);

    case "pi":
      return fromPolyline(piOutline(), sampleCount);

    case "mountain":
      return fromPolyline(mountainOutline(), sampleCount);

    case "shaanxi":
    default:
      return fromPolyline(shaanxiOutline(), sampleCount);
  }
}
