#!/bin/bash
# Downloads the CC0 sound packs the game uses into assets-src/sounds/ (not in git; see ASSETS.md),
# then unpacks them. Already-downloaded files are skipped. Next: node scripts/build-sounds.mjs
set -e
cd "$(dirname "$0")/.."
OGA=https://opengameart.org/sites/default/files
get() { # folder, file name, url
  local dir="assets-src/sounds/$1"
  mkdir -p "$dir"
  if [ ! -s "$dir/$2" ]; then echo "↓ $1/$2"; curl -fsSL --retry 2 -o "$dir/$2" "$3"; fi
  case "$2" in *.zip|*.7z|*.tar.gz) bsdtar -xf "$dir/$2" -C "$dir" ;; esac
}
get firearms "Prepared SFX Library.7z" "$OGA/Prepared%20SFX%20Library.7z"   # 194 MB: gunshots, near and mid distance
get kenney-impact kenney-impact.tar.gz "https://codeload.github.com/Boyquotes/kenney-impact-sounds-for-godot/tar.gz/refs/heads/main"
get gun-reload-sounds assaultriflereload1_0.wav "$OGA/assaultriflereload1_0.wav"
get gun-reload-sounds gunreload1.wav "$OGA/gunreload1.wav"
get handgun-reload reload.wav "$OGA/reload.wav"
get shotgun-reload shotgunsounds.zip "$OGA/shotgunsounds.zip"
get equipment-clicks equipmentclicks.wav "$OGA/equipmentclicks.wav"
get combat-150 150gameeffectsounds.zip "$OGA/150gameeffectsounds.zip"
get swishes swishes.zip "$OGA/swishes.zip"
get metal-impact clink1_0.wav "$OGA/clink1_0.wav"
get metal-impact clink2.wav "$OGA/clink2.wav"
get metal-impact clink3.wav "$OGA/clink3.wav"
get flash-bang flash_bang.wav "$OGA/flash_bang.wav"
get jump-landing jumpland.wav "$OGA/jumpland.wav"
echo "Sound packs are in assets-src/sounds/"
