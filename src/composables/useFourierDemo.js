import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { getShapeParts } from "../lib/shapes.js";
import {
  realSeriesFromSignal,
  complexEpicycles,
  evalOrthogonal,
  evalComplex,
  reconstructOrthogonal,
  reconstructComplex,
  relativeRmsOrthogonal,
  relativeRmsComplex,
} from "../lib/fourier.js";
import { drawFrame } from "../lib/draw.js";
import { buildFormulaModel, formatNum } from "../lib/formula.js";

export const SHAPE_GROUPS = [
  {
    label: "地图 / 轮廓",
    options: [
      { value: "china", label: "中国轮廓（大陆+海南+台湾）" },
      { value: "shaanxi", label: "陕西轮廓" },
      { value: "taiwan", label: "台湾轮廓" },
      { value: "mountain", label: "山峦剪影" },
      { value: "cat", label: "猫脸" },
      { value: "fish", label: "小鱼" },
      { value: "pi", label: "π 字形" },
    ],
  },
  {
    label: "经典曲线",
    options: [
      { value: "heart", label: "心形" },
      { value: "infinity", label: "无穷 ∞" },
      { value: "butterfly", label: "蝴蝶线" },
      { value: "rose3", label: "三叶玫瑰" },
      { value: "rose4", label: "四叶玫瑰" },
      { value: "clover", label: "三叶草" },
      { value: "lissajous", label: "李萨如" },
      { value: "blob", label: "随机气泡" },
    ],
  },
  {
    label: "几何 / 本轮亲戚",
    options: [
      { value: "circle", label: "圆" },
      { value: "ellipse", label: "椭圆" },
      { value: "triangle", label: "三角" },
      { value: "square", label: "方" },
      { value: "hexagon", label: "六边" },
      { value: "star", label: "五角星" },
      { value: "star6", label: "六芒星" },
      { value: "epitrochoid", label: "外摆线" },
      { value: "hypocycloid", label: "内摆线" },
    ],
  },
];

function buildPartModel(part, terms) {
  const xs = part.points.map((p) => p.x);
  const ys = part.points.map((p) => p.y);
  const seriesX = realSeriesFromSignal(xs, terms);
  const seriesY = realSeriesFromSignal(ys, terms);
  const complex = complexEpicycles(part.points, terms + 1);
  return {
    id: part.id,
    label: part.label,
    points: part.points,
    weight: Math.max(0.08, part.points.length),
    seriesX,
    seriesY,
    complex,
    rmsOrtho: relativeRmsOrthogonal(part.points, seriesX, seriesY, terms),
    rmsComplex: relativeRmsComplex(part.points, complex),
    reconOrtho: reconstructOrthogonal(seriesX, seriesY, terms, Math.max(128, part.points.length)),
    reconComplex: reconstructComplex(complex, Math.max(128, part.points.length)),
  };
}

export function useFourierDemo(canvasRef) {
  const mode = ref("orthogonal");
  const shape = ref("china");
  const terms = ref(64);
  const samples = ref(512);
  const speed = ref(12);
  const fullFormula = ref(false);
  const playing = ref(true);

  const parts = ref([]);
  const activeIndex = ref(0);
  const localT = ref(0);
  const globalT = ref(0);
  const tipText = ref("实时笔尖 (—, —)");

  let rafId = 0;
  let lastTs = 0;

  const activePart = computed(() => parts.value[activeIndex.value] || parts.value[0] || null);

  const weightedRms = computed(() => {
    let err = 0;
    let wsum = 0;
    for (const part of parts.value) {
      const rms = mode.value === "orthogonal" ? part.rmsOrtho : part.rmsComplex;
      err += rms * part.weight;
      wsum += part.weight;
    }
    return wsum > 0 ? err / wsum : 0;
  });

  const metaTitle = computed(() => {
    const part = activePart.value;
    const multi = parts.value.length > 1;
    if (!part) return "—";
    if (mode.value === "orthogonal") {
      return multi
        ? `正交圆周 : ${terms.value} × 2 组 · ${part.label}`
        : `正交圆周 : ${terms.value} × 2 组`;
    }
    return multi
      ? `复平面本轮 : ${part.complex.terms.length} 个圆 · ${part.label}`
      : `复平面本轮 : ${part.complex.terms.length} 个圆`;
  });

  const metaError = computed(() => {
    const rmsTxt = weightedRms.value.toFixed(4);
    if (parts.value.length > 1) {
      const labels = parts.value.map((p) => p.label).join("+");
      return `相对 RMS 误差 : ${rmsTxt}%（${labels} 分画）`;
    }
    return `相对 RMS 误差 : ${rmsTxt}%`;
  });

  const formula = computed(() =>
    buildFormulaModel({
      mode: mode.value,
      part: activePart.value,
      terms: terms.value,
      fullFormula: fullFormula.value,
      partsCount: parts.value.length,
      activeIndex: activeIndex.value,
    })
  );

  function rebuild() {
    const rawParts = getShapeParts(shape.value, samples.value);
    parts.value = rawParts.map((part) => buildPartModel(part, terms.value));
    activeIndex.value = 0;
    localT.value = 0;
    globalT.value = 0;
  }

  function advanceTime(dt) {
    if (!parts.value.length) return;
    const spd = speed.value / 100;
    const weights = parts.value.map((p) => p.weight);
    const totalW = weights.reduce((a, b) => a + b, 0);
    let phase = globalT.value * totalW + dt * spd * totalW;
    phase = ((phase % totalW) + totalW) % totalW;
    globalT.value = phase / totalW;

    let acc = 0;
    for (let i = 0; i < parts.value.length; i++) {
      const next = acc + weights[i];
      if (phase < next || i === parts.value.length - 1) {
        activeIndex.value = i;
        localT.value = (phase - acc) / weights[i];
        break;
      }
      acc = next;
    }
  }

  function paint() {
    const canvas = canvasRef.value;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const tipMath = drawFrame(ctx, canvas, {
      mode: mode.value,
      parts: parts.value,
      activeIndex: activeIndex.value,
      localT: localT.value,
      terms: terms.value,
      _eval: { evalOrthogonal, evalComplex },
    });
    if (!tipMath) return;
    if (mode.value === "orthogonal") {
      tipText.value = `实时笔尖 (${formatNum(tipMath.x)}, ${formatNum(tipMath.y)})`;
    } else {
      tipText.value = `实时笔尖 (${formatNum(tipMath.x)}, ${formatNum(tipMath.y)}) · 链长 ${tipMath.chainLen}`;
    }
  }

  function loop(ts) {
    if (!lastTs) lastTs = ts;
    const dt = (ts - lastTs) / 1000;
    lastTs = ts;
    if (playing.value) advanceTime(dt);
    paint();
    rafId = requestAnimationFrame(loop);
  }

  function togglePlay() {
    playing.value = !playing.value;
  }

  function resetTrail() {
    globalT.value = 0;
    activeIndex.value = 0;
    localT.value = 0;
  }

  watch([shape, terms, samples], rebuild);

  onMounted(() => {
    rebuild();
    rafId = requestAnimationFrame(loop);
  });

  onUnmounted(() => {
    cancelAnimationFrame(rafId);
  });

  return reactive({
    mode,
    shape,
    terms,
    samples,
    speed,
    fullFormula,
    playing,
    tipText,
    metaTitle,
    metaError,
    formula,
    shapeGroups: SHAPE_GROUPS,
    togglePlay,
    resetTrail,
  });
}
