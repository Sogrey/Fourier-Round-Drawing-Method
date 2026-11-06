import { formatNum } from "./fourier.js";

function formatCosTermTex(term) {
  const sign = term.phase >= 0 ? "+" : "-";
  return `${formatNum(term.radius, 3)}\\cos(2\\pi(${term.k})t ${sign} ${formatNum(Math.abs(term.phase), 2)})`;
}

function formatSinTermTex(term) {
  const phi = term.phase + Math.PI / 2;
  const sign = phi >= 0 ? "+" : "-";
  return `${formatNum(term.radius, 3)}\\sin(2\\pi(${term.k})t ${sign} ${formatNum(Math.abs(phi), 2)})`;
}

function formatComplexTermTex(term) {
  const sign = term.phase >= 0 ? "+" : "-";
  return `${formatNum(term.radius, 3)}\\, e^{i(2\\pi(${term.k})t ${sign} ${formatNum(Math.abs(term.phase), 2)})}`;
}

function seriesJoinTex(parts, full, totalCount) {
  if (full || parts.length >= totalCount) return parts.join(" + ") || "0";
  const shown = parts.slice(0, 2);
  const more = Math.max(0, totalCount - shown.length);
  return `${shown.join(" + ") || "0"}${more > 0 ? ` + \\cdots\\;[+${more}\\ \\mathrm{terms}]` : ""}`;
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
    const xParts = (fullFormula ? kx : kx.slice(0, 2)).map(formatCosTermTex);
    const yParts = (fullFormula ? ky : ky.slice(0, 2)).map(formatSinTermTex);
    return {
      partLabel,
      tip: "实时笔尖 (—, —)",
      lines: [
        {
          cls: "x",
          tex: "X(t)=x_0+\\sum_{k} R_{x,k}\\cos(2\\pi k t+\\varphi_{x,k})",
        },
        {
          cls: "x series",
          tex: `X(t)\\approx ${formatNum(part.seriesX.a0)} + ${seriesJoinTex(xParts, fullFormula, kx.length)}`,
        },
        {
          cls: "y",
          tex: "Y(t)=y_0+\\sum_{k} R_{y,k}\\sin(2\\pi k t+\\varphi_{y,k})",
        },
        {
          cls: "y series",
          tex: `Y(t)\\approx ${formatNum(part.seriesY.a0)} + ${seriesJoinTex(yParts, fullFormula, ky.length)}`,
        },
      ],
    };
  }

  const harmonics = part.complex.terms.filter((term) => term.k !== 0);
  const shown = fullFormula ? harmonics : harmonics.slice(0, 2);
  const top = shown.map(formatComplexTermTex);
  const dc = part.complex.terms.find((term) => term.k === 0);
  const dcTxt = dc ? `${formatNum(dc.re)} + i\\cdot ${formatNum(dc.im)}` : "0";

  return {
    partLabel,
    tip: "实时笔尖 (—, —)",
    lines: [
      {
        cls: "x",
        tex: "z(t)=\\sum_{k} C_k e^{i 2\\pi k t}",
      },
      {
        cls: "x series",
        tex: `z(t)\\approx (${dcTxt}) + ${seriesJoinTex(top, fullFormula, harmonics.length)}`,
      },
      {
        cls: "y",
        tex: "|C_k|\\rightarrow\\text{半径},\\ \\arg(C_k)\\rightarrow\\text{初相}",
      },
    ],
  };
}

export { formatNum };
