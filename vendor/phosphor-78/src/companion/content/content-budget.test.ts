// FR24 quality gate (story 5.6 / M6): the companion teaching
// content must be ≥ 3000 words across the three chapters and
// include ≥ 8 figures. Pin both with a real test so a future
// edit can't silently regress under the bar.

import { describe, expect, it } from 'vitest';
import crtShaderEn from '@/companion/content/crt-shader.md?raw';
import chipSynthEn from '@/companion/content/chip-synth.md?raw';
import timingEn from '@/companion/content/timing.md?raw';
import crtShaderZh from '@/companion/content/crt-shader.zh.md?raw';
import chipSynthZh from '@/companion/content/chip-synth.zh.md?raw';
import timingZh from '@/companion/content/timing.zh.md?raw';

const EN = [crtShaderEn, chipSynthEn, timingEn];
const ZH = [crtShaderZh, chipSynthZh, timingZh];

function countWords(md: string): number {
  // Strip code fences (``` ... ```), strip raw HTML/SVG tags, then
  // split on whitespace. This approximates "what a reader sees".
  const stripped = md
    .replace(/```[\s\S]*?```/g, '')
    .replace(/<[^>]*>/g, ' ');
  return stripped.split(/\s+/).filter(Boolean).length;
}

// Chinese has no word boundaries — count CJK Unified Ideographs
// directly. The 3000 EN-word target translates to roughly 4500
// Chinese characters (typical EN→ZH compression).
function countCjkChars(md: string): number {
  const stripped = md
    .replace(/```[\s\S]*?```/g, '')
    .replace(/<[^>]*>/g, ' ');
  const matches = stripped.match(/[\u4e00-\u9fff]/g);
  return matches ? matches.length : 0;
}

function countSvgFences(md: string): number {
  return (md.match(/```svg/g) ?? []).length;
}

describe('companion content budget (FR24)', () => {
  it('English chapters total ≥ 3000 words of prose', () => {
    const total = EN.map(countWords).reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThanOrEqual(3000);
  });

  it('Chinese chapters total ≥ 4000 CJK characters', () => {
    // Chinese is naturally denser than English (~1.4× compression).
    // 4000 CJK chars maps to roughly the same reading time as the
    // 3000-word English target.
    const total = ZH.map(countCjkChars).reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThanOrEqual(4000);
  });

  it('English chapters have ≥ 8 SVG figures total', () => {
    const total = EN.map(countSvgFences).reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThanOrEqual(8);
  });

  it('Chinese chapters have ≥ 8 SVG figures total', () => {
    const total = ZH.map(countSvgFences).reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThanOrEqual(8);
  });

  it('every chapter (both languages) has its own h1 heading', () => {
    for (const md of [...EN, ...ZH]) {
      const heads = md.match(/^# /gm) ?? [];
      expect(heads.length).toBeGreaterThanOrEqual(1);
    }
  });
});
