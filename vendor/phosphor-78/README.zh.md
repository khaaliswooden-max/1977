# Phosphor 78

> **一次 BMAD 端到端实践。** 产物是 1978 Taito _Space Invaders_
> 街机版的高保真浏览器复刻；重点是产出它的四阶段工作流。

[English README](README.md)

<p align="center">
  <img src="docs/screenshots/02-formation.png" alt="游戏运行中——第一波，完整阵型推进，堡垒完好" width="380">
  &nbsp;&nbsp;
  <img src="docs/screenshots/05-behind-the-scenes-zh.png" alt="幕后 companion 页面——实时 CRT 滑杆 + 4000 字教学散文" width="380">
</p>
<p align="center">
  <em>左：能跑的游戏。右：被记录的实践——带实时可调参数和教学散文的 companion 页面，顶栏 EN / 中 可切。</em>
</p>

## 这个仓库是什么

这个仓库同时是两样东西：

1. **BMAD 实践案例**（BMAD 是一个 AI 辅助软件开发框架）。
   端到端跑完一个非平凡项目，四个阶段 -- 分析、规划、方案设计、实施 -- 留下了
   `_bmad-output/` 里的产出物和按 story 切分的提交记录，
   可以回头读，看每个决策是怎么做出来的。
2. **一个能跑的游戏** -- 1978 Taito 街机版的高保真浏览器复刻。
   WebGL2 CRT 着色器、AudioWorklet 芯片合成音、引用 ROM 的游戏常量。
   `behind-the-scenes` 页面记录了三大支柱怎么搭起来的，中英文均可。

大多数“BMAD demo”仓库停在规划产出物。这一个把四个阶段全部跑到了一个上线的产物，
所以“关于实践的文档”和“被实践塑形的代码”两者的比例是诚实的。

## 两扇门

| 如果你来找的是……       | 读这一份                                               |
| ---------------------- | ------------------------------------------------------ |
| 实战中的 BMAD 方法论   | [`docs/bmad-practice.zh.md`](docs/bmad-practice.zh.md) |
| 游戏本身（跑起来、玩） | [`docs/the-game.zh.md`](docs/the-game.zh.md)           |
| 时间序的开发日志       | [`DEVLOG.md`](DEVLOG.md)                               |
| BMAD 产出的规划材料    | [`_bmad-output/`](_bmad-output/)                       |

## 快速开始

```bash
pnpm install
pnpm dev          # 游戏在 http://localhost:5173
pnpm test         # 单元测试（396 个通过）
pnpm test:e2e     # Playwright e2e（16 个通过）
pnpm build        # 生产构建（约 70KB）
```

`pnpm dev` 跑起来后，幕后页面在 `http://localhost:5173/behind-the-scenes/`。
顶栏 `EN | 中` 切换语言。

## 项目状态

✅ **v1 候选**。49 个计划内 story 完成，加上 8 个 playtest 驱动的 v1 后修复 story。
冻结门状态见 [v1 checklist](docs/v1-checklist.md)；
四阶段产出见 [`docs/bmad-practice.zh.md`](docs/bmad-practice.zh.md)；
按 story 的叙事见 [`DEVLOG.md`](DEVLOG.md)。

## 法律

Phosphor 78 是 1978 Taito _Space Invaders_ 街机版的非官方致敬 / 教学研究品。
仅限非商业、个人 portfolio 用途。完整法律声明见
[`docs/the-game.zh.md`](docs/the-game.zh.md#legal)。
