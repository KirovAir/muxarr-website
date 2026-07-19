# muxarr-website

The website for [Muxarr](https://github.com/KirovAir/muxarr), live at
[muxarr.app](https://muxarr.app).

Static HTML and Bootstrap, no build step. To work on it, serve the folder:

```bash
python3 -m http.server 8000
```

Push to `master` and it deploys.

## Assets

Screenshots are copied from `muxarr/docs/screenshots`. The hero demo is converted to
video, since the original gif was 2.3 MB:

```bash
ffmpeg -i demo.gif -c:v libvpx-vp9 -pix_fmt yuv420p -crf 28 -b:v 0 -row-mt 1 -an demo.webm
ffmpeg -i demo.gif -movflags +faststart -pix_fmt yuv420p -c:v libx264 -crf 21 -preset slow -an demo.mp4
ffmpeg -i demo.gif -frames:v 1 -update 1 demo-poster.png
```

The social card is rendered from `img/og-source.html`, which has the command in it.
