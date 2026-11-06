export function worldToScreen(x, y, layout) {
  return {
    x: layout.originX + x * layout.scale,
    y: layout.originY - y * layout.scale,
  };
}

export function layoutFor(mode, width, height, options = {}) {
  const compact =
    options.compact ?? (width / Math.max(height, 1) < 1.15 || width < 900);

  if (mode === "orthogonal") {
    if (compact) {
      // 窄屏：图形居中放大，本轮链缩小以免占版面
      const s = Math.min(width, height);
      return {
        originX: width * 0.5,
        originY: height * 0.55,
        scale: s * 0.4,
        chainScale: s * 0.16,
        xAnchor: { x: width * 0.08, y: height * 0.55 },
        yAnchor: { x: width * 0.5, y: height * 0.08 },
        boxPad: 1.05,
        compact: true,
      };
    }
    // 桌面：图形居中放大，本轮链单独缩小
    const s = Math.min(width, height);
    return {
      originX: width * 0.52,
      originY: height * 0.56,
      scale: s * 0.36,
      chainScale: s * 0.14,
      xAnchor: { x: width * 0.1, y: height * 0.56 },
      yAnchor: { x: width * 0.52, y: height * 0.1 },
      boxPad: 1.08,
      compact: false,
    };
  }

  if (compact) {
    const s = Math.min(width, height);
    return {
      originX: width * 0.5,
      originY: height * 0.52,
      scale: s * 0.4,
      chainScale: s * 0.4,
      boxPad: 1.05,
      compact: true,
    };
  }

  const s = Math.min(width, height);
  return {
    originX: width * 0.5,
    originY: height * 0.52,
    scale: s * 0.38,
    chainScale: s * 0.38,
    boxPad: 1.08,
    compact: false,
  };
}

function drawCircle(ctx, cx, cy, r, stroke, lineWidth = 1) {
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(r, 0.5), 0, Math.PI * 2);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

export function drawEpicycles(ctx, chain, color, maxCircles = 48) {
  const n = Math.min(chain.length - 1, maxCircles);
  for (let i = 0; i < n; i++) {
    const a = chain[i];
    const b = chain[i + 1];
    const r = Math.hypot(b.x - a.x, b.y - a.y);
    drawCircle(ctx, a.x, a.y, r, color, i === 0 ? 1.4 : 1);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  if (chain.length > 1) {
    const tip = chain[chain.length - 1];
    const lastDrawn = chain[Math.min(n, chain.length - 1)];
    if (n < chain.length - 1) {
      ctx.beginPath();
      ctx.moveTo(lastDrawn.x, lastDrawn.y);
      ctx.lineTo(tip.x, tip.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
}

export function strokeClosed(ctx, points, layout, style, width) {
  if (!points.length) return;
  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    const p = worldToScreen(points[i].x, points[i].y, layout);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  ctx.strokeStyle = style;
  ctx.lineWidth = width;
  ctx.stroke();
}

export function drawFrame(ctx, canvas, state) {
  const { mode, parts, activeIndex, localT, terms } = state;
  const part = parts[activeIndex] || parts[0];
  if (!part) return null;

  const layout = layoutFor(mode, canvas.width, canvas.height, {
    compact: state.compact,
  });
  const chainScale = layout.chainScale ?? layout.scale;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const p of parts) {
    strokeClosed(ctx, p.points, layout, "rgba(255,255,255,0.14)", 1.2);
  }

  for (const p of parts) {
    const recon = mode === "orthogonal" ? p.reconOrtho : p.reconComplex;
    const isActive = p === part;
    strokeClosed(
      ctx,
      recon,
      layout,
      isActive ? "#4ec4ff" : "rgba(78,196,255,0.55)",
      isActive ? 2.2 : 1.6
    );
  }

  const box = layout.boxPad * layout.scale;
  ctx.strokeStyle = "rgba(143,163,181,0.25)";
  ctx.lineWidth = 1;
  ctx.strokeRect(layout.originX - box, layout.originY - box, box * 2, box * 2);

  let tip;
  let tipMath;

  if (mode === "orthogonal") {
    const { evalOrthogonal } = state._eval;
    const ev = evalOrthogonal(part.seriesX, part.seriesY, localT, terms);
    tipMath = { x: ev.x, y: ev.y };
    tip = worldToScreen(ev.x, ev.y, layout);

    const xTipTarget = { x: tip.x, y: layout.xAnchor.y };
    const xMathTip = ev.xChain[ev.xChain.length - 1];
    const xChainAnchored = ev.xChain.map((p) => ({
      x: xTipTarget.x + (p.x - xMathTip.x) * chainScale,
      y: xTipTarget.y - (p.y - xMathTip.y) * chainScale,
    }));

    const yTipTarget = { x: layout.yAnchor.x, y: tip.y };
    const yMathTip = ev.yChain[ev.yChain.length - 1];
    const yChainAnchored = ev.yChain.map((p) => ({
      x: yTipTarget.x + (p.x - yMathTip.x) * chainScale,
      y: yTipTarget.y - (p.y - yMathTip.y) * chainScale,
    }));

    drawEpicycles(ctx, xChainAnchored, "rgba(94,196,168,0.85)");
    drawEpicycles(ctx, yChainAnchored, "rgba(106,168,232,0.85)");

    const xTip = xChainAnchored[xChainAnchored.length - 1];
    const yTip = yChainAnchored[yChainAnchored.length - 1];

    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(xTip.x, xTip.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.strokeStyle = "rgba(94,196,168,0.7)";
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(yTip.x, yTip.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.strokeStyle = "rgba(106,168,232,0.7)";
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    const { evalComplex } = state._eval;
    const ev = evalComplex(part.complex, localT);
    tipMath = { x: ev.x, y: ev.y };
    const chainScreen = ev.chain.map((p) => worldToScreen(p.x, p.y, layout));
    drawEpicycles(ctx, chainScreen, "rgba(78,196,255,0.8)");
    tip = worldToScreen(ev.x, ev.y, layout);
    tipMath.chainLen = ev.chain.length - 1;
  }

  ctx.beginPath();
  ctx.arc(tip.x, tip.y, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = "#e8b86d";
  ctx.fill();

  return tipMath;
}
