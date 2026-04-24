# Contributing to 1977 — Aircraft Warfare

Thanks for your interest in contributing! This document explains how to file issues, submit changes, and what we look for in pull requests.

By participating you agree to uphold our [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to contribute

- **Bug reports** — gameplay bugs, rendering glitches, mobile/controller quirks
- **Balance feedback** — difficulty tuning, enemy patterns, power-up rates
- **Content** — new enemies, boss patterns, pixel art, sound effects, music
- **Code** — performance, accessibility, refactors, new features
- **Docs** — fixing typos, clarifying controls, translating

## Reporting bugs

Open a GitHub issue using the Bug Report template. Please include:

1. **What happened** vs **what you expected**
2. **Steps to reproduce** (difficulty, 1P/2P, which level, inputs)
3. **Environment**: browser + version, OS, desktop/mobile, screen size
4. A screenshot, short screen recording, or console error if possible

## Suggesting features

Open an issue with the Feature Request template. Describe the problem you're trying to solve, not just the solution — that leads to better outcomes for everyone.

## Development setup

The game is a single HTML file — there is no build step.

```bash
git clone https://github.com/khaaliswooden-max/1977.git
cd 1977
python3 -m http.server 8000
# open http://localhost:8000/code
```

Test in at least one Chromium-based browser and one Firefox. For touch changes, test on a real phone or use browser devtools' touch emulation.

## Pull request checklist

- [ ] Branch is up to date with `main`
- [ ] Changes are focused — one logical change per PR
- [ ] Manually tested at all three difficulty tiers (or noted why not applicable)
- [ ] Tested 1P and 2P, keyboard and touch, if the change affects input
- [ ] No new external dependencies without discussion
- [ ] `CHANGELOG.md` updated under `[Unreleased]`
- [ ] Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) where practical (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`)

## Coding style

- Keep the game in one file unless a reviewer agrees to a split
- 2-space indent, single quotes, semicolons — match the existing style
- No frameworks or bundlers
- Prefer plain `<canvas>` 2D API over new libraries
- Keep identifiers short but meaningful — this is a small codebase, not enterprise Java

## Asset contributions

If you contribute art or audio:

- You must own the rights or the work must be compatibly licensed (CC0 / CC-BY / public domain)
- Add yourself to [CREDITS.md](CREDITS.md) in the same PR
- Add the asset license and source to [ASSETS_LICENSE.md](ASSETS_LICENSE.md) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) as appropriate
- Sprites: 16×16 or 32×32, PNG, indexed palette preferred
- Audio: `.ogg` for music, `.wav` for short SFX

## Security issues

Don't file public issues for security bugs. See [SECURITY.md](SECURITY.md).
