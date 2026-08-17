# Detection

How the extension decides "this is an ad break" on each supported site —
and how to fix it when a player changes.

Detection is per-site (one adapter per directory under `src/sites/`), but
every adapter speaks the same language: a tri-state `Verdict` of
`"ad" | "music" | "unknown"`. `unknown` means *could not read* and never
flips state — adapters report facts, never guesses. The shared smoothing
below is identical for all sites.

## Smoothing (all sites)

`src/core/detector.ts` applies asymmetric hysteresis:

- **Enter ad after 1 ad verdict.** A false mute costs a moment of silence; a
  slow mute leaks ad audio. Entry is eager.
- **Exit ad after 2 consecutive content verdicts.** DOM flicker mid-break
  must not unmute in the middle of an ad. Exit is conservative.
- **Watchdog: fail open.** In the ad state with nothing but `unknown` for
  15s → assume our selectors broke and unmute (and unblur). The invariant: a
  detection bug may cost the user a muted moment, never a permanently muted
  tab.

Sampling is event-driven per site (each adapter wires its own fast-path
observer) with a shared 1s interval as the guaranteed fallback — a lost
observer degrades latency, never correctness.

## Spotify (`src/sites/spotify/`)

Three signals, consulted in strength order; the first definitive one wins
(`judge.ts`):

| # | Signal | Reads | Says |
|---|---|---|---|
| 1 | Ad marker | Now-playing bar contains an element whose test-id or aria-label mentions advertising | **ad** |
| 2 | Track link | Now-playing bar links to `/track/…` or `/episode/…` — real content always links to its own page; ads have no page | **music** |
| 3 | Title shape | Tab title starts with "Advertisement" → **ad**; contains the `" • "` track-artist separator → **music** | either |

Fast path: a `MutationObserver` on `<title>` — the title flips the moment an
ad starts.

Blur target: the whole now-playing bar (it shows the ad's artwork and copy;
nothing in it is needed mid-ad).

**Verification status**: authored August 2026. Title + track link are the
load-bearing pair; the ad marker is written broadly
(`[data-testid*="advert" i]`, `[aria-label*="advertisement" i]`) and
best-effort — confirming it requires catching a live ad on a free account.

## YouTube (`src/sites/youtube/`)

One signal, and it's the player's own: the player element
(`#movie_player`) carries the **`ad-showing`** class for exactly as long as
a video ad plays — a years-stable contract used by the player's own styling.

| Player element | Verdict |
|---|---|
| found, has `ad-showing` | **ad** |
| found, lacks `ad-showing` | **music** (regular content) |
| not found | **unknown** |

Overlay/banner ads over regular content do *not* set `ad-showing` — correct
for us, since they don't interrupt audio.

Fast path: a `MutationObserver` on the player's `class` attribute; the class
flip *is* the transition. Attach retries until the player exists (SPA
navigation).

Blur target: `video.html5-main-video` only — deliberately not the player
container, so controls and the **Skip** button stay crisp and clickable.

**Verification status**: authored August 2026 against the standard watch
player. Shorts and embedded players are out of scope for now.

## Verification recipes (~2 minutes each)

During an ad, run in DevTools (plain DOM reads):

**Spotify** (free account, wait out an ad break):

```js
const w = document.querySelector('[data-testid="now-playing-widget"]');
console.log({
  title: document.title,
  widget: !!w,
  trackLink: !!w?.querySelector('a[href^="/track/"], a[href^="/episode/"]'),
  adMarker: !!w?.querySelector('[data-testid*="advert" i], [aria-label*="advertisement" i]'),
});
```

Expected during an ad: `trackLink: false`, and ideally `adMarker: true` or a
title starting with "Advertisement". During music: `trackLink: true`.

**YouTube** (ads are frequent; any monetized video):

```js
const p = document.querySelector('#movie_player, .html5-video-player');
console.log({
  player: !!p,
  adShowing: !!p?.classList.contains('ad-showing'),
  video: !!document.querySelector('video.html5-main-video'),
});
```

Expected: `adShowing` true during the ad, false the instant content starts.

## Updating selectors

Each site's DOM assumptions live in `src/sites/<site>/selectors.ts` and
nowhere else. When changing them:

1. Run the recipe above during both an ad and content; paste the observed
   values into the PR description.
2. Keep verdicts honest — a reader that can't find its element must report
   `unknown`, never guess.
3. `npm run ci` must stay green (the guard tests pin the permission surface
   regardless of selector changes).
