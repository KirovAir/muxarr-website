#!/bin/bash
# Builds a small fictional media library for documentation screenshots.
# Real-looking names and track layouts, tiny real streams, padded to plausible
# sizes with an attachment blob so the UI shows GBs instead of KBs.
set -euo pipefail
ROOT=${1:-/tmp/muxarr-docs-media}
WORK=$ROOT/.work
mkdir -p "$WORK"
cd "$WORK"

log() { echo "== $*"; }

# --- reusable elementary streams -------------------------------------------
if [ ! -f video1080.mkv ]; then
  log "video streams"
  ffmpeg -v error -y -f lavfi -i "testsrc2=duration=12:size=1920x1080:rate=24" -c:v libx264 -preset veryfast -crf 30 -pix_fmt yuv420p video1080.mkv
  ffmpeg -v error -y -f lavfi -i "testsrc2=duration=12:size=3840x2160:rate=24" -c:v libx264 -preset veryfast -crf 34 -pix_fmt yuv420p video2160.mkv
  ffmpeg -v error -y -f lavfi -i "testsrc2=duration=12:size=1280x720:rate=24"  -c:v libx264 -preset veryfast -crf 30 -pix_fmt yuv420p video720.mkv
fi

audio() { # name codec layout
  local out=$1 codec=$2 layout=$3
  [ -f "$out" ] && return
  case $codec in
    ac3)   ffmpeg -v error -y -f lavfi -i "sine=frequency=330:duration=12" -af "aformat=channel_layouts=$layout" -c:a ac3 -b:a 448k "$out" ;;
    eac3)  ffmpeg -v error -y -f lavfi -i "sine=frequency=330:duration=12" -af "aformat=channel_layouts=$layout" -c:a eac3 -b:a 768k "$out" ;;
    aac)   ffmpeg -v error -y -f lavfi -i "sine=frequency=330:duration=12" -af "aformat=channel_layouts=$layout" -c:a aac -b:a 160k "$out" ;;
    flac)  ffmpeg -v error -y -f lavfi -i "sine=frequency=330:duration=12" -af "aformat=channel_layouts=$layout" -c:a flac "$out" ;;
    dts)   ffmpeg -v error -y -f lavfi -i "sine=frequency=330:duration=12" -af "aformat=channel_layouts=$layout" -c:a dca -strict -2 -b:a 1509k "$out" ;;
  esac
}
audio a_ac3_51.ac3 ac3 5.1
audio a_ac3_20.ac3 ac3 stereo
audio a_eac3_51.eac3 eac3 5.1
audio a_aac_20.aac aac stereo
audio a_flac_51.flac flac 5.1
audio a_flac_20.flac flac stereo
audio a_dts_51.dts dts 5.1 || audio a_dts_51.dts ac3 5.1

srt() { # name text
  printf '1\n00:00:01,000 --> 00:00:04,000\n%s\n\n2\n00:00:05,000 --> 00:00:08,000\n%s\n' "$2" "$2" > "$1"
}
srt s_en.srt "Hello there."
srt s_de.srt "Hallo zusammen."
srt s_fr.srt "Bonjour à tous."
srt s_es.srt "Hola a todos."
srt s_nl.srt "Hallo allemaal."
srt s_ja.srt "こんにちは。"
srt s_it.srt "Ciao a tutti."

# Attachments must stay under 2 GiB each, so bigger paddings use several.
pad() { # size in MB -> "--attach-file x --attach-file y"
  local left=$1 args="" mb f
  while [ "$left" -gt 0 ]; do
    mb=$(( left > 250 ? 250 : left )); left=$(( left - mb ))
    f=blob_$mb.bin
    [ -f "$f" ] || dd if=/dev/zero of="$f" bs=1m count="$mb" status=none
    args="$args --attach-file $f"
  done
  echo "$args"
}

# --- movies -----------------------------------------------------------------
M=$ROOT/Movies
T=$ROOT/TV
mkdir -p "$M/The Matrix (1999)" "$M/Amélie (2001)" "$M/Spirited Away (2001)" "$M/Inception (2010)" "$M/Interstellar (2014)" \
         "$T/Dark/Season 01" "$T/The Office (US)/Season 02"

log "The Matrix"
mkvmerge -q -o "$M/The Matrix (1999)/The.Matrix.1999.1080p.BluRay.x264-SPARKS.mkv" \
  --title "The.Matrix.1999.1080p.BluRay.x264-SPARKS" \
  --language 0:und --track-name 0:"MPEG-4 AVC 1080p @ 9847 kbps" video1080.mkv \
  --language 0:eng --track-name 0:"DTS-HD MA 5.1 @ 1509kbps" --default-track-flag 0:yes a_dts_51.dts \
  --language 0:eng --track-name 0:"AAC 2.0 Commentary by the Wachowskis" --commentary-flag 0:yes a_aac_20.aac \
  --language 0:ger --track-name 0:"German DD 5.1 448kbps" a_ac3_51.ac3 \
  --language 0:fre --track-name 0:"French VFF AC3 5.1" a_ac3_51.ac3 \
  --language 0:eng --track-name 0:"English" --default-track-flag 0:yes s_en.srt \
  --language 0:eng --track-name 0:"English SDH" --hearing-impaired-flag 0:yes s_en.srt \
  --language 0:ger --track-name 0:"Deutsch" s_de.srt \
  --language 0:fre --track-name 0:"French (Forced)" --forced-display-flag 0:yes s_fr.srt \
  --language 0:spa --track-name 0:"Español" s_es.srt \
  $(pad 2100)

log "Amelie"
mkvmerge -q -o "$M/Amélie (2001)/Amelie.2001.1080p.BluRay.x264-CiNEFiLE.mkv" \
  --title "Amelie.2001.1080p.BluRay.x264-CiNEFiLE" \
  --language 0:und --track-name 0:"AVC" video1080.mkv \
  --language 0:fre --track-name 0:"French DTS 5.1" --default-track-flag 0:yes --original-flag 0:yes a_dts_51.dts \
  --language 0:eng --track-name 0:"English AAC 2.0 (dub)" a_aac_20.aac \
  --language 0:eng --track-name 0:"English" --default-track-flag 0:yes s_en.srt \
  --language 0:fre --track-name 0:"Français" s_fr.srt \
  --language 0:dut --track-name 0:"Nederlands" s_nl.srt \
  $(pad 1400)

log "Spirited Away"
mkvmerge -q -o "$M/Spirited Away (2001)/Spirited.Away.2001.1080p.BluRay.x264-GHiBLi.mkv" \
  --language 0:und video1080.mkv \
  --language 0:jpn --track-name 0:"Japanese FLAC 2.0" --default-track-flag 0:yes --original-flag 0:yes a_flac_20.flac \
  --language 0:eng --track-name 0:"English Dub AC3 5.1" a_ac3_51.ac3 \
  --language 0:eng --track-name 0:"English (Signs & Songs)" --forced-display-flag 0:yes s_en.srt \
  --language 0:eng --track-name 0:"English (Full)" --default-track-flag 0:yes s_en.srt \
  --language 0:dut --track-name 0:"Dutch" s_nl.srt \
  --language 0:jpn --track-name 0:"日本語" s_ja.srt \
  $(pad 1800)

log "Inception"
mkvmerge -q -o "$M/Inception (2010)/Inception.2010.2160p.UHD.BluRay.x265-TERMiNAL.mkv" \
  --title "Inception.2010.2160p.UHD.BluRay.x265-TERMiNAL" \
  --language 0:und --track-name 0:"HEVC 2160p HDR10" video2160.mkv \
  --language 0:eng --track-name 0:"DDP 5.1 Atmos" --default-track-flag 0:yes a_eac3_51.eac3 \
  --language 0:eng --track-name 0:"AAC Stereo" a_aac_20.aac \
  --language 0:eng --track-name 0:"Commentary" --commentary-flag 0:yes a_aac_20.aac \
  --language 0:eng --track-name 0:"English" --default-track-flag 0:yes s_en.srt \
  --language 0:eng --track-name 0:"English SDH" --hearing-impaired-flag 0:yes s_en.srt \
  --language 0:spa --track-name 0:"Spanish" s_es.srt \
  --language 0:fre --track-name 0:"French" s_fr.srt \
  --language 0:ger --track-name 0:"German" s_de.srt \
  --language 0:dut --track-name 0:"Dutch" s_nl.srt \
  --language 0:ita --track-name 0:"Italian" s_it.srt \
  $(pad 3400)

log "Interstellar"
cat > chapters.txt <<'EOF'
CHAPTER01=00:00:00.000
CHAPTER01NAME=Chapter 1
CHAPTER02=00:00:05.000
CHAPTER02NAME=Chapter 2
EOF
mkvmerge -q -o "$M/Interstellar (2014)/Interstellar.2014.1080p.BluRay.x264-SPARKS.mkv" \
  --chapters chapters.txt \
  --language 0:und video1080.mkv \
  --language 0:eng --track-name 0:"English AC3 5.1" --default-track-flag 0:yes a_ac3_51.ac3 \
  --language 0:eng --track-name 0:"English SDH" --hearing-impaired-flag 0:yes --default-track-flag 0:yes s_en.srt \
  $(pad 2600)

log "Dark"
for ep in "01.Secrets:1100" "02.Lies:1000" "03.Past.and.Present:1200"; do
  name=${ep%%:*}; size=${ep##*:}
  mkvmerge -q -o "$T/Dark/Season 01/Dark.S01E${name}.1080p.WEB-DL.DDP5.1.H.264-NTb.mkv" \
    --language 0:und video1080.mkv \
    --language 0:ger --track-name 0:"German DDP 5.1" --default-track-flag 0:yes --original-flag 0:yes a_eac3_51.eac3 \
    --language 0:eng --track-name 0:"English DDP 5.1 (dubbed)" a_eac3_51.eac3 \
    --language 0:eng --track-name 0:"English" --default-track-flag 0:yes s_en.srt \
    --language 0:eng --track-name 0:"English (Forced)" --forced-display-flag 0:yes s_en.srt \
    --language 0:ger --track-name 0:"Deutsch" s_de.srt \
    --language 0:dut --track-name 0:"Nederlands" s_nl.srt \
    $(pad $size)
done

log "The Office"
mkvmerge -q -o "$T/The Office (US)/Season 02/The.Office.US.S02E01.The.Dundies.720p.WEB-DL.mkv" \
  --language 0:und video720.mkv \
  --language 0:eng --track-name 0:"English AAC 2.0" --default-track-flag 0:yes a_aac_20.aac \
  --language 0:spa --track-name 0:"Spanish AAC 2.0" a_aac_20.aac \
  --language 0:eng --track-name 0:"English" s_en.srt \
  --language 0:eng --track-name 0:"English SDH" --hearing-impaired-flag 0:yes s_en.srt \
  --language 0:spa --track-name 0:"Spanish" s_es.srt \
  $(pad 450)
# One MP4 to show non-MKV handling
ffmpeg -v error -y -i video720.mkv -i a_aac_20.aac -i s_en.srt \
  -map 0:v -map 1:a -map 2:s -c:v copy -c:a copy -c:s mov_text \
  -metadata:s:a:0 language=eng -metadata:s:s:0 language=eng \
  "$T/The Office (US)/Season 02/The.Office.US.S02E02.Sexual.Harassment.720p.WEB-DL.mp4"

log "done"
du -sh "$M" "$T"
