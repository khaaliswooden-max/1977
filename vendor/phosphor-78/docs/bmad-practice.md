# BMAD case study — what the four-phase loop produced here

> A retrospective analysis of running BMAD end-to-end on a single
> non-trivial project (the 1978 Space Invaders homage in `src/`).
> Reference: the upstream tutorial that defined the workflow
> followed here is at `bmad-space-invaders-tutorial.md` in the
> companion research repo.

This document is the case study. It catalogues what each BMAD
phase actually emitted in this repo, the decisions that shaped
each artifact, where the practice deviated from the tutorial
script, and what those deviations cost or saved.

If you want to see the working game, see
[the-game.md](the-game.md). If you want to see the chronological
build log, see [DEVLOG.md](../DEVLOG.md).

<p align="center">
  <img src="screenshots/04-behind-the-scenes.png" alt="The companion page produced by Phase 4 — live CRT-shader sliders backed by 4000 words of teaching prose" width="700">
</p>
<p align="center">
  <em>The behind-the-scenes companion page is the most visible artifact of "running the practice through to a shipped product" — Phase 1's brief said the docs would be live and interactive, Phase 3's architecture made the signal store that lets sliders mutate the running game, Phase 4 wrote the prose. EN / 中 in the header.</em>
</p>

## Why frame the project this way

The tutorial promises that BMAD's value is "a written record at
each decision point so the next conversation doesn't relitigate
the previous one." This project tested that claim against a
concrete, multi-week implementation: 49 stories across 5 epics,
~400 unit tests, ~16 e2e tests, three independent technical
pillars (WebGL CRT shader, Web Audio chip synthesis, ROM-cited
gameplay). The artifacts in `_bmad-output/` are the data the
case study draws from.

## The deliverables, by phase

| Phase                | Tutorial expectation                | This project's output                                                                                                                                                            |
| -------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — Analysis         | `product-brief.md`                  | [`product-brief-space-invaders.md`](../_bmad-output/planning-artifacts/product-brief-space-invaders.md) + [LLM distillate](../_bmad-output/planning-artifacts/product-brief-space-invaders-distillate.md) |
| 2 — Planning         | `prd.md` + `ux-design.md`           | [`gdd-phosphor-78.md`](../_bmad-output/gdd-phosphor-78.md) (bridge GDD; PRD + UX folded in)                                                                                       |
| 3 — Solutioning      | `architecture.md` + `epics/*.md`    | [`game-architecture.md`](../_bmad-output/game-architecture.md) + [`epics.md`](../_bmad-output/planning-artifacts/epics.md)                                                        |
| 4 — Implementation   | Sprint-organised story execution    | 49 stories, each tied to a GitHub issue (#4–#67), commit message `<type>: <summary> (#<n>)`, all on `main`                                                                        |

### Phase 1 — Analysis

Invoked the analyst skill (`bmad-agent-analyst`, persona "Mary")
and asked for a product brief on a 1978 Space Invaders homage.
Two documents fell out:

- **The full brief** (`product-brief-space-invaders.md`) —
  human-facing, narrative, the document a stakeholder would
  read.
- **The LLM distillate** (`-distillate.md`) — a compressed,
  token-efficient form of the brief, generated specifically so
  later agents (architect, story author) could ingest the brief
  without reading the long version every time.

The dual format is a small but real improvement over the
tutorial — it acknowledges that downstream consumers of the
brief are mostly LLMs, and giving them a denser version saves
context tokens on every subsequent skill invocation.

Decisions locked in here:

- **Visual fidelity tier**: museum-grade CRT, not a stylised
  "retro" pastiche.
- **Audio approach**: oscillator graph synthesis, zero audio
  files in the bundle.
- **Trademark handling**: project named "Phosphor 78", avoiding
  the "Space Invaders" wordmark in the repo / app name.
- **Repo posture**: GitHub private; no public deploy target
  (no GitHub Pages).

### Phase 2 — Planning

The tutorial calls for a PRD plus a UX design document. This
project compressed both into a single **Game Design Document**
(`gdd-phosphor-78.md`) — partly because the PM/UX phases for a
single-screen 1978 fixed shooter would be mostly ceremony, partly
because the brief already pinned the player-facing experience
tightly enough that splitting PRD/UX would have produced two
documents largely paraphrasing each other.

This was a conscious deviation: the trade-off accepted was less
explicit traceability between requirements and UX choices, in
exchange for a single source of truth that didn't need to be
kept in sync with itself.

Functional / non-functional requirements still got numeric IDs
(`FR1` … `FR26`, `NFR1` … `NFR30`) so later artifacts (the
architecture, individual stories) could cite them. Roughly half
the FRs map directly to user-visible behavior (`FR12: shields
with pixel-level erosion`); roughly half are intentional fidelity
constraints (`FR9: three invader-bullet kinds, time-multiplexed`).

### Phase 3 — Solutioning

Architecture got the heaviest treatment. The
[architecture document](../_bmad-output/game-architecture.md) is
the longest single artifact in `_bmad-output/`. Its skeleton:

- **11 ADRs** (Architecture Decision Records) — load-bearing
  choices like "audio is master, frame loop is slave"
  (ADR-010), "scene rasterised to Canvas2D, then uploaded as a
  WebGL texture" (ADR-002), "pure reducer + sub-reducer chain"
  (ADR-001).
- **8 cross-cutting concerns** (CC1–CC8) — concerns that don't
  belong to any one layer: pause behavior, autoplay unlock,
  WebGL2 capability probing, the build-time tier ladder.
- **13 systems** — the concrete modules each layer hosts.
- **8 architectural boundaries** (AB1–AB8) — directional import
  rules. The most important is **AB1**: `game/` may not import
  from `render/` / `audio/` / `companion/`. Game code is pure
  by construction; everything mutable lives downstream of it.
  ESLint enforces AB1 with `no-restricted-imports`.
- **14 consistency rules** (CR1–CR14) — invariants that aren't
  about layering but about discipline within a layer. CR1 is
  "no `Math.random` / `Date.now` / `console` / DOM access in
  the reducer chain." CR12 is "every ROM-derived constant
  carries a citation comment." CR4 is "imports use the `@/`
  alias, not relative parent dots."

The discipline that makes this useful in practice is that **all
49 stories cite the constraint they're under**. A typical story
description reads "implements FR12 / FR16 under AB1, CR1, CR12"
— so a developer (or an AI agent) opening that story knows
which guardrails are hot.

#### Advanced elicitation, not Party Mode

The tutorial's signature "Party Mode" multi-persona discussion
appears here as the `bmad-advanced-elicitation` skill. The
skill loads a CSV of elicitation methods (challenge, expand,
risk-list, etc.) and surfaces five candidates per pass. The
candidate set is biased by the document type and recent
conversation, not random.

A concrete example: when the architecture doc reached its Step
2 (Project Context), the elicitation skill produced four
challenges, three of which led to actual changes:

1. _"Audio synthesis may be harder than the CRT shader — SN76477
   nonlinearity vs mature shader literature."_ → reranked audio
   from "high" to "very high" complexity, leading to the
   AudioWorklet-with-circuit-heat design instead of plain
   `OscillatorNode`.
2. _"The companion page should be high complexity, not medium —
   it's a hot-tunable GUI bound to two GPU/audio domains."_ →
   spawned the signal-store pattern (`src/util/signals.ts`) so
   the companion writes to the same signal the render and audio
   layers subscribe to.
3. _"Did you miss a system — a timing oracle / event bus?"_ →
   added the `Clock` interface as its own type
   (`src/types/clock.ts`) so `game/` can depend on the clock
   contract without importing the audio implementation.

The fourth challenge (about misclassified "medium" complexity)
was discussed and rejected — but that rejection is captured in
the architecture document's revision notes, so a future reader
sees both the prompt and the choice.

#### Story decomposition: 5 epics × ~9 stories

The [epics document](../_bmad-output/planning-artifacts/epics.md)
breaks the work into 49 stories across 5 epics:

| Epic | Theme                       | Stories  |
| ---- | --------------------------- | -------- |
| 1    | Foundation + M1 placeholder | 1.1–1.18 |
| 2    | ROM-cited gameplay          | 2.1–2.6  |
| 3    | Chip synthesis + audio      | 3.1–3.6  |
| 4    | CRT shader stack            | 4.1–4.6  |
| 5    | Companion + v1 freeze       | 5.1–5.18 |

Each story specifies its acceptance criteria and the FR / NFR /
ADR / AB / CR identifiers it must satisfy. This is the
machinery that makes the discipline cited two paragraphs ago
actually load-bearing — without the per-story citation list, the
14 consistency rules would be aspirational.

### Phase 4 — Implementation

The tutorial frames implementation as "Sprint-based": pull a
batch of stories, work them, demo. This project ran each story
as its own commit on `main` (no Sprint batching, no feature
branches; an explicit author preference). The cadence was:

1. Open a GitHub issue for the story (Chinese title, English
   work record).
2. Implement the story end-to-end including tests.
3. Commit with `<type>: <summary> (#<issue>)`.
4. Push to `main`.
5. Close the issue with a delivery note (Chinese: outcome +
   verification + follow-up).

49 stories × ~one issue each = #4 through #67 on the GitHub
project. The DEVLOG entries are organised by epic, not by date,
so a reader can read the Phase 4 narrative end-to-end without
the noise of "fix typo in DEVLOG" interleavings.

#### What happened after "v1 candidate"

The interesting half of Phase 4 wasn't the planned 49 stories —
it was the eight post-v1 follow-up stories (5.10 through 5.18)
triggered by playtest. Each one started as a single-sentence
user observation:

| Story | Trigger                                                                        |
| ----- | ------------------------------------------------------------------------------ |
| 5.10  | "Game-over Enter doesn't restart; sprites are rectangles; shield damage invisible" |
| 5.11  | "Aliens don't eat shields; game-over fires too early; explosion looks wrong"       |
| 5.12  | "Restart still doesn't work; CRT trail too heavy"                                  |
| 5.13  | "Make behind-the-scenes bilingual"                                                 |
| 5.14  | "Are aliens really this fast in the original?"                                     |
| 5.15  | "Ship can't move past the rightmost shield; do kill sounds exist?"                 |
| 5.16  | "`**bold**` not rendered; Chinese paragraphs have stray spaces"                    |
| 5.17  | "Code blocks render as one pill per line"                                          |
| 5.18  | "Use the md-zh-format tool for the markdown sources"                               |

Each fix flowed through the same machinery as the planned
stories: dedicated GitHub issue, citation of which FR / NFR /
CR was the constraint, test-first where reasonable, commit
with issue reference. The discipline wasn't slowed by being
applied to "small fixes" — if anything, it kept those small
fixes from accreting into a debt pile.

## Where this practice diverged from the tutorial

| Tutorial element | What we did                          | Why                                                                                                                  |
| ---------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| PRD + UX docs    | Single GDD                           | Single-screen game; PRD/UX would have paraphrased each other                                                         |
| Sprints          | One commit per story, no batching    | Author preference; main branch only (memory record)                                                                  |
| Party Mode       | `bmad-advanced-elicitation` skill    | Same goal (challenge the draft from multiple angles), more structured selection                                      |
| GitHub Pages     | Skipped                              | Project chose to stay private until visual quality cleared a personal bar                                            |
| MAME blind test  | Skipped (NFR8 marked author-skipped) | Required installing MAME + obtaining ROM; deferred as not justified by homage / personal-portfolio framing            |
| 30-min walkthrough | Skipped (story 5.7 marked author-skipped) | Personal craft project; no audience to walkthrough to                                                                  |

These deviations were all explicit decisions, recorded in the
v1 freeze checklist with reasoning. The tutorial's value
proposition holds either way: even when you skip a step, you
record _why_ you skipped it, so the skip itself is auditable.

## What the practice actually saved (anecdotal)

Because each story carries a citation list (FR / NFR / AB /
CR), several of the post-v1 fixes were diagnosable in minutes
rather than hours. Three examples:

- **Story 5.12** (restart bug): user reported "Enter doesn't
  restart." A new full-chain reducer integration test showed
  the reducer logic was correct. Knowing the architecture said
  "render and reducer are independently observable" (AB1 + CR1),
  the obvious next suspect was the render-side persistence pass
  — which turned out to be the actual bug.
- **Story 5.14** (alien speed): user asked "are aliens really
  this fast?" The tempo function still carried its `// Story
  2.1 will make this exact` placeholder comment from Phase 3
  planning. The architecture's CR12 (cite ROM source for any
  derived constant) made the right fix obvious — replace the
  placeholder math with the already-imported
  `marchDelayInterrupts(N)` from `computer-archeology.ts`.
- **Story 5.15** (right boundary): "ship can't move past the
  rightmost shield." The shield-placement constants in
  `shields.ts` had a comment block reciting their geometry; a
  five-minute re-read of the geometry against the ROM layout
  identified the wrong centerpoint constants.

In all three, the time saving came from the citations and
constraint records — not the BMAD skill invocations themselves.
The skills produced those citations once; the constraints kept
paying off across the whole post-v1 fix loop.

## Limits of the practice in this project

Two honest limitations worth recording:

- **49 stories was a lot.** A leaner first pass — say 20 stories
  with rougher acceptance criteria — would have reached "v1
  candidate" sooner, with the same playtest-driven follow-up
  loop catching the visible gaps. The tutorial's 4 epics ×
  small stories is closer to the right granularity for a
  project this size; we over-decomposed.
- **The architecture doc is denser than necessary** for a
  ~70KB single-page web app. The 11 ADRs + 8 CCs + 14 CRs
  framework was useful because it forced us to write down the
  invariants, but a lighter touch (5 ADRs, no CC/CR split)
  would probably have produced the same code with less reading.

Neither of these undoes the practice's core claim — that
written records at decision points reduce redundant
re-litigation across conversations. They suggest the practice
is sized for projects larger than this one, and tolerated being
"too much" for a single-page game.

## Reading order if you want to walk it yourself

1. [`_bmad-output/planning-artifacts/product-brief-space-invaders.md`](../_bmad-output/planning-artifacts/product-brief-space-invaders.md)
   — the brief that started everything.
2. [`_bmad-output/gdd-phosphor-78.md`](../_bmad-output/gdd-phosphor-78.md)
   — the merged PRD + UX.
3. [`_bmad-output/game-architecture.md`](../_bmad-output/game-architecture.md)
   — the load-bearing constraints document.
4. [`_bmad-output/planning-artifacts/epics.md`](../_bmad-output/planning-artifacts/epics.md)
   — the 49 stories that turned the architecture into code.
5. [`DEVLOG.md`](../DEVLOG.md) — the per-epic narrative of how
   each story actually went, including the 8 post-v1 fix
   stories.
6. [`docs/the-game.md`](the-game.md) — the resulting artifact,
   with playable instructions.

Read in that order, the project tells two stories at once: how
BMAD's four phases turn an idea into a shipped artifact, and
how that specific artifact ended up looking the way it does.
