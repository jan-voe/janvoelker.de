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
Best Practices 96   (only the missing favicon 404)
FCP / LCP     1.6 s / 1.6 s   TBT 0 ms   CLS 0.027
```

`NO_FCP` is gone — PageSpeed Insights can score the site again. With JavaScript
disabled the page now renders fully (content-area pixel coverage 4.19% vs 0.06%
blank before).

## Summary

| Area | Verdict | Notes |
| --- | --- | --- |
| Speed (bytes) | **Very good** | ~6 KB HTML (gzip) + ~25 KB font, 5 requests, TTFB 147 ms |
| Speed (CPU) | **Improved, still costly** | Filter is now gated; what remains is `backdrop-filter: blur(30px)` + permanent sway (see below) |
| Measurability | **Fixed** | Lighthouse/PSI now produce scores |
| Robustness | **Fixed** | Page renders without JS, native cursor preserved |
| SEO basics | **Good** | Title, description, canonical, OG/Twitter, JSON-LD, robots, lang, mobile-friendly |
| SEO details | **Needs work** | Apex↔www mismatch, no sitemap, no favicon, `og:locale` de_DE on an English page |
| Accessibility | **Contrast still fails** | 3 contrast failures remain; motion now respects the OS setting |

## 1. Performance

Request profile (cold load, 1280×800):

```
200  document    6,088 B  https://www.janvoelker.de/            (21,470 B raw, 6 KB gzip)
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
before the fix pass (same session, back to back):

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
It is now attached only while a ripple runs (verified: `#app` filter is `none`
when idle, `url("#ripple")` during a click, back to `none` afterwards).

What is left after that fix (measured in one session, so the ratios are
meaningful even though the machine was busy):

| State | fps |
| --- | --- |
| Sway running + `backdrop-filter: blur(30px)` | 22 |
| Sway running, `backdrop-filter` off | 48 |
| Sway stopped (reduce-motion) | 60 |

So the dominant remaining cost is the frosted-glass blur being recomputed on
every frame the card moves. Since the background behind the card is a smooth
radial gradient, a blur adds very little visually — dropping it would roughly
double the idle frame rate. Not done yet; it is a visual decision.

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

axe-core: 1 moderate issue — no landmarks (`<main>`) around the content
(`#card > span`, `h1`, `p` are outside any landmark).

Motion:

- The card sways **permanently**, starting automatically and never stopping.
  WCAG 2.2.2 (A) requires a mechanism to pause/stop/hide moving content that
  starts automatically and runs for more than 5 seconds.
- `prefers-reduced-motion: reduce` was not respected.

**Partly resolved**: reduce-motion now stops the sway and the entrance animation
(and is followed if the OS setting changes), and the sway pauses in background
tabs. WCAG 2.2.2 is still not fully met — visitors who do *not* set "reduce
motion" have no way to pause the sway. A small pause/play control would close
that; it is a design decision, not done.

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
   visible from the first frame, CSS transform-only entrance, `prefers-reduced-motion`
   support. (`NO_FCP` gone, Lighthouse 99/100/100/96.)
2. ~~Stop the permanent repaint of the SVG filter.~~ **Done** — `#app.rippling`
   only while a ripple runs; sway pauses when hidden or reduced-motion.
3. Fix contrast: tagline ~0.4 → 0.62 opacity minimum, icons 0.3 → 0.42, drop the
   "CLICK TO CREATE AN IMPACT" hint to real text colour or remove it.
4. Unify the host to `www.` in canonical/OG tags, add `sitemap.xml`, add a
   favicon, compress `og-image.png`, set `og:locale = en_US`.
5. Drop or cheapen `backdrop-filter: blur(30px)` if idle smoothness matters
   (22 → 48 fps measured), and self-host Sora to remove the render-blocking
   third-party request (918 ms).
6. Extend the content (about text, case-study links) so there is something to rank.
