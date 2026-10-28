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
| `<head>` meta / Open Graph / Twitter | 4–32 | Title, description, social preview, canonical |
| `:root` colour tokens | 34–39 | `--abyss`, `--ocean`, `--cyan` |
| Styles | 33–267 | Layout, responsive `clamp()` sizing, cursor, wave overlay |
| JSON-LD `Person` schema | 268–289 | Job title, employer, `sameAs` profiles |
| Markup | 291–332 | Headline, tagline, social links, SVG ripple filter |
| Scripts | 334–650 | Custom cursor, SVG-filter feature detection, ripple/impact effect, card sway |

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

## Known open points

See **[AUDIT.md](AUDIT.md)** for the full measured audit (2026-10-28) and the fix
pass that followed it. Current state:

- Fixed: the page renders without JS, Lighthouse/PageSpeed Insights can measure it
  again (99 / 100 / 100 / 96), the SVG ripple filter is only attached while a
  ripple runs, and the sway respects `prefers-reduced-motion` and pauses in
  background tabs.
- Still open: tagline, social icons and the "CLICK TO CREATE AN IMPACT" hint fail
  contrast; no pause control for the sway (WCAG 2.2.2); the email link needs JS;
  `canonical`/`og:*` use the apex host while `CNAME` and the live URL use `www.`;
  no favicon, no sitemap, `og:locale: de_DE` on English content; 1.6 MB OG image;
  `backdrop-filter` + sway keeps idle frame rate at ~22 fps in software rendering.
