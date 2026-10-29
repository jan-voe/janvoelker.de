# janvoelker.de

Personal one-pager for Jan Völker (UX Designer @ GOT BAG, Mainz).
Single static page, no build step, published straight from this repo via **GitHub Pages**.

- Live: <https://www.janvoelker.de>
- Repo: <https://github.com/jan-voe/janvoelker.de> (branch `main`, folder `/`)

## Structure

```
.
├── index.html        # the whole site: <head>/SEO, CSS in <style>, JS in <script>
├── favicon.ico       # 16/32/48 px icon (browser tab, /favicon.ico)
├── favicon-16x16.png # + 32x32, apple-touch-icon 180x180, android 192/512
├── site.webmanifest  # PWA manifest: name, icons, dark theme colour
├── og-image.jpg      # 1200×630 social preview image (113 KB)
├── CNAME             # www.janvoelker.de → GitHub Pages custom domain
├── robots.txt        # crawler rules, points at the sitemap
├── sitemap.xml       # single-URL sitemap
├── scripts/serve.mjs # local preview server (no dependencies)
├── package.json      # convenience scripts only
└── .editorconfig     # 2 spaces, LF, UTF-8
```

`index.html` is organised in this order — useful when editing:

| Section | Approx. lines | What to change there |
| --- | --- | --- |
| `<head>` meta / Open Graph / Twitter | 4–32 | Title, description, social preview, canonical, Google Fonts |
| `:root` colour tokens | 34–38 | `--abyss`, `--ocean`, `--cyan` |
| Styles | 33–273 | Layout, responsive `clamp()` sizing, cursor, entrance fade, wave rings |
| JSON-LD `Person` schema | 274–295 | Job title, employer, `sameAs` profiles |
| Markup | 297–329 | Headline, tagline, social links |
| Scripts | 331–577 | Custom cursor, wave effect, card sway |

## Local preview

No install step is required — the preview server uses only Node built-ins.

```bash
npm run dev              # http://localhost:8000
PORT=3000 npm run dev    # different port
```

Then edit `index.html` and reload the browser. Serving the repo root (not a
subfolder) keeps paths identical to production, so `/og-image.jpg` etc. work.

## Publishing

Everything in `main` is deployed as-is; a push is a release.

```bash
git add -A
git commit -m "Describe the change"
git push
```

Pages usually rebuilds within a minute. Check the deployed HTML matches your
work with:

```bash
curl -s https://www.janvoelker.de/ | diff - index.html && echo "deployed = local"
```

## Conventions

- Keep it a single page without a build step — that's what makes it fast and
  maintenance-free.
- Prefer editing the existing CSS custom properties and `clamp()` values over
  hard-coding new numbers; the design is fluid between mobile and desktop.
- URL/domain changes: `CNAME` must contain exactly `www.janvoelker.de`.

## Backlog

The backlog from 2026-10-29 is done: favicon package (including
`apple-touch-icon`, web manifest and `theme-color`), OG image as a 113 KB JPEG
instead of a 1.6 MB PNG, `sitemap.xml` with a `Sitemap:` line in `robots.txt`,
and `og:locale` set to `en_US`.

Open design decisions (no code needed to start):

- ~~Contrast~~: done (tagline 4.66:1, icons 3.51:1, impact hint 4.66:1).
- `backdrop-filter: blur(30px)` on the card: kept after measuring it made no
  difference to the wave animation (60 fps either way).
- The email link needs JS (`href="#"` plus the Caesar decoder), deliberately, for
  spam protection. Decided 2026-10-29 to keep it that way: setting `href` on load
  would put the address in the DOM from the start, and a hover/focus hybrid is
  more code than the low spam volume justifies. Without JS the button is inert,
  which was accepted.

## Known open points

See **[AUDIT.md](AUDIT.md)** for the full measured audit (2026-10-28) and the fix
passes that followed. Current state:

- Fixed: the page renders without JS, Lighthouse/PageSpeed Insights can measure it
  again (99 / 100 / 96 / 100), the click effect is three compositor-animated wave
  rings with no SVG filter at all, and the card fades in again like the original.
- The sway animation was removed entirely (2026-10-29): it was barely visible, it
  was the last continuous animation, and it needed a pause control for WCAG 2.2.2.
  The page now runs no animation at all while idle.
