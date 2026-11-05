<script setup>
defineProps({
  demo: {
    type: Object,
    required: true,
  },
});
</script>

<template>
  <aside class="panel">
    <label class="field">
      <span>图形</span>
      <select v-model="demo.shape">
        <optgroup
          v-for="group in demo.shapeGroups"
          :key="group.label"
          :label="group.label"
        >
          <option
            v-for="opt in group.options"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </option>
        </optgroup>
      </select>
    </label>

    <label class="field">
      <span>谐波组数 <em>{{ demo.terms }}</em></span>
      <input v-model.number="demo.terms" type="range" min="1" max="256" />
    </label>

    <label class="field">
      <span>采样点数 <em>{{ demo.samples }}</em></span>
      <input
        v-model.number="demo.samples"
        type="range"
        min="64"
        max="2048"
        step="64"
      />
    </label>

    <label class="field">
      <span>动画速度</span>
      <input v-model.number="demo.speed" type="range" min="1" max="40" />
    </label>

    <label class="field check">
      <span>显示完整公式</span>
      <input v-model="demo.fullFormula" type="checkbox" />
    </label>

    <div class="actions">
      <button type="button" class="primary" @click="demo.togglePlay()">
        {{ demo.playing ? "暂停" : "播放" }}
      </button>
      <button type="button" @click="demo.resetTrail()">重置轨迹</button>
    </div>

    <div class="explain">
      <h2>流程</h2>
      <ol>
        <li>在平面采样闭合路径 → 散点 \((x_n, y_n)\)</li>
        <li>视作周期复值函数 \(z(t)=x(t)+iy(t)\)</li>
        <li>对 \(x\)、\(y\)（或 \(z\)）做 DFT 得系数 \(C_k\)</li>
        <li>\(|C_k|\) → 半径，\(\arg(C_k)\) → 初相</li>
        <li>复数（向量）叠加 → 笔尖轨迹还原图形</li>
      </ol>
    </div>
  </aside>
</template>
