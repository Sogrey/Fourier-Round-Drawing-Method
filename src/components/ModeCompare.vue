<script setup>
import KatexFormula from "./KatexFormula.vue";

const props = defineProps({
  demo: {
    type: Object,
    required: true,
  },
});

function selectMode(mode) {
  props.demo.mode = mode;
}
</script>

<template>
  <section class="docs">
    <div class="docs-head">
      <h2>两种模式对比</h2>
      <p>点击表头可切换；当前模式列会高亮。</p>
    </div>

    <div class="compare-table-wrap">
      <table class="compare-table">
        <thead>
          <tr>
            <th scope="col" class="col-label"></th>
            <th
              scope="col"
              class="col-mode"
              :class="{ active: demo.mode === 'complex' }"
            >
              <button type="button" @click="selectMode('complex')">
                复平面本轮
              </button>
            </th>
            <th
              scope="col"
              class="col-mode"
              :class="{ active: demo.mode === 'orthogonal' }"
            >
              <button type="button" @click="selectMode('orthogonal')">
                正交圆周
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row" class="col-label">做法</th>
            <td :class="{ active: demo.mode === 'complex' }">
              把路径看成复值函数
              <KatexFormula tex="z(t)=x(t)+iy(t)" />
              ，一次 DFT 展开成一条本轮链
            </td>
            <td :class="{ active: demo.mode === 'orthogonal' }">
              把闭合曲线拆成两个周期函数，对
              <KatexFormula tex="X(t)" />、
              <KatexFormula tex="Y(t)" />
              分别做傅里叶级数
            </td>
          </tr>
          <tr>
            <th scope="row" class="col-label">画面</th>
            <td :class="{ active: demo.mode === 'complex' }">
              一串圆首尾相接，链的末端直接就是笔尖，无正交投影线
            </td>
            <td :class="{ active: demo.mode === 'orthogonal' }">
              两路本轮（一侧管
              <KatexFormula tex="X" />
              ，一侧管
              <KatexFormula tex="Y" />
              ），虚线投影相交成笔尖
            </td>
          </tr>
          <tr>
            <th scope="row" class="col-label">圆心</th>
            <td :class="{ active: demo.mode === 'complex' }">
              通常从固定原点（或直流项 DC）向外相接；后一圆圆心是前一旋转向量的末端
            </td>
            <td :class="{ active: demo.mode === 'orthogonal' }">
              链内圆心随旋转臂移动；为对齐投影，链末端钉在笔尖坐标上，整链会随笔尖平移
            </td>
          </tr>
          <tr>
            <th scope="row" class="col-label">公式</th>
            <td :class="{ active: demo.mode === 'complex' }">
              <div class="formula-stack">
                <KatexFormula display tex="z(t)=\sum_{k} C_k e^{i 2\pi k t}" />
                <KatexFormula
                  display
                  tex="|C_k|\rightarrow\text{半径},\ \arg(C_k)\rightarrow\text{初相}"
                />
              </div>
            </td>
            <td :class="{ active: demo.mode === 'orthogonal' }">
              <div class="formula-stack">
                <KatexFormula
                  display
                  tex="X(t)=x_0+\sum_{k} R_{x,k}\cos(2\pi k t+\varphi_{x,k})"
                />
                <KatexFormula
                  display
                  tex="Y(t)=y_0+\sum_{k} R_{y,k}\sin(2\pi k t+\varphi_{y,k})"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="process">
      <h2>流程</h2>
      <ol>
        <li>
          采样闭合路径 →
          <KatexFormula tex="(x_n,y_n)" />
        </li>
        <li>
          视作
          <KatexFormula tex="z(t)=x(t)+iy(t)" />
        </li>
        <li>
          DFT 得
          <KatexFormula tex="C_k" />
        </li>
        <li>
          <KatexFormula tex="|C_k|" />
          → 半径，
          <KatexFormula tex="\arg(C_k)" />
          → 初相
        </li>
        <li>向量叠加 → 还原图形</li>
      </ol>
    </div>
  </section>
</template>
