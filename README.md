# janvoelker.de

Personal one-pager for Jan Völker (UX Designer @ GOT BAG, Mainz).
Single static page, no build step, published straight from this repo via **GitHub Pages**.

- Live: <https://www.janvoelker.de>
- Repo: <https://github.com/jan-voe/janvoelker.de> (branch `main`, folder `/`)

## Structure

```
.
├── index.html        # the whole site: <head>/SEO, CSS in <style>, JS in <script>
├── og-image.png      # 1200×630 social preview image (1.6 MB)
├── CNAME             # www.janvoelker.de → GitHub Pages custom domain
├── robots.txt        # crawler rules
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
subfolder) keeps paths identical to production, so `/og-image.png` etc. work.

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

Noted for later, agreed 2026-10-29:

1. **Favicon** (`/favicon.ico` currently 404s on every visit, costs a 9 KB error
   page and keeps Best Practices at 96 instead of 100). Also `apple-touch-icon`.
2. **Compress `og-image.png`** (1.6 MB; a JPEG at quality 85 should land around
   200 KB with no visible difference at 1200×630).
3. **`sitemap.xml`** plus a `Sitemap:` line in `robots.txt`, and `og:locale`
   `de_DE` → `en_US` (the content is English).

Open design decisions (no code needed to start):

- Contrast: tagline 3.5:1, social icons 2.6:1, "CLICK TO CREATE AN IMPACT" 1.9:1.
- `backdrop-filter: blur(30px)` on the card: the last measurable frame cost.
- The email link needs JS (`href="#"` plus the Caesar decoder).

## Known open points

See **[AUDIT.md](AUDIT.md)** for the full measured audit (2026-10-28) and the fix
passes that followed. Current state:

- Fixed: the page renders without JS, Lighthouse/PageSpeed Insights can measure it
  again (99 / 100 / 96 / 100), the click effect is three compositor-animated wave
  rings with no SVG filter at all, and the card fades in again like the original.
- The sway animation was removed entirely (2026-10-29): it was barely visible, it
  was the last continuous animation, and it needed a pause control for WCAG 2.2.2.
  The page now runs no animation at all while idle.
