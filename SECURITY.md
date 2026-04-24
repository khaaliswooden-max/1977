# Security Policy

## Supported versions

Only the latest commit on `main` is actively supported. Older tags receive fixes only when the issue is critical and the fix is trivial.

| Version       | Supported |
| ------------- | --------- |
| `main` (HEAD) | Yes       |
| `0.1.x`       | Yes       |
| `< 0.1.0`     | No        |

## Reporting a vulnerability

**Please do not open public GitHub issues for security problems.**

Report privately using one of these channels:

- GitHub's [private security advisory](https://github.com/khaaliswooden-max/1977/security/advisories/new) form (preferred)
- Email the maintainer listed in [SUPPORT.md](SUPPORT.md) with the subject line `[SECURITY] 1977`

Please include:

- A description of the issue and its impact
- Steps to reproduce (ideally a minimal repro)
- Affected commit SHA, tag, or browser
- Your suggested fix, if you have one

You can expect:

- **Acknowledgement** within 72 hours
- A **triage assessment** within 7 days
- **Coordinated disclosure**: we'll agree on a timeline before any public write-up

## What counts as a vulnerability

Because this is a browser game with no server, the threat surface is small. We do treat the following as security issues:

- XSS via any user-controlled input (names, scores, URL params, save strings)
- Arbitrary code execution via malformed save data or mod files
- Prototype pollution through save/load
- Dependency vulnerabilities (if dependencies are ever added)
- Leaks of local data (localStorage, IndexedDB) to unintended origins

The following are **not** security issues and should be filed as normal bugs or feature requests:

- Game-balance exploits, speedrun glitches, or local cheats that don't affect other players
- Difficulty tuning complaints
- Browser-specific rendering glitches

## Credit

If you'd like public credit after a fix ships, let us know and we'll list you in [CREDITS.md](CREDITS.md).
