# CRT 着色器是怎么工作的

1978 年的街机版 Space Invaders 用阴极射线管（CRT）把图像打在
屏幕上。现代平板显示器的像素是近乎完美的清晰度和均匀亮度 --
CRT 两样都没有。它的“难看”恰恰是它的迷人之处：柔和的辉光、
肉眼可见的水平扫描线、屏幕边缘的微微弧度、亮像素向周围渗出
的光 -- 这些“故意的瑕疵”才让 1978 看起来像 1978。Phosphor 78
把每一项都作为一层 WebGL2 片元着色器有意复刻。

## 渲染管线

每一帧画面都要经过四步：

1. Reducer 从前一帧 `GameState` 推导出新的 `GameState`。
2. 一个隐藏的 224×256 Canvas2D 光栅化器把 sprite 和 HUD 画
   到这块小位图里。
3. WebGL2 管线把这块位图作为纹理上传 GPU，跑三个 pass：
   source-upload → 持久化 ping-pong → 合成。
4. 合成 pass 把最终图像写到可见画布上，浏览器再用最近邻
   插值把它放大到页面分配给它的物理尺寸。

```svg
<svg viewBox="0 0 600 130" xmlns="http://www.w3.org/2000/svg" class="diagram">
  <defs>
    <marker id="arrow" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0,0 L8,4 L0,8 z" fill="#00ff66" />
    </marker>
  </defs>
  <g font-family="monospace" font-size="11" fill="#ddd" text-anchor="middle">
    <rect x="10" y="40" width="100" height="50" fill="#143" stroke="#00ff66" rx="4" />
    <text x="60" y="60">Reducer</text>
    <text x="60" y="76">GameState</text>
    <line x1="110" y1="65" x2="155" y2="65" stroke="#00ff66" marker-end="url(#arrow)" />
    <rect x="160" y="40" width="100" height="50" fill="#222" stroke="#888" rx="4" />
    <text x="210" y="60">Canvas2D</text>
    <text x="210" y="76">224×256</text>
    <line x1="260" y1="65" x2="305" y2="65" stroke="#00ff66" marker-end="url(#arrow)" />
    <rect x="310" y="40" width="100" height="50" fill="#220" stroke="#ffaa00" rx="4" />
    <text x="360" y="56">Upload +</text>
    <text x="360" y="70">Persistence</text>
    <text x="360" y="84">RGBA16F</text>
    <line x1="410" y1="65" x2="455" y2="65" stroke="#00ff66" marker-end="url(#arrow)" />
    <rect x="460" y="40" width="130" height="50" fill="#202" stroke="#ff66cc" rx="4" />
    <text x="525" y="60">Composite</text>
    <text x="525" y="76">CRT 效果</text>
  </g>
</svg>
```

这种分层是有意为之。游戏与 CRT 效果是真正解耦的：你可以禁用
整条 WebGL 管线（URL 加 `?tier=low`，或构建时设
`disableShader: true`），游戏照样跑 -- 直接用 Canvas2D 画到
画布上。CRT 层是锦上添花，不是必需品。

## 持久化 -- 荧光的辉光

真实 CRT 的荧光粉在电子束扫过之后并不会立刻熄灭，会按指数衰减
持续几毫秒。在 Space Invaders 这种快节奏游戏里，这一现象表现
为运动 sprite 后面的柔和辉光拖尾 -- 尤其在玩家炮台和子弹上最为
明显。

Phosphor 78 用 ping-pong framebuffer pass 复刻这个效果。每一帧
着色器算的是：

```
output = max(currentFrame, previousFrame * decay)
```

这里的 `max` 很关键。如果写成普通的 `mix(prev, current, decay)`，
拖尾就永远不会真的消失，会把当前活跃的 sprite 弄脏。取 max 意味着
亮像素平滑衰减到黑，但任何新的亮源能立即压过它。两块 framebuffer
每帧交换角色，这样就能在写新帧的同时采样上一帧的输出。

为什么用 RGBA16F 而不是 RGBA8？因为反复乘 `decay`（≈0.92）在
8 位下量化得很难看，淡出 5 帧之内输出就开始出现条带。RGBA16F
让半精度浮点贯穿整条链路。

decay 值作为可调信号暴露出来。拖动上面的“荧光残留”滑块就能看到
拖尾长度的变化。0 时游戏显得冷峻锋利；0.99 时 sprite 会拖到下
一帧里，效果纯属玩乐。

## 弧度 -- 圆润的屏幕边缘

旧 CRT 的屏幕在两个方向上都是物理弯曲的（即著名的“子弹”玻璃）。
着色器把采样 UV 按照到屏幕中心的距离做二次方扭曲，模拟这一现象：

```glsl
vec2 cc = uv - 0.5;
float dist = dot(cc, cc) * strength;
return uv + cc * (1.0 + dist) * dist;
```

这就是“Lottes 枕形” -- Timothy Lottes 提出的简单有效的 CRT 形变
模型，已成为复古模拟器着色器的通用语言。扭出 `[0, 1]` 之外的
UV 直接被截到黑色，这就形成了圆角边的视觉效果：屏幕半径有限，
之外是死寂的虚空。

弧度强度作为信号暴露，访客可以从 0（平板）一直推到 0.3（一台
经历沧桑的 CRT）。

## 网格点掩膜 -- RGB 条纹图案

第三个肉眼可见的 CRT 现象是掩膜：电子枪和荧光粉之间的金属网
限定了“哪种电子打到哪种颜色”。Trinitron CRT (索尼最知名的设计)
用的是垂直金属丝，放大镜下能看到狭长的彩色竖条。便宜的影孔掩膜
CRT 则用蜂窝状的点阵。

Phosphor 78 的 Mid 和 High 两档模拟网格点掩膜：

```glsl
int phase = int(mod(col, 3.0));
vec3 mask = vec3(0.7);
if      (phase == 0) mask.r = 1.0;
else if (phase == 1) mask.g = 1.0;
else                 mask.b = 1.0;
```

每一物理列归属三相之一。输出颜色乘以一个偏向该相位的掩膜。
非该相位通道保留 0.7 倍而不是 0，因为如果两个通道都减半，整
张图像会暗到只剩三分之一。

```svg
<svg viewBox="0 0 600 100" xmlns="http://www.w3.org/2000/svg" class="diagram">
  <g>
    <rect width="600" height="100" fill="#000" />
    <g font-family="monospace" font-size="11" fill="#888" text-anchor="middle">
      <text x="300" y="92">网格点掩膜——每 3 列构成一组 R/G/B 三联</text>
    </g>
  </g>
  <g id="stripes">
    <rect x="0"   y="20" width="20" height="60" fill="#ff0000" />
    <rect x="20"  y="20" width="20" height="60" fill="#00ff00" />
    <rect x="40"  y="20" width="20" height="60" fill="#0000ff" />
    <rect x="60"  y="20" width="20" height="60" fill="#ff0000" />
    <rect x="80"  y="20" width="20" height="60" fill="#00ff00" />
    <rect x="100" y="20" width="20" height="60" fill="#0000ff" />
    <rect x="120" y="20" width="20" height="60" fill="#ff0000" />
    <rect x="140" y="20" width="20" height="60" fill="#00ff00" />
    <rect x="160" y="20" width="20" height="60" fill="#0000ff" />
    <rect x="180" y="20" width="20" height="60" fill="#ff0000" />
    <rect x="200" y="20" width="20" height="60" fill="#00ff00" />
    <rect x="220" y="20" width="20" height="60" fill="#0000ff" />
    <rect x="240" y="20" width="20" height="60" fill="#ff0000" />
    <rect x="260" y="20" width="20" height="60" fill="#00ff00" />
    <rect x="280" y="20" width="20" height="60" fill="#0000ff" />
    <rect x="300" y="20" width="20" height="60" fill="#ff0000" />
    <rect x="320" y="20" width="20" height="60" fill="#00ff00" />
    <rect x="340" y="20" width="20" height="60" fill="#0000ff" />
    <rect x="360" y="20" width="20" height="60" fill="#ff0000" />
    <rect x="380" y="20" width="20" height="60" fill="#00ff00" />
    <rect x="400" y="20" width="20" height="60" fill="#0000ff" />
    <rect x="420" y="20" width="20" height="60" fill="#ff0000" />
    <rect x="440" y="20" width="20" height="60" fill="#00ff00" />
    <rect x="460" y="20" width="20" height="60" fill="#0000ff" />
    <rect x="480" y="20" width="20" height="60" fill="#ff0000" />
    <rect x="500" y="20" width="20" height="60" fill="#00ff00" />
    <rect x="520" y="20" width="20" height="60" fill="#0000ff" />
    <rect x="540" y="20" width="20" height="60" fill="#ff0000" />
    <rect x="560" y="20" width="20" height="60" fill="#00ff00" />
    <rect x="580" y="20" width="20" height="60" fill="#0000ff" />
  </g>
</svg>
```

## 光晕 -- 亮像素周围的辉光

真实 CRT 的亮像素会把光“渗”到周围的玻璃和荧光层里 -- 这种光环
效应叫 halation。Phosphor 78 的 High 档对每个像素采样八邻域，
把任何亮度超过 0.5 的邻居加回去一个比例：

```glsl
for (int dy = -1; dy <= 1; dy++) {
  for (int dx = -1; dx <= 1; dx++) {
    vec3 s = texture(tex, uv + vec2(dx, dy) * texel).rgb;
    float lum = dot(s, vec3(0.299, 0.587, 0.114));
    if (lum > 0.5) sum += s;
  }
}
return sum * (strength / 9.0);
```

本质就是只针对亮像素的 9-tap 盒形模糊。便宜到可以在集成显卡
上跑 60fps，又昂贵到可以让爆炸和玩家炮台看上去真的“在发光”。

## 色散 -- 边缘的颜色偏移

真实 CRT 的玻璃就是一面透镜，便宜的 CRT 玻璃就是一面差透镜。
不同波长的光透过玻璃的折射略有差别，输出的红、绿、蓝子像素
最终会落到观察者视网膜上略不同的位置 -- 边角处玻璃最厚，色散
也最明显。

Phosphor 78 的 High 档对 R 与 B 通道分别按距屏幕中心的距离
偏移 UV 采样：

```glsl
vec2 cc = uv - 0.5;
float r = length(cc);
vec2 dir = cc / r;
vec2 caOffset = dir * 0.0015 * r;
float r_ = texture(tex, uv + caOffset).r;
float g_ = texture(tex, uv).g;
float b_ = texture(tex, uv - caOffset).b;
```

0.0015 这个系数小到屏幕中心几乎不可察觉，但在边角已经"恰好
能看到"。

## 关于 RGBA8 和 RGBA16F

帧缓冲格式为什么这么重要？想象一个画到 framebuffer 里的纯白
像素。持久化 pass 读出它再写回 `pixel * decay`，1.0 变 0.92。
下一帧读出 0.92 写回 0.85，再变 0.78、0.71……每次乘法单看都
没事，但误差会累积。

RGBA8 下，那个像素以整数 255 存。一次乘后变 235（`255*0.92`
四舍五入），两次后 216，三次后 199。每一步舍入误差约 0.4%，
但因为数值本身在变小，相对误差越来越大。第十帧，累积误差就
会以条带的形式出现 -- 本应平滑的淡出变成离散亮度的台阶。

RGBA16F 下，同样这条乘法链可以平滑跑上千帧。代价是 RGBA16F
纹理占两倍内存、两倍带宽，所以我们只在真正需要的地方用它
（持久化 ping-pong）。合成 pass 在最末写出 RGBA8 到画布 --
反正显示器本身也是 8 位每通道。

## 为什么不直接用现成的 CRT 着色器库

CRT-Royale、Lottes 家族、索尼的 Megatron……成熟的 CRT 着色器
库一抓一大把，效果惊艳。我们为什么要自己写？

针对本项目特有的三条理由：

- 这件事的乐趣在于*理解*这套数学，不是把它推给别人。从库里
  抄过来等于绕开了这个项目存在的全部理由。
- 库里的着色器通常是为模拟器多 pass 框架设计的，前提是能完整
  访问 framebuffer。我们的管线只有三个 pass，因为我们只需要
  这些；硬塞一个 10 pass 的 CRT-Royale 进来等于背着自己看不懂
  的代码去渲染我们大部分都不用的效果。
- 内联的 `/* glsl */` 模板字符串让着色器和用它的 JavaScript
  在同一个文件里就可以审视。没有单独的 `.glsl` 目录、没有构建
  时的 GLSL 预处理器 -- 着色器出问题的时候，你查的就是查 JS bug
  时同一个文件。

我们的确读过的来源 -- Lottes 枕形公式、网格点掩膜图案、只对
亮像素生效的光晕核 -- 都明确归档在 `references/shaders/`。模式
是从那里来的，实现是原创的。

## 三档是怎么叠的

Story 4.6 的分级阶梯是构建时编译的，不是运行时分支。我们编译
出三个独立的片元着色器对应三个独立的 GLSL 程序；档位切换在启
动时挑一个，整个会话用它到底。着色器内不会有
`if (tier == high) doFancy()` 的写法，因为片元着色器中的分支
会重创低端 GPU 的吞吐量。

| 档位 | 包含效果                 |
| ---- | ------------------------ |
| Low  | 枕形弧度 + 扫描线        |
| Mid  | + 网格点掩膜 + 更强弧度  |
| High | + 光晕 + 色散 + 最强弧度 |

如果 High 程序编译失败（罕见，但老硬件上可能），启动期的降级走
法会下移一档再试。系统永远不会因为缺一个效果而崩溃 -- 它会优雅
地降级到一个能用的画面。

## 试一下上面的滑块

把弧度推过 0.2，体会一下饱受沧桑的 CRT 是什么样。把荧光残留拉
到 0，对比一下现代平板有多冰冷。然后把光晕拉到顶，看 HUD 数字
开始发光。整条着色器管线，离这些交互控件就只有一个片元程序
的距离。
