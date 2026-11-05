/**
 * DFT: c_k = (1/N) Σ z_n exp(-2πi kn / N)
 * Inverse: z_n = Σ c_k exp(+2πi kn / N)
 */
export function dft(signal) {
  const N = signal.length;
  const coeffs = new Array(N);
  for (let k = 0; k < N; k++) {
    let re = 0;
    let im = 0;
    for (let n = 0; n < N; n++) {
      const ang = (-2 * Math.PI * k * n) / N;
      const zr = signal[n].re;
      const zi = signal[n].im;
      const cr = Math.cos(ang);
      const ci = Math.sin(ang);
      re += zr * cr - zi * ci;
      im += zr * ci + zi * cr;
    }
    coeffs[k] = { re: re / N, im: im / N };
  }
  return coeffs;
}

function mag(c) {
  return Math.hypot(c.re, c.im);
}

function arg(c) {
  return Math.atan2(c.im, c.re);
}

/**
 * Real-valued amplitude-phase series from DFT of a real signal:
 *   x(t) ≈ a0 + Σ_{k=1}^{K} R_k cos(2π k t + φ_k)
 * with R_k = 2|c_k|, φ_k = arg(c_k)
 */
export function realSeriesFromSignal(values, maxTerms) {
  const N = values.length;
  const complex = values.map((v) => ({ re: v, im: 0 }));
  const coeffs = dft(complex);
  const a0 = coeffs[0].re;
  const terms = [];
  const K = Math.min(maxTerms, Math.floor((N - 1) / 2));
  for (let k = 1; k <= K; k++) {
    const c = coeffs[k];
    terms.push({
      k,
      radius: 2 * mag(c),
      phase: arg(c),
    });
  }
  // Draw larger circles first (visual clarity)
  terms.sort((a, b) => b.radius - a.radius);
  return { a0, terms, coeffs };
}

/**
 * Complex epicycles: z(t) = Σ c_k exp(2πi k t)
 * Frequencies remapped to signed indices around 0 for nicer ordering.
 */
export function complexEpicycles(points, maxTerms) {
  const N = points.length;
  const signal = points.map((p) => ({ re: p.x, im: p.y }));
  const coeffs = dft(signal);

  const all = [];
  for (let k = 0; k < N; k++) {
    const freq = k <= N / 2 ? k : k - N;
    all.push({
      k: freq,
      index: k,
      radius: mag(coeffs[k]),
      phase: arg(coeffs[k]),
      re: coeffs[k].re,
      im: coeffs[k].im,
    });
  }

  // Keep DC + strongest harmonics
  all.sort((a, b) => {
    if (a.k === 0) return -1;
    if (b.k === 0) return 1;
    return b.radius - a.radius;
  });

  const terms = all.slice(0, Math.min(maxTerms, N));
  return { terms, coeffs };
}

/** Evaluate orthogonal reconstruction at normalized time t ∈ [0,1). */
export function evalOrthogonal(seriesX, seriesY, t, termCount) {
  const kx = seriesX.terms.slice(0, termCount);
  const ky = seriesY.terms.slice(0, termCount);

  let x = seriesX.a0;
  let y = seriesY.a0;
  const xChain = [{ x: seriesX.a0, y: 0 }];
  const yChain = [{ x: 0, y: seriesY.a0 }];

  // X chain arranged vertically on the left: tip x = sum of cosines
  let cx = seriesX.a0;
  let cy = 0;
  for (const term of kx) {
    const ang = 2 * Math.PI * term.k * t + term.phase;
    const dx = term.radius * Math.cos(ang);
    const dy = term.radius * Math.sin(ang);
    cx += dx;
    cy += dy;
    xChain.push({ x: cx, y: cy });
  }
  x = cx;

  // Y chain on top: rotate by +π/2 so tip.y = Σ R cos(2πkt+φ) (= DFT reconstruction)
  // Video writes this as Σ R sin(2πkt + φ'); φ' = φ + π/2
  let yx = 0;
  let yy = seriesY.a0;
  for (const term of ky) {
    const ang = 2 * Math.PI * term.k * t + term.phase + Math.PI / 2;
    const dx = term.radius * Math.cos(ang);
    const dy = term.radius * Math.sin(ang);
    yx += dx;
    yy += dy;
    yChain.push({ x: yx, y: yy });
  }
  y = yy;

  return { x, y, xChain, yChain, kx, ky };
}

/** Evaluate complex epicycle chain at t ∈ [0,1). */
export function evalComplex(epicycles, t) {
  let x = 0;
  let y = 0;
  const chain = [{ x: 0, y: 0 }];
  for (const term of epicycles.terms) {
    const ang = 2 * Math.PI * term.k * t + term.phase;
    x += term.radius * Math.cos(ang);
    y += term.radius * Math.sin(ang);
    chain.push({ x, y });
  }
  return { x, y, chain };
}

/** Dense reconstructed polyline for one orthogonal series. */
export function reconstructOrthogonal(seriesX, seriesY, termCount, samples = 256) {
  const out = [];
  for (let i = 0; i < samples; i++) {
    const { x, y } = evalOrthogonal(seriesX, seriesY, i / samples, termCount);
    out.push({ x, y });
  }
  return out;
}

export function reconstructComplex(epicycles, samples = 256) {
  const out = [];
  for (let i = 0; i < samples; i++) {
    const { x, y } = evalComplex(epicycles, i / samples);
    out.push({ x, y });
  }
  return out;
}

/** Relative RMS error of truncated reconstruction vs samples. */
export function relativeRmsOrthogonal(points, seriesX, seriesY, termCount) {
  const N = points.length;
  let err = 0;
  let norm = 0;
  for (let n = 0; n < N; n++) {
    const t = n / N;
    const { x, y } = evalOrthogonal(seriesX, seriesY, t, termCount);
    const dx = x - points[n].x;
    const dy = y - points[n].y;
    err += dx * dx + dy * dy;
    norm += points[n].x * points[n].x + points[n].y * points[n].y;
  }
  if (norm < 1e-18) return 0;
  return 100 * Math.sqrt(err / norm);
}

export function relativeRmsComplex(points, epicycles) {
  const N = points.length;
  let err = 0;
  let norm = 0;
  for (let n = 0; n < N; n++) {
    const t = n / N;
    const { x, y } = evalComplex(epicycles, t);
    const dx = x - points[n].x;
    const dy = y - points[n].y;
    err += dx * dx + dy * dy;
    norm += points[n].x * points[n].x + points[n].y * points[n].y;
  }
  if (norm < 1e-18) return 0;
  return 100 * Math.sqrt(err / norm);
}

export function formatNum(v, digits = 2) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  const s = n.toFixed(digits);
  return s.replace(/^-0\.00$/, "0.00");
}
