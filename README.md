# muxarr-website

The landing page for [Muxarr](https://github.com/KirovAir/muxarr), served at
[muxarr.app](https://muxarr.app).

Plain static HTML, no build step. It leans on Bootstrap 5.3.3 and Bootstrap Icons
1.11.3 from a CDN, the same versions the app itself pins in `libman.json`, so the
colours and components stay in sync with the UI. `css/site.css` is a thin theme layer
on top, mirroring the app's `app.css`.

To work on it, serve the folder so the paths behave like production:

```bash
python3 -m http.server 8000
```

## Layout

```
index.html          the whole page
css/site.css        branding, warm light theme, navy dark theme
js/site.js          theme toggle, copy buttons, reduced-motion handling
img/                logo, favicons, social card
img/og-source.html  source for og.png, see below
img/screenshots/    copied from muxarr/docs/screenshots
sitemap.xml         single entry, referenced from robots.txt
CNAME               muxarr.app
```

Theme follows the OS by default and falls back to dark. An explicit toggle click is
stored in `localStorage` and wins from then on.

## Assets

The hero demo is a video, not the original GIF. That GIF was 2.3 MB and the largest
element on the page, which hurt load time badly. Regenerate from
`muxarr/docs/screenshots/demo.gif` after a UI change:

```bash
ffmpeg -i demo.gif -c:v libvpx-vp9 -pix_fmt yuv420p -crf 28 -b:v 0 -row-mt 1 -an demo.webm
ffmpeg -i demo.gif -movflags +faststart -pix_fmt yuv420p -c:v libx264 -crf 21 -preset slow -an demo.mp4
ffmpeg -i demo.gif -frames:v 1 -update 1 demo-poster.png
```

The source is 960px wide and the CSS caps display at 860px. Going wider upscales it and
the UI text turns mushy.

The social card `img/og.png` is rendered from `img/og-source.html`, because this
ffmpeg build has no `drawtext` filter:

```bash
chrome --headless --screenshot=og.png --window-size=1200,630 img/og-source.html
```

## Deploying

Pushing to `master` publishes the site via `.github/workflows/pages.yml`.

## Keeping it accurate

Copy is written against a specific Muxarr release, so recheck the feature list, the
compose file, and the environment and volume tables when those change.
