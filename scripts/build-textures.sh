#!/bin/bash
# Builds the map's photo textures from ambientCG downloads (CC0) in assets-src/textures/<AssetId>/
# into public/assets/game/textures/: color, normal (OpenGL) and roughness maps, recompressed JPEGs.
# Uses macOS's built-in `sips`. Run from the project folder: bash scripts/build-textures.sh
set -euo pipefail
cd "$(dirname "$0")/.."

SRC=assets-src/textures
OUT=public/assets/game/textures
QUALITY=80

# surface name → ambientCG asset id
SURFACES=(
  "concrete Concrete036"
  "asphalt Road012A"
  "brick Bricks085"
  "wood Planks020"
  "steel CorrugatedSteel005"
)

mkdir -p "$OUT"
json="{"
for entry in "${SURFACES[@]}"; do
  read -r name id <<< "$entry"
  for map in Color NormalGL Roughness; do
    in="$SRC/$id/${id}_1K-JPG_${map}.jpg"
    [ -f "$in" ] || { echo "Missing $in (download ${id}_1K-JPG.zip from ambientcg.com and unzip it into $SRC/$id/)"; exit 1; }
    suffix=$(echo "$map" | tr '[:upper:]' '[:lower:]' | sed 's/normalgl/normal/;s/roughness/rough/')
    sips -s format jpeg -s formatOptions "$QUALITY" "$in" --out "$OUT/${name}_${suffix}.jpg" > /dev/null
  done
  size=$(sips -g pixelWidth -g pixelHeight "$SRC/$id/${id}_1K-JPG_Color.jpg" | awk '/pixel/ {print $2}' | paste -sd, -)
  json="$json\"$name\":{\"id\":\"$id\",\"size\":[$size],\"source\":\"https://ambientcg.com/view?id=$id\"},"
done
echo "${json%,}}" > "$OUT/textures.json"
du -sh "$OUT"
