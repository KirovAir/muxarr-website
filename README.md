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
css/site.css        branding and the navy dark theme
js/site.js          theme toggle, copy buttons
img/                logo and favicons
img/screenshots/    copied from muxarr/docs/screenshots
CNAME               muxarr.app
```

## Deploying

Pushing to `master` publishes the site via `.github/workflows/pages.yml`. Enable it
once under Settings > Pages > Source > GitHub Actions, and point the `muxarr.app` DNS
record at GitHub Pages.

## Keeping it accurate

Copy is written against a specific Muxarr release, so recheck the feature list, the
compose file, and the environment and volume tables when those change. Screenshots come
straight from `muxarr/docs/screenshots`, so recopy them after a UI change.
