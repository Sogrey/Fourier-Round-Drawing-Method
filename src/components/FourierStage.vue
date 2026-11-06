<script setup>
import KatexFormula from "./KatexFormula.vue";

defineProps({
  demo: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["canvas"]);

function setCanvas(el) {
  emit("canvas", el || null);
}
</script>

<template>
  <section class="stage-wrap">
    <div
      class="formula"
      :class="{ 'is-full': demo.fullFormula }"
      aria-live="polite"
    >
      <div v-if="demo.formula.partLabel" class="tip">
        {{ demo.formula.partLabel }}
      </div>
      <div class="tip">{{ demo.tipText }}</div>
      <div
        v-for="(line, idx) in demo.formula.lines"
        :key="idx"
        :class="line.cls"
      >
        <KatexFormula :tex="line.tex" />
      </div>
    </div>

    <canvas :ref="setCanvas" width="1100" height="720" />

    <div class="stage-meta">
      <span>{{ demo.metaTitle }}</span>
      <span>{{ demo.metaError }}</span>
    </div>
  </section>
</template>
