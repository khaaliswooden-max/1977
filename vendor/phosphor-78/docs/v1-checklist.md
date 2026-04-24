# v1 freeze checklist (Story 5.8 / NFR completion criteria)

Trigger: you've finished the simulated walkthrough, run the three
polish passes, and want to declare v1 done.

## What's already verified by automated tests

- [x] All sub-reducers are pure (CR1)
- [x] AudioParam writes go through scheduling APIs (CR7)
- [x] ROM constants cite their disassembly source (CR12)
- [x] Architectural boundaries enforced by ESLint (AB1, CR4, CR5,
      CR11)
- [x] HiDPI integer-scale pixel pipeline (NFR6)
- [x] Zero audio sample files in dist/ (NFR9)
- [x] Companion page has ≥3000 words + ≥8 figures (FR24)
- [x] Tier-walk degradation chain (CC8)
- [x] Page Visibility / blur auto-pause (CC6)
- [x] Bullet-vs-target collision detection (story 5.9 — was
      deferred since story 1.15; closed before v1 freeze)

## What's deferred to user verification

- [~] **MAME blind-selection comparison (NFR8)** — **SKIPPED by
      author choice (2026-04-19)**. Tooling stays in place
      (tests/blind-selection-capture.spec.ts + the HTML viewer)
      so it can be run later, but the v1 freeze does not block
      on it. Author's reasoning: the protocol requires installing
      MAME + obtaining the original Taito ROM, which is friction
      not justified by the project's homage-non-commercial
      framing. The Phosphor 78 screenshots will continue to
      regenerate on each `pnpm test:e2e` run, so a later "let's
      actually do this" pass is one set of MAME screenshots away.
- [~] **30-minute simulated walkthrough (story 5.7)** —
      **SKIPPED by author choice (2026-04-19)**. The script in
      docs/demo-script.md remains useful as a self-review
      checklist or as material for a future tech-talk. Author's
      reasoning: this is a personal craft / portfolio project,
      and burning a friend's evening on a 30-minute internal
      walkthrough is more ceremony than the project warrants.
      The script's value as documentation survives the skip.
- [~] Three polish passes with ≥1 day cooldown between each
      (NFR30). **Status (2026-04-18)**: pass 1 done — playtest
      surfaced 3 visible bugs (no-restart on game-over, rectangle
      sprites, invisible shield damage); all fixed in story 5.10.
      Author may run two more passes over subsequent days, or
      declare v1 ready now and treat NFR30 as best-effort given
      the homage / portfolio framing.

## What's in the post-v1 isolation list (do not touch)

- [x] ~~Bullet-vs-target collision detection~~ — closed by story
      5.9 (issue #58)
- [ ] Audio spectrum regression (#49)
- [ ] Tunables apply live (#50)
- [ ] Real WebGL2 sprite renderer (#51)
- [ ] Pac-Man 1980 / Galaxian 1979 follow-on (#52)
- [ ] CRT shader npm package (#53)
- [ ] Additional CRT presets (#54)
- [ ] Recording playback (#55)
- [ ] Coin-insert sound + cabinet skeuomorphism (#56)

(All open issues with [post-v1] in the title. Browse:
`gh issue list --search "post-v1 in:title state:open"`.)

## What's in the v1 publish step

When all the user-verified items are checked:

- [ ] Update README with the project description, the live URL
      (whichever host you choose), the Behind-the-Scenes link.
- [ ] Update DEVLOG with the v1 release entry.
- [ ] Tag `v1.0.0`. Push the tag.
- [ ] Optionally publish to GitHub Pages, Cloudflare Pages, etc.
      The vite.config base path is parameterizable via
      GITHUB_PAGES_BASE.
