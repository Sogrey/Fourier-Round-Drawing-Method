import { formatNum } from "./fourier.js";

function formatCosTerm(term) {
  const sign = term.phase >= 0 ? "+" : "−";
  return `${formatNum(term.radius, 3)}·cos(2π(${term.k})t ${sign} ${formatNum(Math.abs(term.phase), 2)})`;
}

function formatSinTerm(term) {
  const phi = term.phase + Math.PI / 2;
  const sign = phi >= 0 ? "+" : "−";
  return `${formatNum(term.radius, 3)}·sin(2π(${term.k})t ${sign} ${formatNum(Math.abs(phi), 2)})`;
}

function formatComplexTerm(term) {
  const sign = term.phase >= 0 ? "+" : "−";
  return `${formatNum(term.radius, 3)} e<sup>i(2π(${term.k})t ${sign} ${formatNum(Math.abs(term.phase), 2)})</sup>`;
}

function seriesJoin(parts, full, totalCount) {
  if (full || parts.length >= totalCount) return parts.join(" + ") || "0";
  const shown = parts.slice(0, 2);
  const more = Math.max(0, totalCount - shown.length);
  return `${shown.join(" + ") || "0"}${more > 0 ? ` + … [+${more} terms]` : ""}`;
}

export function buildFormulaModel({ mode, part, terms, fullFormula, partsCount, activeIndex }) {
  if (!part) {
    return {
      partLabel: "",
      tip: "实时笔尖 (—, —)",
      lines: [],
    };
  }

  const partLabel =
    partsCount > 1 ? `当前分画：${part.label}（${activeIndex + 1}/${partsCount}）` : "";

  if (mode === "orthogonal") {
    const kx = part.seriesX.terms.slice(0, terms);
    const ky = part.seriesY.terms.slice(0, terms);
    const xParts = (fullFormula ? kx : kx.slice(0, 2)).map(formatCosTerm);
    const yParts = (fullFormula ? ky : ky.slice(0, 2)).map(formatSinTerm);
    return {
      partLabel,
      tip: "实时笔尖 (—, —)",
      lines: [
        { cls: "x", html: "X(t) = x₀ + Σ R<sub>x,k</sub> cos(2πkt + φ<sub>x,k</sub>)" },
        {
          cls: "x series",
          html: `X(t) ≈ ${formatNum(part.seriesX.a0)} + ${seriesJoin(xParts, fullFormula, kx.length)}`,
        },
        { cls: "y", html: "Y(t) = y₀ + Σ R<sub>y,k</sub> sin(2πkt + φ<sub>y,k</sub>)" },
        {
          cls: "y series",
          html: `Y(t) ≈ ${formatNum(part.seriesY.a0)} + ${seriesJoin(yParts, fullFormula, ky.length)}`,
        },
      ],
    };
  }

  const harmonics = part.complex.terms.filter((term) => term.k !== 0);
  const shown = fullFormula ? harmonics : harmonics.slice(0, 2);
  const top = shown.map(formatComplexTerm);
  const dc = part.complex.terms.find((term) => term.k === 0);
  const dcTxt = dc ? `${formatNum(dc.re)} + i·${formatNum(dc.im)}` : "0";

  return {
    partLabel,
    tip: "实时笔尖 (—, —)",
    lines: [
      { cls: "x", html: "z(t) = Σ C<sub>k</sub> e<sup>i 2π k t</sup>" },
      {
        cls: "x series",
        html: `z(t) ≈ (${dcTxt}) + ${seriesJoin(top, fullFormula, harmonics.length)}`,
      },
      {
        cls: "y",
        html: "|C<sub>k</sub>| → 半径，arg(C<sub>k</sub>) → 初相；向量（复数）相加还原曲线",
      },
    ],
  };
}

export { formatNum };
