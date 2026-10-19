#!/bin/sh
# Avvia la ricostruzione di Goopy Le Grande su http://localhost:8000 e apre il browser.
cd "$(dirname "$0")" || exit 1
PORT=${1:-8000}
echo "Goopy Le Grande: http://localhost:$PORT  (Ctrl+C per fermare)"
( sleep 1; xdg-open "http://localhost:$PORT" >/dev/null 2>&1 ) &
exec python3 -m http.server "$PORT" --bind 127.0.0.1
