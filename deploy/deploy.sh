#!/usr/bin/env bash
# Deploy the latest code to the live server. Run on Lily's Mac:
#
#   npm run deploy
#
# What it does, in order:
#   1. Makes sure everything is committed and pushed to GitHub, so the live
#      site always matches a version you can see on GitHub.
#   2. Runs the tests and the build, so a broken version never goes live.
#   3. Over SSH, asks the server to build and run exactly that version, and
#      waits until the live app answers.
#
# Settings: EATS_SERVER (default "omarchy", see ~/.ssh/config).

set -euo pipefail

SERVER="${EATS_SERVER:-omarchy}"

cd "$(dirname "$0")/.."

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
stop() { printf '\n\033[31m%s\033[0m\n' "$*"; exit 1; }

say "1. Checking everything is committed and pushed"
[ -z "$(git status --porcelain)" ] || stop "You have changes that aren't committed yet. Commit them first."
[ "$(git rev-parse --abbrev-ref HEAD)" = "main" ] || stop "Switch to the main branch first."
git fetch -q origin main
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] ||
	stop "Your main and GitHub's main differ. Push (or pull) first."
VERSION="$(git rev-parse --short HEAD)"
echo "Deploying $VERSION: $(git log -1 --format=%s)"

say "2. Tests and build"
npm test --silent
npm run build --silent >/dev/null
echo "ok"

say "3. Updating the server"
# The server only accepts a few fixed commands from this Mac's key
# (see deploy/server/eats-deploy): it builds exactly this commit, checks
# the app answers, and reports back.
ssh "$SERVER" deploy "$(git rev-parse HEAD)" ||
	stop "Deploy failed. See the log with: npm run server:logs"
say "Live: version $VERSION is running."
