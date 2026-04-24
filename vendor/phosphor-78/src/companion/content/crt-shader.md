# How the CRT shader works

A 1978 arcade Space Invaders machine produced its image with a
cathode-ray tube. Modern flat-panel displays show pixels with
near-perfect sharpness and uniform brightness; CRTs did neither.
Their wonderful badness — the soft glow, the visible horizontal
scan lines, the slight bow at the edges of the screen, the way
bright pixels bled light into their neighbors — is what makes
1978 look like 1978. Phosphor 78 simulates each of these
intentionally-bad properties as a layer in a WebGL2 fragment
shader.

## The render pipeline

Each frame goes through four stages:

1. The reducer produces a new `GameState` from the previous one.
2. A hidden 224×256 Canvas2D rasterizer paints the sprites and
   the HUD into a small bitmap.
3. The WebGL2 pipeline uploads that bitmap as a texture and runs
   it through three GPU passes: source-upload → persistence
   ping-pong → composite.
4. The composite pass writes the final image to the visible
   canvas, which the browser then nearest-neighbor-scales to
   whatever physical size the page has assigned it.

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
    <text x="525" y="76">CRT effects</text>
  </g>
</svg>
```

This separation is deliberate. The game and the CRT effects are
truly independent: you can disable the entire WebGL pipeline
(URL `?tier=low`, or build with `disableShader: true`) and the
game still works, drawn directly to the canvas with Canvas2D. The
CRT layer is a luxury, not a requirement.

## Persistence — the phosphor glow

Real CRT phosphors don't go dark instantly when the electron beam
moves on. They decay exponentially over a few milliseconds. On
fast-action games like Space Invaders this becomes a soft glow
trail behind moving sprites — most noticeable on the player ship
and on bullets.

Phosphor 78 reproduces this with a ping-pong framebuffer pass.
Each frame the shader computes:

```
output = max(currentFrame, previousFrame * decay)
```

The `max` matters. If we wrote a plain `mix(prev, current, decay)`
the trail would never quite fade, and would muddy the active
sprite. Taking the max means a bright pixel decays smoothly to
black, while any new bright source immediately wins. The two
framebuffers swap roles each frame so the previous output can be
sampled while the new one is being written.

Why RGBA16F and not RGBA8? Because the iterated multiply by
`decay` (~0.92) quantizes badly at 8 bits. Within 5 frames of
fade-out the output starts banding. RGBA16F keeps half-floats
through the chain.

The decay value is exposed as a tunable signal. Drag the
"Phosphor decay" slider in the demo above and watch the trail
length respond. At 0 the game looks instant and clinical; at 0.99
sprites smear into the next frame in a way that's purely
recreational.

## Curvature — the rounded screen edge

Old CRTs were physically curved in two axes (the famous "bullet"
glass). The shader simulates this by warping the sample UV
outward by a quadratic factor of distance from screen center:

```glsl
vec2 cc = uv - 0.5;
float dist = dot(cc, cc) * strength;
return uv + cc * (1.0 + dist) * dist;
```

This is the "Lottes barrel" — Timothy Lottes' simple-but-effective
CRT distortion model that's become the lingua franca of retro-
emulator shaders. Sample UVs that warp outside `[0, 1]` are
clipped to black, which is what creates the rounded-corners look:
the screen has a finite radius and beyond it is dead air.

The curvature strength is exposed as a signal so visitors can push
it from 0 (flat panel) to 0.3 (a CRT that's seen better days).

## Aperture grille mask — the RGB stripe pattern

The third visible CRT artifact is the mask: a wire mesh between
the electron gun and the phosphor that limited which color got hit
by which electron. Trinitron CRTs (Sony's best-known design) used
vertical wires that produced narrow vertical stripes of color when
viewed through a magnifier. Cheaper shadow-mask CRTs used a
honeycomb of dots.

Phosphor 78's Mid and High tiers simulate the aperture grille:

```glsl
int phase = int(mod(col, 3.0));
vec3 mask = vec3(0.7);
if      (phase == 0) mask.r = 1.0;
else if (phase == 1) mask.g = 1.0;
else                 mask.b = 1.0;
```

Each physical screen column belongs to one of three phases. The
output color is multiplied by a mask weighted toward whichever
phase that column is. Off-channels stay at 0.7x rather than 0
because halving the brightness on every other channel would make
the image two-thirds darker overall.

```svg
<svg viewBox="0 0 600 100" xmlns="http://www.w3.org/2000/svg" class="diagram">
  <g>
    <rect width="600" height="100" fill="#000" />
    <g>
      <!-- 30 vertical stripes, R/G/B repeating, full brightness on the
           "active" channel and 0.7 on the others. -->
    </g>
    <g font-family="monospace" font-size="11" fill="#888" text-anchor="middle">
      <text x="300" y="92">Aperture grille mask — every 3 columns is one R/G/B triplet</text>
    </g>
  </g>
  <g>
    <!-- We script-generate the stripes here. -->
    <script>
      // (Inline SVG sandbox is restrictive; the stripes below are
      // hard-coded.)
    </script>
  </g>
  <g id="stripes">
    <!-- 30 stripes of width 20 each. -->
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

## Halation — bloom around bright pixels

Bright pixels on a real CRT bleed light into the surrounding glass
and phosphor — a halo effect called halation. Phosphor 78's High
tier samples the eight neighbors of every pixel and adds a fraction
of any neighbor whose luminance exceeds 0.5:

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

It's a 9-tap box blur on the bright-only channel. Cheap enough to
run on integrated GPUs at 60fps, expensive enough to make
explosions and the player ship look like they're glowing.

## Chromatic aberration — color fringing at the edges

Real CRT glass is a lens, and cheap CRT glass is a bad lens. Light
of different wavelengths refracts slightly differently as it
passes through, so the red, green, and blue subpixels of the
output land at slightly different physical positions on the
viewer's retina — most visibly at the corners where the glass is
thickest.

Phosphor 78's High tier samples the R and B channels at slightly
offset UVs, with the offset growing with distance from the screen
center:

```glsl
vec2 cc = uv - 0.5;
float r = length(cc);
vec2 dir = cc / r;
vec2 caOffset = dir * 0.0015 * r;
float r_ = texture(tex, uv + caOffset).r;
float g_ = texture(tex, uv).g;
float b_ = texture(tex, uv - caOffset).b;
```

The 0.0015 multiplier is small enough to be subliminal in the
center of the screen and small-but-visible in the corners.

## A note on RGBA8 vs RGBA16F

Why does the framebuffer format matter so much? Imagine a single
white pixel painted into the framebuffer. The persistence pass
reads that pixel and writes back `pixel * decay`, so 1.0 becomes
0.92. Next frame it reads 0.92 and writes back 0.85. Then 0.78.
Then 0.71. Each multiplication is fine in isolation but
accumulates rounding error.

In RGBA8, that pixel is stored as the integer 255. After one
multiply it becomes 235 (`255 * 0.92` rounded). After two: 216.
After three: 199. Each step the rounding error is ~0.4%, but
because the values themselves are getting smaller, the relative
error grows. By frame ten the accumulated error becomes visible
as banding — the smooth fade-to-black turns into a staircase of
discrete brightness levels.

In RGBA16F the same multiplication chain stays smooth for
thousands of frames. The trade-off is that RGBA16F textures use
twice the memory and twice the bandwidth, so we use them only
where it matters (the persistence ping-pong). The composite pass
writes RGBA8 to the canvas at the very end since the display
itself is 8-bit per channel.

## Why we don't use a CRT shader library

There are well-tested shader libraries — CRT-Royale, the Lottes
family, Sony's Megatron — that produce stunning CRT simulations.
Why roll our own?

Three reasons specific to this project:

- The point of the exercise is to _understand_ the math, not to
  defer it. Cribbing from a library would short-circuit the
  learning that's the whole reason this project exists.
- Library shaders typically target multi-pass setups designed
  for emulators with full framebuffer access. Our pipeline is
  three passes total because that's all we need; pulling in a
  10-pass CRT-Royale would mean carrying around code we don't
  understand for an effect we mostly don't use.
- Inline `/* glsl */` template strings keep the shaders
  inspectable in the same file as the JavaScript that uses
  them. There's no separate `.glsl` directory, no build-time
  GLSL preprocessor — when the shader misbehaves you read the
  same file you'd read for the JS bug.

The sources we did read — Lottes' barrel formula, the aperture
grille pattern, the bright-only halation kernel — are explicitly
cited in `references/shaders/`. The patterns came from there;
the implementation is original.

## How the three tiers stack

Story 4.6's tier ladder is build-time-compiled, not runtime-
branched. There are three independent fragment shaders compiled
into three independent GLSL programs; the tier toggle picks one at
boot and that's the program for the session. There's no
`if (tier == high) doFancy()` inside the shader because branching
in fragment shaders kills throughput on lower-end GPUs.

| Tier | Effects                                                 |
| ---- | ------------------------------------------------------- |
| Low  | barrel curvature + scanlines                            |
| Mid  | + aperture grille mask + stronger curvature             |
| High | + halation + chromatic aberration + strongest curvature |

If the High program fails to compile (rare, but possible on very
old hardware), the boot-time degradation walk drops one tier and
tries again. The system never crashes for a missing effect — it
just gracefully arrives at a usable frame.

## Try the sliders above

Push the curvature past 0.2 to feel how a really beat-up CRT
looked. Set the phosphor decay to 0 to feel how cold a modern flat
panel looks by comparison. Then ratchet halation up and watch the
HUD numerals start to glow. The whole shader pipeline is one
fragment program away from those interactive controls.
