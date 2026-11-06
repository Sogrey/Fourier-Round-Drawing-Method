# 傅里叶本轮绘图法

用傅里叶级数（本轮 / Epicycle）还原闭合平面曲线的 Vue 3 交互演示。

把图形轮廓采样成周期复值函数 \(z(t)=x(t)+iy(t)\)，做 DFT 得到系数 \(C_k\)，再用幅度与相位驱动一组旋转圆；圆上向量不断叠加，笔尖轨迹即还原原图形。

## 技术栈

- Vue 3
- Vite
- KaTeX（公式渲染）

## 两种模式

| 模式 | 做法 | 画面 |
| --- | --- | --- |
| **正交圆周** | 对 \(x(t)\)、\(y(t)\) 分别做傅里叶级数 | 左侧 X 本轮 + 顶侧 Y 本轮，虚线交于笔尖 |
| **复平面本轮** | 对 \(z(t)\) 一次复数 DFT | 一条本轮链在平面内叠加 |

## 在线演示

https://sogrey.github.io/Fourier-Round-Drawing-Method/

推送到 `main` 后，GitHub Actions 会自动构建并部署到 GitHub Pages。仓库需开启：

**Settings → Pages → Build and deployment → Source: GitHub Actions**

## 快速开始

```bash
pnpm install
pnpm run dev
```

浏览器访问终端提示的地址（默认带 base：http://localhost:8765/Fourier-Round-Drawing-Method/ ）。

```bash
pnpm run build    # 生产构建
pnpm run preview  # 预览构建结果
```

## 操作说明

- **图形**：中国（大陆 + 海南 + 台湾分画）/ 陕西 / 台湾等真实简化边界，以及心形、玫瑰线、摆线等示例
- **谐波组数**：圆的个数；越大越贴近原轮廓，相对 RMS 误差越小
- **采样点数**：路径离散点数
- **显示完整公式**：展开全部谐波项（可滚动）
- **动画速度 / 暂停 / 重置轨迹**：控制绘制过程

建议地图类轮廓把谐波开到 **64～128**。

## 目录结构

```
├── index.html
├── package.json
├── vite.config.js
├── scripts/                 # 边界数据生成脚本
└── src/
    ├── main.js
    ├── App.vue
    ├── components/
    │   ├── FourierStage.vue
    │   └── ControlPanel.vue
    ├── composables/
    │   └── useFourierDemo.js
    ├── lib/
    │   ├── fourier.js
    │   ├── shapes.js
    │   ├── draw.js
    │   └── formula.js
    ├── data/                # 简化后的轮廓数据
    └── styles/main.css
```

## 算法流程

1. 对闭合路径等弧长采样，得到 \((x_n,y_n)\)
2. 视作周期函数 \(z(t)=x(t)+iy(t)\)
3. DFT 得系数 \(C_k\)
4. \(|C_k|\)、\(\arg(C_k)\) 作为各圆半径与初相
5. 复数（向量）相加，笔尖走出原图形

中国轮廓将大陆、海南、台湾作为独立闭合路径分别做傅里叶并轮流绘制。

## 边界数据

`src/data/*.js` 由 [Aliyun DataV](https://geo.datav.aliyun.com/) 行政区划 GeoJSON 简化得到，仅作数学可视化，**非测绘用途**。

```bash
npm run build:boundaries
npm run build:china
```

## 许可

演示代码可自由使用与修改。地图边界数据请遵循数据源相关条款。
