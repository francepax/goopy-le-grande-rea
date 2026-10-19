#!/bin/sh
# Rigenera assets/ (sprite, animazioni, audio, font) dalla TUA copia di Cuphead.
# Uso: ./estrai_asset.sh /percorso/alla/cartella/Data
#   Windows/Linux (Steam): .../Cuphead/Cuphead_Data
#   macOS:                 .../Cuphead.app/Contents/Resources/Data
set -e
cd "$(dirname "$0")"
DATA="$1"
if [ -z "$DATA" ] || [ ! -d "$DATA/StreamingAssets/AssetBundles" ]; then
  echo "Indica la cartella Data di Cuphead (quella che contiene StreamingAssets/ e Managed/)." >&2
  exit 1
fi
VENV=.venv
if [ ! -x "$VENV/bin/python" ]; then
  if command -v uv >/dev/null 2>&1; then uv venv -q "$VENV" && VIRTUAL_ENV="$PWD/$VENV" uv pip install -q -r tools/requirements.txt
  else python3 -m venv "$VENV" && "$VENV/bin/pip" install -q -r tools/requirements.txt; fi
fi
PY="$VENV/bin/python -I"
$PY tools/export_assets.py "$DATA" assets
$PY tools/export_audio.py "$DATA" assets
$PY tools/export_fonts.py "$DATA" assets
echo "Fatto. Avvia il gioco con ./avvia.sh"
