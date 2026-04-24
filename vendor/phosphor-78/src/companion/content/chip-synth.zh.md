# 芯片合成器是怎么工作的

1978 的 Space Invaders 街机内有一颗 Texas Instruments SN76477
音效芯片，外加几个分立元件振荡器。它发声的方式是：方波过
模拟滤波器，用人工调校的 RC 网络做调制。整个流程里没有任何
音频文件 -- 声音是电路，不是录音。

Phosphor 78 的音频遵循同一原则。**整个产物里没有一个音频文件**。
每一种声音都由 Web Audio 节点图实时合成，节点图的形状是按"1978
街机听起来的样子"设计的。

```svg
<svg viewBox="0 0 600 200" xmlns="http://www.w3.org/2000/svg" class="diagram">
  <defs>
    <marker id="arrow2" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0,0 L8,4 L0,8 z" fill="#00ff66" />
    </marker>
  </defs>
  <g font-family="monospace" font-size="11" fill="#ddd" text-anchor="middle">
    <rect x="10" y="80" width="120" height="40" fill="#143" stroke="#00ff66" rx="4" />
    <text x="70" y="105">SN76477 osc</text>
    <line x1="130" y1="100" x2="175" y2="100" stroke="#00ff66" marker-end="url(#arrow2)" />
    <rect x="180" y="80" width="120" height="40" fill="#220" stroke="#ffaa00" rx="4" />
    <text x="240" y="105">BiquadFilter</text>
    <line x1="300" y1="100" x2="345" y2="100" stroke="#00ff66" marker-end="url(#arrow2)" />
    <rect x="350" y="80" width="100" height="40" fill="#202" stroke="#ff66cc" rx="4" />
    <text x="400" y="105">ADSR gain</text>
    <line x1="450" y1="100" x2="495" y2="100" stroke="#00ff66" marker-end="url(#arrow2)" />
    <rect x="500" y="80" width="90" height="40" fill="#444" stroke="#ddd" rx="4" />
    <text x="545" y="105">Master</text>
    <text x="300" y="170" fill="#888">典型的单事件合成图：振荡器 → 滤波器 → 包络 → 总输出</text>
  </g>
</svg>
```

## 把振荡器塞进 AudioWorklet

Web Audio API 自带 `OscillatorNode`，能产生数学上完美的方波 /
锯齿波 / 三角波 / 正弦波。它们听起来很干净 -- 干净过头了。真正
的模拟振荡器有周期间抖动、轻微振幅波动、波形边缘并非 bit 精确
的周期重复。要拿到 1978 的那种“性格”，我们在 `AudioWorkletProcessor`
里写了自家的振荡器。

processor 跑在自己的 `AudioWorkletGlobalScope` realm 里，
`process()` 方法以音频线程的节奏运行，每次处理 128 采样。每个
采样我们做的是：

1. 把相位计数器推进 `frequency / sampleRate`。
2. 用当前相位查波形值，再叠一个非常小的逐采样抖动以打破完美
   周期。
3. 按波形类型加饱和处理：
   - **方波**在占空比边界上加亚采样级抖动
   - **锯齿波**用 `tanh(linear * drive)` 软预削波
   - **三角波**用上下不对称的斜率（正向斜率略短于负向）
   - **噪声**是一个 16 位 Galois LFSR (抽头 16、14、13、11)，
     给出每次跑都 bit 精确可重现的伪随机序列

“heat”参数（0..1）控制每种处理叠加多少。heat=0 时 worklet 和
标准振荡器无差别；heat=1 时听感明显“模拟”。

```svg
<svg viewBox="0 0 600 160" xmlns="http://www.w3.org/2000/svg" class="diagram">
  <g font-family="monospace" font-size="11">
    <text x="20" y="20" fill="#888">LFSR（16 位 Galois，抽头 16/14/13/11）</text>
    <g transform="translate(0, 30)">
      <g fill="#222" stroke="#888">
        <rect x="20"  y="0" width="35" height="35" />
        <rect x="55"  y="0" width="35" height="35" />
        <rect x="90"  y="0" width="35" height="35" />
        <rect x="125" y="0" width="35" height="35" />
        <rect x="160" y="0" width="35" height="35" />
        <rect x="195" y="0" width="35" height="35" />
        <rect x="230" y="0" width="35" height="35" />
        <rect x="265" y="0" width="35" height="35" />
        <rect x="300" y="0" width="35" height="35" />
        <rect x="335" y="0" width="35" height="35" />
        <rect x="370" y="0" width="35" height="35" />
        <rect x="405" y="0" width="35" height="35" />
        <rect x="440" y="0" width="35" height="35" />
        <rect x="475" y="0" width="35" height="35" />
        <rect x="510" y="0" width="35" height="35" />
        <rect x="545" y="0" width="35" height="35" />
      </g>
      <g fill="#143" stroke="#00ff66">
        <rect x="20"  y="0" width="35" height="35" />
        <rect x="90"  y="0" width="35" height="35" />
        <rect x="125" y="0" width="35" height="35" />
        <rect x="195" y="0" width="35" height="35" />
      </g>
      <g fill="#00ff66" font-size="10" text-anchor="middle">
        <text x="37" y="22">16</text>
        <text x="107" y="22">14</text>
        <text x="142" y="22">13</text>
        <text x="212" y="22">11</text>
      </g>
      <text x="20" y="60" fill="#888">这四个比特做 XOR，结果作为下一个比特送回位置 1。</text>
    </g>
  </g>
</svg>
```

确定性的 LFSR 对测试很重要。Reducer 是纯函数（CR1 禁止
`Math.random`），音频模块遵循同样的纪律 -- 同样的输入永远产生同
样的输出。这让 story 5.x 的频谱回归测试可以拿合成器输出去对比
参考录音，断言不会出现“忽过忽不过”的烦人状态。

## ADSR 包络生成

每个音的振幅都不是从 0 突然跳到峰值的方波 -- 它走经典的
Attack (起音) / Decay (衰减) / Sustain (持续) / Release (释音)
轮廓：

```svg
<svg viewBox="0 0 600 180" xmlns="http://www.w3.org/2000/svg" class="diagram">
  <g font-family="monospace" font-size="11">
    <line x1="20" y1="160" x2="580" y2="160" stroke="#888" />
    <line x1="20" y1="20"  x2="20"  y2="160" stroke="#888" />
    <text x="10" y="20" fill="#888" text-anchor="end">1</text>
    <text x="10" y="160" fill="#888" text-anchor="end">0</text>
    <text x="300" y="178" fill="#888" text-anchor="middle">时间</text>
    <polyline points="20,160 90,20 180,76 380,76 480,160" fill="none" stroke="#00ff66" stroke-width="2" />
    <g fill="#00ff66" font-size="10" text-anchor="middle">
      <text x="55"  y="14">A</text>
      <text x="135" y="14">D</text>
      <text x="280" y="68">S</text>
      <text x="430" y="14">R</text>
    </g>
    <line x1="90"  y1="20"  x2="90"  y2="160" stroke="#444" stroke-dasharray="4 3" />
    <line x1="180" y1="76"  x2="180" y2="160" stroke="#444" stroke-dasharray="4 3" />
    <line x1="380" y1="76"  x2="380" y2="160" stroke="#444" stroke-dasharray="4 3" />
    <text x="55"  y="172" fill="#888" text-anchor="middle">起音</text>
    <text x="135" y="172" fill="#888" text-anchor="middle">衰减</text>
    <text x="280" y="172" fill="#888" text-anchor="middle">持续（直到放键）</text>
    <text x="430" y="172" fill="#888" text-anchor="middle">释音</text>
  </g>
</svg>
```

包络 worklet 也是采样精确的。它的 `gate` 参数做边沿检测：上升
沿启动 attack-decay-sustain 斜坡，下降沿从当前值开始 release
段。时间用采样数计（基于全局 `sampleRate`），不用毫秒 -- 哪怕
调度器抖动 1 ms，包络形状也不会变，因为 worklet 直接数采样。

## 各事件的合成器

每一个游戏内事件都有自己的小工厂。Story 3.3-3.5 详谈过它们；
这里列个清单：

- **invader-march (行进音) ** -- 4 步下行音高循环（C3 / B2 /
  A♯2 / A2）。由 `audioClock.currentStep(N)` 驱动，N 是剩余
  外星人数，这就是著名的“外星人越少节奏越快”效果（详见时序
  那一章）。
- **shoot (开火音) ** -- 一个方波 chirp，在 80 ms 内从 1200 Hz
  滑到 200 Hz。短促、锐利、辨识度极高。
- **explosion (爆炸音) ** -- 经低通滤波的 LFSR 噪声，时长 300 ms。
  滤波器从 1500 Hz 扫到 200 Hz，所以音色是先开亮再收暗。
- **invader-killed (外星人被击毙) ** -- 经高通滤波的 LFSR 噪声，
  80 ms。比爆炸更亮更短，两者重叠时仍可分辨。
- **ufo（UFO 持续音）** -- 两个失谐 ±10 Hz 的锯齿波互相拍，叠
  一个 8 Hz 的 LFO 调制。这种“颤音”就是外星飞船的感觉。
- **ufo-killed（UFO 被击毙）** -- 带通滤波噪声混一个快速下滑
  的方波脉冲。和玩家爆炸刻意区分开。

每个合成器用不同的 LFSR 种子（0xACE1 / 0xBEEF / 0xCAFE），
让重叠时的声音不在数学上完全一样。

## CR7：AudioParam 的写入要“优雅”

我们刻意不踩的坑：直接给 `audioParam.value` 赋值。这种快捷写
法会在下一个音频线程 tick 设值，可能正好落在某个采样缓冲区
中间，产生一声“咔哒”。正确的写法是 `setValueAtTime(value, when)`
或 `linearRampToValueAtTime(value, when)`，这两个调度采样精确
的过渡。

Phosphor 78 的每一个音频模块都遵守 CR7。ESLint 没法强制（`value`
setter 看起来和普通属性赋值一模一样），但 story 3.x 的单合成器
测试断言每条触发路径都用调度 API。

## 为什么这些都塞在 22 KB 里

Phosphor 78 的生产构建 -- 含每个合成器、每个着色器、每个游戏
模块、持久化管线、以及这一页的每一字节教学内容 -- 总共约 70 KB
gzip。其中音频部分约 8 KB。**没有音频文件。没有兆级别的采样库**。
整个游戏的音频设计完全由 `setValueAtTime` 调用和振荡器图
构成。

这本身不是美德 -- 现代游戏需要的时候完全可以、也应该装大量
录音音频。但对于 1978 街机复刻，这是唯一诚实的选择。原机的
程序 ROM 不到 4 KB，且**毫无录音**。给一个 Space Invaders 仿
品塞 50 MB WAV 文件，那是 cosplay 而不是复刻。

结果是构建小到慢网也几乎瞬开、快到从输入事件到能听见声音不
到 1 ms、纯到 story 5.x 的频谱回归测试可以把每个合成器的特征
钉死在参考录音上，连模糊比对的余地都不留。

## 试一下上面的按钮

“试听”那一行会用当前 ADSR / 滤波值触发对应的合成器。拖动
ADSR 滑块再点按钮，就能听到新包络的形状。开行进音循环，再
拖滤波截止 -- 行进音的“性格”会实时变化。
