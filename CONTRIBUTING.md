# Contributing

## Setup

```
npm install
npm run ci        # typecheck + tests + build; must be green before a PR
```

Load the built extension from `dist/chrome` or `dist/firefox` (see the
README's install table).

## Ground rules

Two lines this project will not cross, in any PR, for any feature:

1. **No new permissions.** The permission surface is `storage` plus one
   content-script origin, pinned by `tests/guards.test.ts`.
2. **No network access.** Also pinned by `tests/guards.test.ts`.

A PR whose feature genuinely requires either is a PR for a different
project — that's a design decision, not an oversight.

Everything else:

- **Core stays pure.** `src/core/` gets no browser APIs, no DOM, no clocks;
  time comes in as a parameter. If you're reaching for a mock, the code is
  in the wrong layer.
- **DOM assumptions live in one file** — `src/content/selectors.ts`.
  Selector changes need the verification recipe from
  [docs/DETECTION.md](docs/DETECTION.md) run against the live player, with
  the observed values in the PR description.
- **Fail open.** Any new detection logic must preserve the invariant: a bug
  may cost the user a muted moment, never a stuck-muted tab.
- **New behavior, new test.** The detector and judge are cheap to test —
  keep them fully covered. Guard-style rules should be enforced by a test,
  and every guard needs a negative case proving it can actually fail.

## Reporting security issues

Use GitHub's private vulnerability reporting on this repository rather than
a public issue.
