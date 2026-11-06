<script setup>
import { ref } from "vue";
import ControlPanel from "./components/ControlPanel.vue";
import FourierStage from "./components/FourierStage.vue";
import ModeCompare from "./components/ModeCompare.vue";
import { useFourierDemo } from "./composables/useFourierDemo.js";

const canvasRef = ref(null);
const demo = useFourierDemo(canvasRef);

function onCanvas(el) {
  canvasRef.value = el;
}
</script>

<template>
  <div class="app">
    <header class="header">
      <div class="brand">
        <span class="brand-mark">ℱ</span>
        <div>
          <h1>傅里叶本轮绘图法</h1>
          <p>
            {{
              demo.mode === "orthogonal"
                ? "正交圆周 · X / Y 分开做级数再投影合成"
                : "复平面本轮 · 一条复数本轮链直接叠加"
            }}
          </p>
        </div>
      </div>
      <div class="mode-toggle" role="tablist">
        <button
          type="button"
          class="mode-btn"
          :class="{ active: demo.mode === 'complex' }"
          @click="demo.mode = 'complex'"
        >
          复平面本轮
        </button>
        <button
          type="button"
          class="mode-btn"
          :class="{ active: demo.mode === 'orthogonal' }"
          @click="demo.mode = 'orthogonal'"
        >
          正交圆周
        </button>
      </div>
    </header>

    <main class="main">
      <FourierStage :demo="demo" @canvas="onCanvas" />
      <ControlPanel :demo="demo" />
    </main>

    <ModeCompare :demo="demo" />
  </div>
</template>
