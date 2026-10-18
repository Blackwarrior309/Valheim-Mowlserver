#!/usr/bin/env bash
# Packs the compiled mod into three zips under dist/:
#   ValheimWeltLive-<ver>-thunderstore.zip  (r2modman / Thunderstore upload)
#   ValheimWeltLive-<ver>.zip               (manual install: BepInEx/plugins/ValheimWeltLive/…)
#   ValheimWeltLive-Server-<ver>.zip        (dedicated server: DLL + server config + guide, no web page)
# Usage: tools/package-mod.sh path/to/ValheimWeltLive.dll
set -euo pipefail
DLL=${1:?"usage: $0 ValheimWeltLive.dll"}
ROOT=$(cd "$(dirname "$0")/.." && pwd)
VER=$(python3 -c "import json;print(json.load(open('$ROOT/mod/thunderstore/manifest.json'))['version_number'])")
grep -q "Version = \"$VER\"" "$ROOT/mod/ValheimWeltLive/Plugin.cs" || { echo "Version $VER in manifest.json != Plugin.cs"; exit 1; }
OUT="$ROOT/dist"; TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
mkdir -p "$OUT"
web() { mkdir -p "$1"; cp "$ROOT/index.html" "$1/"; cp -r "$ROOT/css" "$ROOT/js" "$ROOT/lib" "$ROOT/plans" "$ROOT/textures" "$1/"; if [ "$2" != "public" ] && [ -d "$ROOT/assets/valheim" ]; then mkdir -p "$1/assets"; cp -r "$ROOT/assets/valheim" "$1/assets/"; fi; }

# Thunderstore
T="$TMP/ts"; mkdir -p "$T/plugins"
cp "$ROOT/mod/thunderstore/"{manifest.json,icon.png,README.md,CHANGELOG.md} "$T/"
cp "$DLL" "$T/plugins/ValheimWeltLive.dll"; web "$T/plugins/web" public   # Thunderstore: nie Original-Spieldaten mitliefern
(cd "$T" && rm -f "$OUT/ValheimWeltLive-$VER-thunderstore.zip" && zip -qr "$OUT/ValheimWeltLive-$VER-thunderstore.zip" .)

# manual
M="$TMP/man/BepInEx/plugins/ValheimWeltLive"; mkdir -p "$M"
cp "$DLL" "$M/"; web "$M/web"; cp "$ROOT/mod/thunderstore/README.md" "$TMP/man/README.md"
(cd "$TMP/man" && rm -f "$OUT/ValheimWeltLive-$VER.zip" && zip -qr "$OUT/ValheimWeltLive-$VER.zip" .)

# server
S="$TMP/srv"; mkdir -p "$S/BepInEx/plugins/ValheimWeltLive" "$S/BepInEx/config"
cp "$DLL" "$S/BepInEx/plugins/ValheimWeltLive/"
cp "$ROOT/mod/server/de.valheimweltviewer.live.cfg" "$S/BepInEx/config/"
cp "$ROOT/mod/server/GUIDE.txt" "$ROOT/mod/server/ANLEITUNG.txt" "$S/"
(cd "$S" && rm -f "$OUT/ValheimWeltLive-Server-$VER.zip" && zip -qr "$OUT/ValheimWeltLive-Server-$VER.zip" .)

ls -la "$OUT"
