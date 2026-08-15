# muxarr-website

The website for [Muxarr](https://github.com/KirovAir/muxarr), live at
[muxarr.app](https://muxarr.app).

Static HTML and Bootstrap, no build step. To work on it, serve the folder:

```bash
python3 -m http.server 8000
```

Push to `master` and it deploys.

## Docs

The user documentation lives in `docs/`, one page per topic:

| Page | Covers |
|---|---|
| `docs/index.html` | Getting started: install, wizard, first profile, the scan/preview/convert loop, safety |
| `docs/profiles.html` | Every profile setting, fallback languages, per-language settings, regional variants, track names, recipes |
| `docs/library.html` | Dashboard, Library, selection and queueing, file details and preview, custom conversion, batch edit, Conversions, Statistics, Logs |
| `docs/integrations.html` | Sonarr/Radarr, webhook flow, processing, post-processing, notifications, Plex/Emby/Jellyfin, security, API |
| `docs/faq.html` | FAQ and troubleshooting |

Every page carries the same navbar, footer and docs sidebar. To add a page, copy an
existing one, change the `<title>`, description, canonical URL and content, then add it
to the sidebar `<ul>` in all pages and to `sitemap.xml`. Setting names as they appear in
the app are wrapped in `<span class="mux-ui">`.

Screenshots for the docs are in `img/docs/` and are captured from a running dev instance
with `tools/screenshots.mjs` (headless Chrome over CDP, no dependencies beyond Node 22+):

```bash
node tools/screenshots.mjs --base http://localhost:8183 --out img/docs
node tools/screenshots.mjs --only library,file-details        # a subset
cd img/docs && for f in *.png; do pngquant --quality=80-95 --speed 1 --force --ext .png "$f"; done
```

The last line shrinks the PNGs about 3x with no visible difference (`brew install pngquant`).

The list of shots, and the clicks each one needs, is the `SHOTS` array at the top of the
script. The wizard shots need setup to be incomplete, so they are skipped by default; to
retake them, temporarily delete the `Setup` row from the `Config` table of the dev
database and run `--only setup-security,setup-integrations,setup-profiles`.

The screenshots use a small fictional library (The Matrix, Amélie, Dark, ...) so they look
like real files without showing anyone's actual collection. `tools/sample-library.sh [dir]`
generates it with ffmpeg and mkvmerge (about 15 GB, padded with attachments so sizes look
real; defaults to `/tmp/muxarr-docs-media`). Point a dev instance at it with two profiles:

- **Movies** on `Movies/`: audio `Original Language`, `English` (max 1 track), remove commentary,
  default track "Always prefer first language", order "Match language priority", standardize
  names; subtitles `Dutch`, `English` as fallback, `Original Language`, remove SDH, order
  "Match language priority", standardize names; General: clear file title.
- **TV Shows** on `TV/`: audio `Original Language`, `English`, remove commentary, force default,
  priority order; subtitles `English`, `Dutch`; General: skip hardlinked files.

Then set the original language of Amélie (French), Spirited Away (Japanese) and Dark (German)
as Radarr/Sonarr would, add a Discord and a Jellyfin notification, fill the Sonarr/Radarr cards
with example URLs, and convert The Matrix, Interstellar, Dark S01E01 and The Office S02E01
so the Conversions and Dashboard pages have content.

## Assets

Home page screenshots are copied from `muxarr/docs/screenshots`. The hero demo is converted
to video, since the original gif was 2.3 MB:

```bash
ffmpeg -i demo.gif -c:v libvpx-vp9 -pix_fmt yuv420p -crf 28 -b:v 0 -row-mt 1 -an demo.webm
ffmpeg -i demo.gif -movflags +faststart -pix_fmt yuv420p -c:v libx264 -crf 21 -preset slow -an demo.mp4
ffmpeg -i demo.gif -frames:v 1 -update 1 demo-poster.png
```

The social card is rendered from `img/og-source.html`, which has the command in it.
