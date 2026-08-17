# Detection

How the extension decides "this is an ad break" — and how to fix it when
Spotify changes the player.

## Signals

Three signals, consulted in strength order; the first definitive one wins
(`src/core/judge.ts`):

| # | Signal | Reads | Says |
|---|---|---|---|
| 1 | Ad marker | Now-playing bar contains an element whose test-id or aria-label mentions advertising | **ad** |
| 2 | Track link | Now-playing bar links to `/track/…` or `/episode/…` — real content always links to its own page; ads have no page | **music** |
| 3 | Title shape | Tab title starts with "Advertisement" → **ad**; contains the `" • "` track-artist separator → **music** | either |

Signals are tri-state. `null` means *could not read* (element missing), and
is different from `false` (*read it; it's absent*). Only positive evidence
votes; absence of evidence is `unknown`, and the state machine never flips
state on `unknown`.

## Smoothing

`src/core/detector.ts` applies asymmetric hysteresis:

- **Enter ad after 1 ad verdict.** A false mute costs a moment of silence; a
  slow mute leaks ad audio. Entry is eager.
- **Exit ad after 2 consecutive music verdicts.** DOM flicker mid-break must
  not unmute in the middle of an ad. Exit is conservative.
- **Watchdog: fail open.** In the ad state with nothing but `unknown` for
  15s → assume our selectors broke and unmute. The invariant: a detection
  bug may cost the user a muted moment, never a permanently muted tab.

Sampling is event-driven (a `MutationObserver` on `<title>` fires the moment
the title flips — this is the fast path for ad starts) with a 1s interval as
a fallback for the DOM-based signals.

## Verification status

Authored against the `open.spotify.com` player, August 2026:

- **Title + track link**: the load-bearing pair; both derive from the
  player's long-stable UI conventions.
- **Ad marker**: written broadly (`[data-testid*="advert" i]`,
  `[aria-label*="advertisement" i]`) and best-effort. Confirming it requires
  catching a live ad break on a free account — run the recipe below after
  any player update, and before cutting a release.

## Verification recipe (~2 minutes, free account)

1. Play music at `open.spotify.com`, wait for an ad break (or seek through
   several tracks to trigger one).
2. During the ad, run in DevTools (page context is fine — these are plain
   DOM reads):

   ```js
   const w = document.querySelector('[data-testid="now-playing-widget"]');
   console.log({
     title: document.title,
     widget: !!w,
     trackLink: !!w?.querySelector('a[href^="/track/"], a[href^="/episode/"]'),
     adMarker: !!w?.querySelector('[data-testid*="advert" i], [aria-label*="advertisement" i]'),
   });
   ```

3. Expected during an ad: `trackLink: false`, and ideally `adMarker: true`
   or a title starting with "Advertisement". Repeat during music: expect
   `trackLink: true`.
4. If reality disagrees, update `src/content/selectors.ts` (the only file
   with DOM assumptions) and add what you saw to this document.

## Updating selectors

All DOM assumptions live in [`src/content/selectors.ts`](../src/content/selectors.ts).
When changing them:

1. Run the recipe above during both an ad and music; paste the observed
   values into the PR description.
2. Keep signals tri-state — a reader that can't find its element must
   report `null`, never guess `false`.
3. `npm run ci` must stay green (the guard tests pin the permission surface
   regardless of selector changes).
