#!/bin/bash
# macOS/Linux: Doppelklick (macOS) bzw. ./valheim-sync.command   –   Dauerbetrieb: ./valheim-sync.command --loop
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Node.js fehlt: https://nodejs.org"; read -r; exit 1; }
node sync.cjs "$@"; code=$?
[ $code -eq 2 ] && (open -e valheim-sync.config.json 2>/dev/null || ${EDITOR:-nano} valheim-sync.config.json)
read -r -p "Enter zum Schließen"
