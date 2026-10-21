#!/usr/bin/env bash
# Deploy the latest code to the live server. Run on Lily's Mac:
#
#   npm run deploy
#
# What it does, in order:
#   1. Makes sure everything is committed and pushed to GitHub, so the live
#      site always matches a version you can see on GitHub.
#   2. Runs the tests and the build, so a broken version never goes live.
#   3. Over SSH, tells the server to fetch exactly that version and rebuild.
#   4. Checks the live app answers.
#
# Settings: EATS_SERVER (default "omarchy", see ~/.ssh/config). Lily's key
# can only run a few fixed commands on omarchy (see deploy/README.md).

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
ssh "$SERVER" deploy "$(git rev-parse HEAD)"

say "4. Checking it's up"
for _ in $(seq 1 30); do
	if ssh "$SERVER" health; then
		say "Live: version $VERSION is running."
		exit 0
	fi
	sleep 2
done
stop "The app didn't answer after deploying. See the logs: ssh $SERVER logs 50"
