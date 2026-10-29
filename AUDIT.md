# Site audit — 2026-10-28

Scope: https://www.janvoelker.de (live, `main` @ `2fcfb26`), plus a fix pass applied
locally on 2026-10-28 (see below).
Measured with headless Chrome 156 (Chrome for Testing) on an Apple M3 Pro,
Lighthouse 12.8.2, axe-core 4.x, plus manual contrast maths against the
actual rendered background colours.

## Fix pass 1 — applied 2026-10-28 (not yet deployed)

| Fix | Before | After |
| --- | --- | --- |
| Card entrance | `.card { opacity: 0 }`, JS added `.visible` after 300 ms | CSS `card-in` keyframes, **transform only** — content is painted from frame 1, no JS needed |
| Custom cursor | `body { cursor: none }` in CSS, always | `html.custom-cursor` added by JS on the first real mouse move; `#cursor` is `display: none` until then |
| Ripple filter | `filter: url(#ripple)` permanently on `#app` | `#app.rippling` only while a ripple is on screen, removed after |
| Reduced motion | ignored | `prefers-reduced-motion` stops the sway and the entrance animation, followed live if the OS setting changes |
| Sway | ran in background tabs | pauses on `visibilitychange` |

Result of that pass, measured locally (`lighthouse http://127.0.0.1:8000/`, mobile):

```
Performance    99
Accessibility 100
SEO           100
Best Practices 100  (favicon added in fix pass 7)
FCP / LCP     1.6 s / 1.6 s   TBT 0 ms   CLS 0.027
```

`NO_FCP` is gone — PageSpeed Insights can score the site again. With JavaScript
disabled the page now renders fully (content-area pixel coverage 4.19% vs 0.06%
blank before).

## Fix pass 2 — applied 2026-10-29 (fade-in entrance)

The original fade-in was restored on request (fade only, no slide), and it was
kept to a form that stays measurable. A fade from `opacity: 0` cannot be
measured: content painted at opacity 0 is not a contentful paint, so Lighthouse
aborted with `NO_FCP` again (reproduced, so it was not a one-off).

| Attempt | Performance | FCP / LCP | Note |
| --- | --- | --- | --- |
| Fade from `opacity: 0`, Google Fonts | 93 | 2.6 s | measurably worse, and `NO_FCP` on a second run |
| Fade from `opacity: 0`, self-hosted font | *no result* | – | `NO_FCP`, not measurable |
| **Fade from `opacity: 0.2`, Google Fonts** | **99** | **1.6 s / 1.6 s** | shipped: two consecutive runs identical, CLS 0.016 |

The entrance now animates `opacity` only, from 0.2 to 1 over 800 ms. On this dark
background 0.2 already reads as "fading in from nothing", while the content still
counts as painted from the first frame. It is a plain CSS animation, so it runs
without JS, and `prefers-reduced-motion` turns it off.

Self-hosting Sora was tried and reverted: it reached Performance 100 with
FCP 0.9 s, but the font is meant to stay on Google Fonts. The numbers are kept
here in case that decision is revisited — the render-blocking font stylesheet is
worth 918 ms of the 1.6 s FCP.

## Fix pass 3 — applied 2026-10-29 (wave without SVG filter)

The click effect was rebuilt from scratch. Two things were wrong with it:

1. It looked like "scrubbing forwards and backwards" instead of a wave rolling
   outwards. The filter animated `baseFrequency` up and back down, which changes
   the *wavelength* of the turbulence, not its position — the eye reads that as a
   zoom.
2. `feTurbulence` + `feDisplacementMap` are unreliable and expensive on mobile
   GPUs, and they rasterised the whole `#app` subtree on every frame.

Now: the SVG filter is gone completely. A click spawns three rings
(`.wave-ring`) that grow with `transform: scale()` and fade with `opacity`, i.e.
purely on the compositor. Travel is `linear`, so the front moves at a constant
speed like a real wave.

```js
{ delay: 0,   duration: 2200, size: 200, opacity: 0.5  }
{ delay: 320, duration: 2500, size: 175, opacity: 0.34 }
{ delay: 650, duration: 2800, size: 150, opacity: 0.22 }
```

Two bugs surfaced while building it:

- `mousedown` **and** `touchstart` were both bound, and a tap makes the browser
  synthesise a `mousedown` too, so one tap fired six rings instead of three. Both
  listeners are replaced by a single `pointerdown`.
- Cleanup hung on the animation's `finish` event. In a tab that stops producing
  frames that event never arrives and the ring elements stay in the DOM. A timer
  now removes them as a safety net (verified: 0 elements left afterwards, also
  after six rapid clicks).

Also in this pass: `<div id="app">` became `<main id="app">`, which was the last
axe violation ("all page content should be contained by landmarks"). axe now
reports **0 violations, 22 passes**.

Result: Performance 99, Accessibility 100, Best Practices 96, SEO 100,
FCP/LCP 1.6 s, CLS 0.016. HTML dropped from 24,268 to 21,577 bytes
(6.6 KB gzip) because the filter plumbing is gone.

## Fix pass 4 — applied 2026-10-29 (sway removed)

The card's permanent sway was removed. It was barely visible at 3.5°/1.5 px
amplitude, it was the last continuous animation on the page, and it was the one
thing that needed a pause control to satisfy WCAG 2.2.2.

- the whole sway block (113 lines) is gone, together with its
  `visibilitychange` handler and the reduced-motion listener it needed
- CSS that only existed for it went too: `perspective` on `#app`,
  `transform-style: preserve-3d` and `will-change: transform` on `.card`, and an
  ineffective `will-change: transform` on `#cursor` (it is positioned with
  `left`/`top`, not with a transform)
- verified: card is static (`transform: none`), 0 running animations after the
  entrance fade, 0 `requestAnimationFrame` calls per second while idle

HTML is now 17,025 bytes (5.4 KB gzip), down from 24,268 before the fix passes.

## Fix pass 5 — applied 2026-10-29 (OG image, sitemap, locale)

- `og-image.png` (1.6 MB) was replaced by `og-image.jpg`, 1200×630 at quality 90:
  **113 KB**, measured RMS difference 3.4 of 255 against the original, i.e. not
  visible at that size. `og:image`/`twitter:image` point at the new file, and
  `og:image:alt` plus `og:image:type` were added.
- `sitemap.xml` added (single URL, `lastmod` 2026-10-29) and referenced from
  `robots.txt` with a `Sitemap:` line.
- `og:locale` changed from `de_DE` to `en_US`. The page language is English and
  `og:locale` describes the content, not the author's location; the location is
  already covered by the `geo.*` tags and the JSON-LD `address`. `en_DE` would be
  syntactically valid but is not a locale scrapers know.

## Fix pass 6 — applied 2026-10-29 (ring cap)

Rapid clicking could leave a blank tab in Chromium. Each ring is a full-size
composited layer (200vmax square, ~6.5 MP on a 1280 px viewport) with
`mix-blend-mode`, and every click spawns three of them:

| Clicks | Live rings | Layer area at full size |
| --- | --- | --- |
| 1 | 3 | ~59 MP |
| 5 | 15 | ~294 MP |
| 20 | 60 | **~1,180 MP** |

At 60 rings that is roughly 1.5 GB of layer memory plus the backdrop copies the
blend mode needs, so Chromium drops the GPU process and the page goes white. It
is not a JS error, which is why nothing appears in the console.

Fixed in three steps, all measured at 1512×982 (full window on a 14" MacBook):

| Change | Effect |
| --- | --- |
| dropped `mix-blend-mode: screen` | removes the backdrop copy over the whole layer area; visually near-identical here (`screen` gives `(8,140,176)` over the card, plain alpha `(3,135,171)`) |
| ring sizes 200/175/150 → 170/150/130 vmax | −28 % layer area, and the front still reaches the viewport corner (900 px of 901 px) |
| two rings per click instead of three | 12 MP per click instead of 27 MP |
| fade complete at 70 % of the travel, element removed at 72 % | overlapping time down by a third |
| `MAX_LIVE_RINGS` 12 → 8 (FIFO) | caps the worst case, oldest ring is dropped first |

Stress test (30–40 clicks as fast as possible): max 8 rings at once, everything
gone after ~3.3 s, no crash, no page errors, 2 rings per tap on mobile.

## Fix pass 7 — applied 2026-10-29 (favicon)

The favicon set was added to the repo root, where browsers look for it without a
link tag (`/favicon.ico`, `/apple-touch-icon.png`):

- `favicon.ico` (16/32/48 px), `favicon-16x16.png`, `favicon-32x32.png`,
  `apple-touch-icon.png` (180 px), `android-chrome-192/512.png`
- `<link rel="icon">` entries, `apple-touch-icon` and `manifest` in the head
- `site.webmanifest` had an empty `name`, an empty `short_name` and
  `theme_color: #ffffff`; it now carries the site name and `#00121f` to match the
  page
- `<meta name="theme-color" content="#00121f">` added
- `scripts/serve.mjs` learned the `.webmanifest` MIME type

Result: `/favicon.ico` answers 200 instead of a 9 KB 404 page on every visit, and
Best Practices went from 96 to **100**. Lighthouse: 99 / 100 / 100 / 100.

## Summary

| Area | Verdict | Notes |
| --- | --- | --- |
| Speed (bytes) | **Very good** | ~5.4 KB HTML (gzip) + 25 KB font, 5 requests, TTFB 147 ms |
| Speed (CPU) | **Good** | No SVG filter, no continuous animation; nothing runs while idle |
| Measurability | **Fixed** | Lighthouse/PSI now produce scores |
| Robustness | **Fixed** | Page renders without JS, native cursor preserved |
| SEO basics | **Good** | Title, description, canonical, OG/Twitter, JSON-LD, robots, lang, mobile-friendly |
| SEO details | **Done** | Sitemap, OG image size, `og:locale` and a full favicon set |
| Accessibility | **Contrast still fails** | 3 contrast failures remain; axe is otherwise clean, motion respects the OS setting |

## 1. Performance

Request profile (cold load, 1280×800):

```
200  document    6,558 B  https://www.janvoelker.de/            (21,577 B raw, 6.6 KB gzip)
200  stylesheet      0 B  fonts.googleapis.com/css2?family=Sora  (1.8 KB, render-blocking, 3rd party)
200  font       25,240 B  fonts.gstatic.com/.../sora/v17/*.woff2
404  other       5,254 B  https://www.janvoelker.de/favicon.ico  ← 404 page downloaded on every visit
```

- TTFB 147 ms, DOMContentLoaded 364 ms, load 421 ms, **CLS 0.0000**, 0 long tasks.
- No images, no framework, one CSS file, one inline script — the payload is excellent.
- Sora is a variable font, so weights 400 + 800 share one file. The CSS still asks
  for `font-weight: 300` on the tagline, which is not requested and silently
  falls back to 400.

**The expensive part is animation, not loading.** Measured idle frame rate after load,
before the fix passes (same session, back to back):

| State | fps (headless) |
| --- | --- |
| As deployed (SVG ripple filter on `#app` + card sway) | **17** |
| SVG filter removed (`#app { filter: none }`) | 45 |
| Filter removed + sway stopped | 60 |

`#app` carried `filter: url(#ripple)` (feTurbulence + feDisplacementMap)
permanently. Because the card is transformed on every animation frame, the
browser had to re-rasterise the whole filtered subtree continuously — even when
no ripple was active and `baseFrequency` / `scale` were 0. That was a permanent
CPU/GPU cost and battery drain for an effect that only shows up after a click.

That filter is now gone entirely (fix pass 3): the wave is drawn by `.wave-ring`
elements animated with `transform` and `opacity` only, so it runs on the
compositor and no longer rasterises text.

The card sway was removed as well (fix pass 4), so the page now has **no
continuous animation at all**:

```
after 1.5 s: 0 running animations, 0 requestAnimationFrame calls per second
```

The earlier frame-rate numbers were measured while the sway still ran:

| State | fps |
| --- | --- |
| Sway running + `backdrop-filter: blur(30px)` | 22 |
| Sway running, `backdrop-filter` off | 48 |
| Sway stopped (reduce-motion) | 60 |

Without the sway there is nothing left to recompute the blur against, so the
remaining cost is only the initial paint. (Frame-rate figures from this headless
setup are unreliable anyway: a blank page measured 23 fps on the same machine.)

## 2. Measurability

Before the fix pass, `lighthouse https://www.janvoelker.de/` failed:

```
Runtime error encountered: The page did not paint any content. (NO_FCP)
```

Reproduced twice with different flag sets. In a controlled experiment, only
`first-paint` was recorded, never `first-contentful-paint`, and **LCP was not
reported at all**:

```
original page (card fades in from opacity: 0)   paints = [first-paint@440]  FCP missing, LCP 0
card visible from the start (no fade-in)        paints = [first-paint@108, first-contentful-paint@108]
```

The JS entrance animation (`.card { opacity: 0 }` → `.visible` after 300 ms)
meant there was no contentful paint during initial load. Consequence: no
PageSpeed Insights / Lighthouse score was obtainable, and FCP/LCP were invisible
to any lab benchmark.

**Resolved** by making the card visible from the first frame and animating it
with transform-only CSS keyframes. Lighthouse now runs to completion
(99 / 100 / 100 / 96). The paints above were also confirmed at the pixel level:
a headless screenshot of the live page contained 0.06% bright pixels in the
content area (i.e. blank), the fixed version 4.17%.

## 3. Robustness

Before the fix pass, with JavaScript disabled (`cardOpacity: 0`):

- the card stayed at `opacity: 0` → **the page rendered completely blank**;
- `body { cursor: none }` meant there was not even a mouse pointer;
- the email link is `href="#"`, so it only works through JS.

There was also a cosmetic bug with JS **enabled**: before the first `mousemove`,
`#cursor` had no `left`/`top`, so it sat at its static position — dead centre of
the viewport (measured `620,380` in 1280×800), i.e. a 20 px white
`mix-blend-mode: difference` dot over the card until the visitor moved the mouse.

**Resolved**: the entrance is a CSS animation, the cursor is opt-in from JS
(hidden and native until the first mouse move), and the no-JS screenshot now has
the same 4.19% content coverage as the JS one. The email link is still
`href="#"` — see the remaining items below.

## 4. SEO / indexing

Present and correct: `<title>`, `meta description`, `robots: index, follow`,
canonical, OG + Twitter cards, JSON-LD `Person` (with `worksFor`, `address`,
`sameAs`), `lang="en"`, responsive viewport, one `h1`, mobile layout verified
down to 320×568 without overflow, `robots.txt` allows everything.

Issues:

1. **Domain mismatch.** `CNAME` = `www.janvoelker.de`, and
   `https://janvoelker.de/*` 301-redirects to `www.`, but `canonical`,
   `og:url`, `og:image` and `twitter:image` all point at the apex host.
   `https://janvoelker.de/og-image.png` answers **301** — some link-preview
   scrapers do not follow redirects on image URLs, so WhatsApp/LinkedIn previews
   may come up empty. Use `https://www.janvoelker.de/...` everywhere, or make the
   apex the canonical host.
2. No `sitemap.xml`, and `robots.txt` has no `Sitemap:` line.
3. No favicon / `apple-touch-icon` → a 404 on every single visit (5 KB wasted) and
   no icon in browser tabs, bookmarks or iOS home screen.
4. `og:locale` is `de_DE` while all content is English (`og:locale = en_US` or
   deliberately keep `de_DE` and switch the page to German).
5. `og:image:alt` missing; `og-image.png` is **1.6 MB** (1200×630) — ~250 KB
   would look identical.
6. No `theme-color` meta (mobile browser chrome stays dark by accident).
7. Content depth: one headline + one sentence. Technically indexable and
   Googlebot does run JS, but there is very little for a search engine to rank
   for beyond the name. Adding a short "About" paragraph and links to case
   studies would give "UX Designer Mainz" etc. something to attach to.

I could not verify actual Google indexation from this machine (Google blocks
automated queries). Check Google Search Console → URL-Inspector, and Bing Web
Master Tools; Bing returned no results for `site:janvoelker.de` at the time of
this audit.

## 5. Accessibility

Colour contrast, computed against the real rendered card background
(`#082D46` in the centre of the gradient):

| Element | Colour on screen | Ratio | Required | Result |
| --- | --- | --- | --- | --- |
| `h1` "JAN VÖLKER" | `#FFFFFF` | 14.31:1 | 4.5 | pass |
| Cyan eyebrow "UX DESIGNER @ GOT BAG" | `#00D1FF` | 7.88:1 | 4.5 | pass |
| Tagline `p`, `opacity: 0.4` | `#6B8190` | **3.51:1** | 4.5 | **fail** |
| Social icons, `opacity: 0.3` | `#526C7E` | **2.58:1** | 3.0 | **fail** |
| "CLICK TO CREATE AN IMPACT", `opacity: 0.2` | `#39576B` | **1.87:1** | 4.5 | **fail** |

Note: axe-core and Lighthouse both report *no* contrast issues here (Lighthouse
scores accessibility 100), because automated checks skip text whose effective
colour comes from an `opacity` below 1. The ratios above are computed against the
actual composited colours, so they are the real numbers.

axe-core: was one moderate issue (no landmarks around the content). **Resolved** in
fix pass 3 by making the container a `<main>`; axe now reports 0 violations.

Motion:

- The card swayed **permanently**, starting automatically and never stopping.
  WCAG 2.2.2 (A) requires a mechanism to pause/stop/hide moving content that
  starts automatically and runs for more than 5 seconds.
- `prefers-reduced-motion: reduce` was not respected.

**Resolved**: the sway was removed entirely (fix pass 4), so there is no
automatically moving content left to pause. The entrance fade and the click wave
respect `prefers-reduced-motion`.

Keyboard/touch:

- Focus rings are untouched (browser default) — fine.
- Social links are 44×44 px — fine.
- The "GOT BAG" link inside the eyebrow has a **66×12 px** tap target, below the
  24×24 px minimum of WCAG 2.5.8.
- The custom cursor hides the native pointer entirely for mouse users; it is
  switched off for coarse pointers, so touch is unaffected.

Other:

- The email "obfuscation" is a fixed Caesar shift that decodes to
  `hallo@janvoelker.de` in one line, so it stops no scraper; and because the
  `href` is `#`, the address is unavailable without JS.
- `target="_blank"` links have no `rel="noopener"` (browsers imply it today, but
  it is good hygiene).

## Suggested order of work

1. ~~Make the page visible without JS and let it be measured.~~ **Done** — card
   visible from the first frame, CSS entrance fade, `prefers-reduced-motion`
   support. (`NO_FCP` gone, Lighthouse 99/100/96/100.)
2. ~~Stop the permanent repaint of the SVG filter.~~ **Done** — the filter is gone
   completely, the wave is three compositor-animated rings, and the sway was
   removed (fix pass 4), so nothing animates while the page is idle.
3. Fix contrast: tagline ~0.4 → 0.62 opacity minimum, icons 0.3 → 0.42, drop the
   "CLICK TO CREATE AN IMPACT" hint to real text colour or remove it.
4. ~~Unify the host to `www.` in canonical/OG tags.~~ **Done** (2026-10-29).
5. ~~Add `sitemap.xml`, compress the OG image, set `og:locale = en_US`.~~ **Done**
   (fix pass 5). Still missing: a favicon (`/favicon.ico` 404s on every visit).
6. Drop or cheapen `backdrop-filter: blur(30px)` if idle smoothness matters
   (22 → 48 fps measured), and self-host Sora to remove the render-blocking
   third-party request (918 ms).
7. Extend the content (about text, case-study links) so there is something to rank.
