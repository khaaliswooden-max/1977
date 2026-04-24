# 音频主时钟 -- 为什么音频时钟驱动游戏

大多数浏览器游戏把 `requestAnimationFrame` 当主时钟用。Phosphor 78
不是这样。我们的主时钟是 AudioContext，渲染循环是它的从时钟。
为什么？

## 两个时钟

现代浏览器里有两个相关的时钟：

```svg
<svg viewBox="0 0 600 220" xmlns="http://www.w3.org/2000/svg" class="diagram">
  <defs>
    <marker id="arrow3" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0,0 L8,4 L0,8 z" fill="#00ff66" />
    </marker>
  </defs>
  <g font-family="monospace" font-size="11" fill="#ddd" text-anchor="middle">
    <rect x="20" y="20" width="200" height="60" fill="#220" stroke="#ffaa00" rx="4" />
    <text x="120" y="42">requestAnimationFrame</text>
    <text x="120" y="58">~16.6 ms</text>
    <text x="120" y="72" fill="#ffaa00" font-size="10">±1-3 ms 抖动</text>
    <rect x="380" y="20" width="200" height="60" fill="#143" stroke="#00ff66" rx="4" />
    <text x="480" y="42">AudioContext.currentTime</text>
    <text x="480" y="58">~22 µs 精度</text>
    <text x="480" y="72" fill="#00ff66" font-size="10">采样级精确</text>
    <line x1="220" y1="50" x2="375" y2="50" stroke="#888" stroke-dasharray="3 3" />
    <text x="300" y="42" fill="#888" font-size="10">两个并行时钟</text>
    <text x="300" y="62" fill="#888" font-size="10">分别在两条线程上</text>
    <rect x="190" y="130" width="220" height="60" fill="#143" stroke="#00ff66" rx="4" />
    <text x="300" y="160">音频是主，rAF 是从</text>
    <line x1="480" y1="80" x2="380" y2="130" stroke="#00ff66" marker-end="url(#arrow3)" />
    <line x1="120" y1="80" x2="220" y2="130" stroke="#888" stroke-dasharray="3 3" marker-end="url(#arrow3)" />
    <text x="300" y="210" fill="#888">渲染循环读音频时钟，绝不反过来。</text>
  </g>
</svg>
```

`requestAnimationFrame` 按显示器刷新率运行 -- 通常 60 Hz、有时
120 Hz、tab 隐藏时偶尔降到 1 Hz。回调是“尽力而为”：浏览器尽力
在 vsync 时刻调用，但主线程繁忙能把它推迟几毫秒，标签页被降
优先级时甚至能无限拖延。

`AudioContext.currentTime` 是采样级精确的。它按音频采样率
（通常 48 kHz）推进，由音频线程产生 -- 音频线程在 OS 中的优先级
比 JS 主线程更高。无论主线程在干什么，音频时钟都精确不停。

## 音频主时钟为什么对 Space Invaders 重要

Space Invaders 的行进节奏不只是音效，是游戏机制。4 步下行音
高循环随着外星人死去而加速，通过节奏感向玩家传达战况。如果
行进节奏每个音抖个 50 ms，老玩家立刻能听出来。

用 `requestAnimationFrame` 驱动行进音，每个音的触发时刻就会
继承 rAF 的抖动 -- 主线程紧张时轻易就 ±16 ms。用音频时钟驱动，
每个音的触发时刻无论渲染器怎样都是采样级精确的。

## 前瞻调度器

Web Audio 有个经典模式（Chris Wilson，_A Tale of Two Clocks_）
专门解决采样级精确事件调度：不要等到时刻到了再触发事件，而是
每隔几毫秒就把事件预约到 AudioContext 的近未来。

```svg
<svg viewBox="0 0 600 180" xmlns="http://www.w3.org/2000/svg" class="diagram">
  <g font-family="monospace" font-size="11">
    <text x="20" y="20" fill="#888">音频时钟时间线（右 = 未来）</text>
    <line x1="20" y1="80" x2="580" y2="80" stroke="#888" />
    <g stroke="#444" stroke-width="1">
      <line x1="80"  y1="76" x2="80"  y2="84" />
      <line x1="160" y1="76" x2="160" y2="84" />
      <line x1="240" y1="76" x2="240" y2="84" />
      <line x1="320" y1="76" x2="320" y2="84" />
      <line x1="400" y1="76" x2="400" y2="84" />
      <line x1="480" y1="76" x2="480" y2="84" />
    </g>
    <line x1="80" y1="50" x2="80" y2="110" stroke="#00ff66" stroke-width="2" />
    <text x="80" y="44" fill="#00ff66" text-anchor="middle">现在</text>
    <rect x="80" y="60" width="100" height="40" fill="#143" opacity="0.5" />
    <text x="130" y="55" fill="#00ff66" text-anchor="middle">前瞻 100ms</text>
    <g fill="#ffaa00">
      <circle cx="100" cy="80" r="4" />
      <circle cx="135" cy="80" r="4" />
      <circle cx="165" cy="80" r="4" />
    </g>
    <text x="130" y="125" fill="#ffaa00" text-anchor="middle">已预约的事件</text>
    <text x="130" y="138" fill="#ffaa00" text-anchor="middle">via setValueAtTime</text>
    <text x="20" y="170" fill="#888">每 25ms 跑一次轮询，把未来 100ms 内该触发的事件全部入队。</text>
  </g>
</svg>
```

Phosphor 78 的 `audio/clock.ts` 暴露：

- `currentTime` -- 透传 `audioContext.currentTime`。
- `currentStep(N)` -- 给定剩余 N 个外星人，返回当前的行进步
  索引。`currentTime` 的纯函数。
- `lookaheadUntil()` -- 返回 `currentTime + 100ms`。
- `scheduleAhead(fn)` -- 调用 `fn(until)`，让调用方把触发
  时刻 `<= until` 的事件入队。

轮询周期 25 ms (足够小以保持前瞻窗口饱满)，前瞻窗口 100 ms
（足够小让 pause-resume 在约 2 帧内响应，又足够大以吸收典型
的 setTimeout 抖动）。

## 渲染循环怎么读音频时钟

渲染器既不知也不在乎音频时钟怎么实现的。每一帧游戏循环读一次
`audioClock.currentTime`，把它传给 reducer，reducer 用它去判
断行进音走到哪一步：

```javascript
const { next, events } = tick(state, input, audioClock);
state = next;
events.forEach((e) => audioEngine.handle(e));
```

`tick` 是 `(state, input, clock)` 的纯函数，相同输入永远产生
相同输出。`clock` 参数是唯一的非确定性来源 -- 而它在真实音频
时钟下是确定的；只有*显示*刷新率才是抖动的那一个。

## 反汇编里的节奏表 -- 以及一个著名 bug

原版 1978 ROM 在地址 `$1A11` 和 `$1A21` 有一张表，把剩余外星
人数映射到拍间间隔，单位是 60 Hz 中断 tick：

| 剩余外星人（≥） | 间隔（中断） | 间隔（毫秒） |
| --------------: | -----------: | -----------: |
|              50 |           52 |          867 |
|              43 |           46 |          767 |
|              36 |           39 |          650 |
|              28 |           34 |          567 |
|              22 |           28 |          467 |
|              17 |           24 |          400 |
|              13 |           21 |          350 |
|              10 |           19 |          317 |
|               8 |           16 |          267 |
|               7 |           14 |          233 |
|               6 |           13 |          217 |
|               5 |           12 |          200 |
|               4 |           11 |          183 |
|               3 |            9 |          150 |
|               2 |            7 |          117 |
|               1 |            5 |           83 |

这张表 bit 精确写进了 `src/constants/computer-archeology.ts`
的 `MARCH_TEMPO_TABLE`。音频时钟的 `currentStep()` 用它。

ROM `$1D54` 处有另一个更著名的 bug，在 saucer 计分表里：环绕
检查写成 `< $63` 而不是 `< $64`，所以 16 字节的计分循环表的
第 16 个字节永远不会被读取。循环实际只有 15 长，索引 8（第 9
次击中）给 300 分。这就是著名的"每 15 次 saucer 击中就有一次
300 分"的由来。Phosphor 78 一字不差地复刻这个 bug，因为它是
原版的“承重特性”。

## 加速曲线

剩余外星人数到拍间间隔的映射长这样：

```svg
<svg viewBox="0 0 600 220" xmlns="http://www.w3.org/2000/svg" class="diagram">
  <g font-family="monospace" font-size="11">
    <line x1="40" y1="190" x2="580" y2="190" stroke="#888" />
    <line x1="40" y1="20"  x2="40"  y2="190" stroke="#888" />
    <text x="20" y="22"  fill="#888" text-anchor="middle">900</text>
    <text x="20" y="190" fill="#888" text-anchor="middle">0</text>
    <text x="40" y="210" fill="#888" text-anchor="middle">55</text>
    <text x="580" y="210" fill="#888" text-anchor="middle">1</text>
    <text x="310" y="210" fill="#888" text-anchor="middle">外星人剩余数</text>
    <text x="20" y="100" fill="#888" text-anchor="middle" transform="rotate(-90, 20, 100)">间隔（毫秒）</text>
    <polyline fill="none" stroke="#00ff66" stroke-width="2"
      points="40,30
              90,30 90,49
              160,49 160,69
              230,69 230,90
              290,90 290,114
              350,114 350,131
              400,131 400,148
              450,148 450,160
              490,160 490,174
              510,174 510,176
              530,176 530,178
              540,178 540,180
              550,180 550,182
              560,182 560,184
              570,184 570,186
              580,186" />
    <text x="490" y="20" fill="#00ff66">几何级，不是线性</text>
  </g>
</svg>
```

斜率开头很陡（每杀一个，下一个音省掉很多时间），后面变缓（再
往后杀的削减比例小很多）。配合 4 音循环的轮播，这就是末段那
种紧迫到几乎慌乱的感觉 -- 那种“听一耳朵就懂、用文字描述很难”
的感觉。

## 试一下上面的可视化

上面的 N 滑块让你扫过外星人数范围，看着拍间间隔从 867 ms 一路
落到 83 ms。一波刚开始时大约一秒一拍；快结束时一秒四拍。加速
是几何级的，不是线性 -- 这就是它“慌乱感”的来源。
