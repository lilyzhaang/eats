#!/usr/bin/env bash
# One-time setup of Eats on the server. Run it ON the server:
#
#   ssh omarchy
#   bash <(curl -fsSL https://raw.githubusercontent.com/lilyzhaang/eats/main/deploy/setup-server.sh)
#
# or, if the repo is already cloned there:  bash deploy/setup-server.sh
#
# It clones the app, asks for the passcode and the Claude API key (typed
# here, never stored in git), starts the app with Docker and publishes it
# with Tailscale Funnel. Safe to run again: it skips what's already done.

set -euo pipefail

APP_DIR="${EATS_DIR:-$HOME/apps/eats}"
REPO="https://github.com/lilyzhaang/eats.git"
PORT=3000
# Funnel's public port: 443 (plain https://name.ts.net), or 8443 / 10000 if
# 443 is already used by another app on this machine.
PUBLIC_PORT="${EATS_PUBLIC_PORT:-443}"

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
need() { command -v "$1" >/dev/null || { echo "Missing: $1. Install it and run this again."; exit 1; }; }

need git
need docker
docker compose version >/dev/null || { echo "Missing: docker compose plugin."; exit 1; }
need tailscale

say "1. Getting the code into $APP_DIR"
if [ -d "$APP_DIR/.git" ]; then
	git -C "$APP_DIR" fetch -q origin main
	git -C "$APP_DIR" checkout -q --detach origin/main
else
	mkdir -p "$(dirname "$APP_DIR")"
	git clone "$REPO" "$APP_DIR"
fi
cd "$APP_DIR"

say "2. Settings (.env)"
# The public address Funnel will use, e.g. https://omarchy.tail1234.ts.net
TS_NAME="$(tailscale status --json | grep -m1 -o '"DNSName": *"[^"]*"' | sed 's/.*"\([^"]*\)"$/\1/; s/\.$//')"
if [ "$PUBLIC_PORT" = "443" ] && tailscale serve status 2>/dev/null | grep -q ':443\|https://'; then
	echo "Tailscale is already serving something on port 443 on this machine:"
	tailscale serve status
	echo "To leave it alone, run this again with: EATS_PUBLIC_PORT=8443 bash deploy/setup-server.sh"
	exit 1
fi
ORIGIN="https://$TS_NAME"
[ "$PUBLIC_PORT" = "443" ] || ORIGIN="$ORIGIN:$PUBLIC_PORT"
if [ -f .env ]; then
	echo ".env already exists; leaving it as is. (Edit it with: nano $APP_DIR/.env)"
else
	read -r -s -p "Owner passcode (Lily and Andrei sign in with this): " PASSCODE; echo
	read -r -s -p "Claude API key (sk-ant-…, or leave blank to add later): " API_KEY; echo
	umask 077 # only this user can read the file
	cat > .env <<ENV
# Eats settings on the server. Never commit this file.
OWNER_PASSCODE=$PASSCODE
ANTHROPIC_API_KEY=$API_KEY
# The public address, used to check requests really come from the app.
ORIGIN=$ORIGIN
ENV
	echo "Saved .env (readable only by $(whoami))."
fi

say "3. Database folder"
# The app runs as user id 10001 inside the container, so it needs to own this.
mkdir -p data
if [ "$(stat -c %u data)" != "10001" ]; then
	echo "Giving the data folder to user id 10001 (may ask for your password)…"
	sudo chown -R 10001:10001 data
fi

say "4. Building and starting the app (first build takes a few minutes)"
docker compose up -d --build

echo -n "Waiting for it to answer"
for _ in $(seq 1 30); do
	if curl -fsS -o /dev/null "http://127.0.0.1:$PORT/pick"; then echo " ok"; break; fi
	echo -n "."; sleep 2
done

say "5. Publishing with Tailscale Funnel"
# --bg keeps it running after this script ends, and across reboots.
if ! tailscale funnel --bg --https="$PUBLIC_PORT" "$PORT"; then
	echo "Funnel didn't start. It may need: sudo tailscale set --operator=\$USER"
	echo "or turning on Funnel/HTTPS in the Tailscale admin console."
	echo "Then run: tailscale funnel --bg --https=$PUBLIC_PORT $PORT"
	exit 1
fi

say "Done. Eats is live at: $ORIGIN"
echo "Updates from now on: run 'npm run deploy' on Lily's Mac."
