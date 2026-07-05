#!/bin/bash
# SATrainer — no-build launcher for macOS.
# Double-click this file in Finder to run the app in your default browser.
# (First time only: right-click → Open, or run `chmod +x SATrainer.command`.)
#
# It serves the app over http://127.0.0.1 so localStorage (your progress) works
# reliably in any browser — Safari blocks localStorage for file:// pages.

cd "$(dirname "$0")" || exit 1
PORT=8765
URL="http://127.0.0.1:${PORT}/index.html"

if command -v python3 >/dev/null 2>&1; then
  echo "Starting SATrainer at ${URL}"
  echo "Keep this Terminal window open while using the app; close it to stop."
  # Start the static server in the background, open the browser, then wait.
  python3 -m http.server "${PORT}" --bind 127.0.0.1 >/dev/null 2>&1 &
  SERVER_PID=$!
  sleep 1
  open "${URL}"
  trap 'kill ${SERVER_PID} 2>/dev/null' EXIT
  wait ${SERVER_PID}
else
  echo "python3 not found; opening the file directly."
  echo "Note: on Safari, progress may not save under file:// — use Chrome, or build the app (see PACKAGING.md)."
  open index.html
fi
