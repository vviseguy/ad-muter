# Ad Muter

A browser extension that **mutes the tab during audio ad breaks** in the web
player at `open.spotify.com`, and unmutes when music returns.

That is the entire feature. Ads still play, still count as delivered, and
nothing is blocked, intercepted, modified, or sent anywhere.

## What it does / deliberately does not do

| | |
|---|---|
| ✅ Detects ad breaks from what the player already shows on screen | ❌ No request blocking or filtering |
| ✅ Mutes the tab with the browser's own tab-mute control | ❌ No network traffic interception |
| ✅ Unmutes when the break ends — never touching a mute *you* set | ❌ No client modification or premium spoofing |
| ✅ Works entirely inside your browser | ❌ No analytics, telemetry, or error reporting — **zero network access** |

## Permissions

The complete permission surface, with rationale. This table is enforced by
[a guard test](tests/guards.test.ts) — a pull request that grows it fails CI.

| Grant | Why |
|---|---|
| Content script on `https://open.spotify.com/*` | Read the player's on-screen state (tab title + now-playing bar). The extension cannot see any other site. |
| `storage` | Remember the on/off toggle, and track which tabs *we* muted so we never unmute one *you* muted. |

That's all of it. No `tabs`, no `<all_urls>`, no `webRequest`, no
`declarativeNetRequest`, no remote code. The same test suite also scans every
source file for network APIs (`fetch`, `XMLHttpRequest`, `WebSocket`, …) and
fails the build if one appears.

## How it works

Three layers, each with one job:

```
┌────────────────────┐   PlayerSnapshot   ┌───────────────────┐   transition   ┌──────────────────────┐
│  content script    │ ─────────────────▶ │  core (pure)      │ ─────────────▶ │  background worker    │
│  reads the page    │                    │  judges + smooths │                │  mutes/unmutes tab    │
│  (read-page.ts)    │                    │  (judge, detector)│                │  (tab-mute API)       │
└────────────────────┘                    └───────────────────┘                └──────────────────────┘
```

- **Read** — a content script samples three facts: the tab title, whether the
  now-playing bar links to a real track page, and whether an explicit ad
  marker is present.
- **Decide** — a pure, fully unit-tested state machine votes on those signals
  with asymmetric hysteresis: it mutes eagerly (one ad verdict) and unmutes
  conservatively (two consecutive music verdicts). If its signals ever go
  dark while muted, a watchdog fails **open** — a detection bug may cost you
  a muted moment, never a permanently muted tab.
- **Act** — the background worker flips the tab's mute state, the same
  control as the speaker icon on the tab strip. You can override it at any
  time by clicking that icon.

More detail: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) ·
[docs/DETECTION.md](docs/DETECTION.md) · [docs/PRIVACY.md](docs/PRIVACY.md)

## Install (from source)

```
npm install
npm run build
```

| Browser | How to load |
|---|---|
| Chrome / Edge / Brave / Opera / Vivaldi | `chrome://extensions` → enable Developer mode → **Load unpacked** → `dist/chrome` |
| Firefox | `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on…** → `dist/firefox/manifest.json` |
| Safari | Run `xcrun safari-web-extension-converter dist/chrome` on macOS (untested; the API surface used is within Safari's WebExtension support) |

## Development

```
npm run ci        # typecheck + tests + build — what CI runs
npm test          # unit + guard tests
npm run icons     # regenerate icons (they are code, not binaries — scripts/gen-icons.mjs)
```

The detection selectors live in one file:
[src/content/selectors.ts](src/content/selectors.ts). When the player's
markup changes, that file is the fix, and
[docs/DETECTION.md](docs/DETECTION.md) has the verification recipe.

## FAQ

**Is this an ad blocker?**
No. Nothing is blocked. The ad plays, is delivered, and is counted; your
speakers just don't participate. This is the same category of tool as EZBlocker
on Windows — a listener-side mute, not an interception layer.

**Why not block the ads outright?**
Blocking requires intercepting the player's network traffic or modifying its
code — both fragile, both against Spotify's Terms of Service, and both the
reason other tools in this space have been removed from stores or gotten
accounts banned. Muting touches nothing that belongs to the service.

**Can Spotify tell I'm using it?**
The extension changes nothing the page can observe through its own delivery:
it doesn't touch the page's audio elements, network, or code. Tab mute
happens at the browser level, outside the page. (A page can still infer
output muting through browser APIs if it goes looking; no tool can promise
invisibility. See the honest version of this answer in
[docs/PRIVACY.md](docs/PRIVACY.md).)

**Does it collect anything?**
It cannot. There is no code path to the network — enforced by tests, in a
public repo you can read in one sitting.

## Trademark note

Spotify is a trademark of Spotify AB. This project is not affiliated with,
endorsed by, or sponsored by Spotify. The name is used only to describe,
factually, which website the extension operates on.

## License

Dual-licensed under [MIT](LICENSE-MIT) or [Apache-2.0](LICENSE-APACHE), at
your option.
