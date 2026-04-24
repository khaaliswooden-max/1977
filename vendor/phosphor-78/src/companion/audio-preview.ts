// Companion-page audio preview: button row that triggers the
// per-event synths so visitors can hear what the slider changes
// sound like.
//
// We spin up a private audio context separate from any main-game
// engine (the visitor is on the companion page, not the game
// page). Context resume is gated by autoplay policy — buttons
// double as the gesture that unlocks it.

import { AudioClock } from '@/audio/clock';
import { createExplosionSynth } from '@/audio/synth/explosion';
import { createInvaderKilledSynth } from '@/audio/synth/invader-killed';
import { createInvaderMarchSynth } from '@/audio/synth/invader-march';
import { createShootSynth } from '@/audio/synth/shoot';
import { createUfoSynth } from '@/audio/synth/ufo';
import { createUfoKilledSynth } from '@/audio/synth/ufo-killed';
import { t } from '@/companion/i18n';
import { log } from '@/util/log';

interface PreviewState {
  ctx: AudioContext;
  clock: AudioClock;
  master: GainNode;
  shoot: ReturnType<typeof createShootSynth>;
  explosion: ReturnType<typeof createExplosionSynth>;
  invaderKilled: ReturnType<typeof createInvaderKilledSynth>;
  ufo: ReturnType<typeof createUfoSynth>;
  ufoKilled: ReturnType<typeof createUfoKilledSynth>;
  march: ReturnType<typeof createInvaderMarchSynth>;
  marchTimer: number | null;
}

let state: PreviewState | null = null;

function ensureInit(): PreviewState {
  if (state) return state;
  const ctx = new (window.AudioContext ||
    (window as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext!)();
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.7, ctx.currentTime);
  master.connect(ctx.destination);
  const clock = new AudioClock(ctx);
  state = {
    ctx,
    clock,
    master,
    shoot: createShootSynth(ctx, master, clock),
    explosion: createExplosionSynth(ctx, master, clock),
    invaderKilled: createInvaderKilledSynth(ctx, master, clock),
    ufo: createUfoSynth(ctx, master, clock),
    ufoKilled: createUfoKilledSynth(ctx, master, clock),
    march: createInvaderMarchSynth(ctx, master, clock),
    marchTimer: null,
  };
  return state;
}

async function unlock(s: PreviewState): Promise<void> {
  if (s.ctx.state === 'suspended') {
    try {
      await s.ctx.resume();
    } catch (e) {
      log.warn('audio preview: resume failed', e);
    }
  }
}

export function buildAudioPreview(): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'audio-preview';
  const s = t();

  const title = document.createElement('h3');
  title.textContent = s.tryItHeading;
  title.className = 'sub-heading';
  wrap.appendChild(title);

  const buttonRow = document.createElement('div');
  buttonRow.className = 'preview-row';

  // action keys are stable across languages (used as
  // dataset markers); labels come from i18n.
  const buttons: ReadonlyArray<{
    action: string;
    label: string;
    handler: (st: PreviewState) => void;
  }> = [
    { action: 'shoot', label: s.previewShoot, handler: (st) => st.shoot.fire() },
    {
      action: 'invader-killed',
      label: s.previewInvaderKilled,
      handler: (st) => st.invaderKilled.fire(),
    },
    {
      action: 'player-explosion',
      label: s.previewPlayerExplosion,
      handler: (st) => st.explosion.fire(),
    },
    {
      action: 'ufo-killed',
      label: s.previewUfoKilled,
      handler: (st) => st.ufoKilled.fire(),
    },
    {
      action: 'march-toggle',
      label: s.previewToggleMarch,
      handler: (st) => {
        if (st.marchTimer !== null) {
          window.clearInterval(st.marchTimer);
          st.marchTimer = null;
          return;
        }
        st.marchTimer = window.setInterval(() => {
          st.march.step(20);
        }, 200);
      },
    },
    {
      action: 'ufo-drone',
      label: s.previewToggleUfo,
      handler: (st) => {
        const btn = wrap.querySelector(
          'button[data-action="ufo-drone"]',
        ) as HTMLButtonElement | null;
        const active = btn?.classList.toggle('active') ?? false;
        if (active) st.ufo.start();
        else st.ufo.stop();
      },
    },
  ];

  for (const b of buttons) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preview-btn';
    btn.textContent = b.label;
    btn.dataset['action'] = b.action;
    btn.addEventListener('click', async () => {
      const st = ensureInit();
      await unlock(st);
      b.handler(st);
    });
    buttonRow.appendChild(btn);
  }

  wrap.appendChild(buttonRow);
  return wrap;
}
