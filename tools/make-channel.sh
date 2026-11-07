#!/usr/bin/env bash
# Publish a copy of the web app from a git ref into a sub-folder of this repo (beta/ or stable/), so it runs at
# https://matthettich.github.io/seeds/<dir>/ next to the live app without touching it. Same recipe as ...Thunder Plus.
#
#   tools/make-channel.sh <ref> <dir> <cache-prefix> [label]
#   tools/make-channel.sh origin/beta beta seedsbeta-v beta
#
# What it does:
#   - copies only the web app from <ref>: index.html, sw.js, manifest.webmanifest, icons/;
#   - renames the service worker's cache to <cache-prefix>… and makes it clear only its own old caches, so the live
#     app's cache and this copy's never delete each other;
#   - adds "(label)" to the page title so it's clear which copy is open.
# Saved patches and settings are shared with the live app (same site, same browser storage; not between separately
# installed iPhone/iPad Home Screen apps, which each keep their own).
#
# Needs GNU sed (the `0,/re/` address and `sed -i` with no suffix): fine on GitHub's Ubuntu runners, where it normally
# runs; on a Mac install it with `brew install gnu-sed` and put its gnubin folder first on PATH.
set -euo pipefail
REF=${1:?ref}; DIR=${2:?dir}; PREFIX=${3:?cache prefix}; LABEL=${4:-$DIR}
ROOT=$(git rev-parse --show-toplevel); cd "$ROOT"
case "$DIR" in beta|stable) ;; *) echo "only beta/ or stable/ (got '$DIR')"; exit 1 ;; esac
# LABEL and PREFIX go into sed replacements: keep them to plain characters so they can't break the commands.
[[ $LABEL =~ ^[A-Za-z0-9._\ -]+$ ]] || { echo "label may only use letters, digits, space, . _ - (got '$LABEL')"; exit 1; }
[[ $PREFIX =~ ^[A-Za-z0-9._-]+$ ]] || { echo "cache prefix may only use letters, digits, . _ - (got '$PREFIX')"; exit 1; }
sed --version >/dev/null 2>&1 || { echo "needs GNU sed (on a Mac: brew install gnu-sed)"; exit 1; }

rm -rf "$DIR"; mkdir -p "$DIR"
git archive "$REF" index.html sw.js manifest.webmanifest icons | tar -x -C "$DIR"
SHA=$(git rev-parse --short "$REF")

# The service worker: its own cache name, and it only cleans up caches with its own prefix.
sed -i -E "s#^const CACHE = 'seeds-v([0-9]+)';#const CACHE = '${PREFIX}\1';#" "$DIR/sw.js"
sed -i -E "s#k\.startsWith\('seeds-v'\)#k.startsWith('${PREFIX}')#" "$DIR/sw.js"
grep -q "^const CACHE = '${PREFIX}" "$DIR/sw.js" || { echo "sw.js cache name not found"; exit 1; }
grep -q "startsWith('${PREFIX}')" "$DIR/sw.js" || { echo "sw.js clean-up filter not found"; exit 1; }
# The page title and the installed app's name.
sed -i -E "0,/<title>([^<]*)<\/title>/s##<title>\1 (${LABEL})</title>#" "$DIR/index.html"
grep -q "(${LABEL})</title>" "$DIR/index.html" || { echo "title not found"; exit 1; }
sed -i -E "s#\"name\": *\"([^\"]*)\"#\"name\": \"\1 (${LABEL})\"#; s#\"short_name\": *\"([^\"]*)\"#\"short_name\": \"\1 ${LABEL}\"#" "$DIR/manifest.webmanifest"

cat > "$DIR/README.md" <<EOF
# ...Seeds: ${LABEL} copy

Made by \`tools/make-channel.sh\` from \`${REF}\` (commit ${SHA}). Don't edit files here: change the \`${LABEL}\` branch and
it publishes again. Runs at https://matthettich.github.io/seeds/${DIR}/ and shares saved patches with the live app.
EOF
echo "$DIR/ <- $REF ($SHA)"
