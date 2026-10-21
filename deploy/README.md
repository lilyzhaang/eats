# Running Eats on omarchy

The live app runs in Docker on Andrei's server, omarchy. Tailscale Funnel publishes it at a public `https://….ts.net` address. Anyone with the link can view it read-only; Lily and Andrei sign in to make changes.

Updates only happen when someone runs `npm run deploy`. Nothing on the server checks for updates by itself.

Lily's deploy key can't log in to omarchy. It can only run `~/bin/eats-deploy`, which accepts three requests: deploy a commit that's on GitHub's `main`, show status, or show the log. What the container may do is set in `~/eats-server/docker-compose.yml`, which only Andrei changes. Both live outside the git checkout, so nothing pushed to GitHub can change them.

```
Lily's Mac ──git push──▶ GitHub
     │
     └──npm run deploy (SSH over Tailscale)──▶ omarchy: ~/bin/eats-deploy builds that version
                                                  │
phones / browsers ──https://omarchy.….ts.net──▶ Tailscale Funnel ──▶ 127.0.0.1:3000 (Docker)
```

## One-time setup

### Andrei

1. **Invite Lily to the tailnet**: Tailscale admin console → Users → Invite users.
2. **Turn on MagicDNS and HTTPS certificates**: admin console → DNS.
3. **Let Lily's Mac log in over SSH**: add her public key (below) as a line in `~/.ssh/authorized_keys` for the `ass` user:
   ```
   ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINSHef22PI0el9CxqGQsJdZwB3YCyT+9bYLbFE8+n8+U lily-mac-eats-deploy
   ```
   Remove that line any time to revoke her Mac's access.
4. **Run the setup script on omarchy.** It clones the app to `~/apps/eats`, asks for the owner passcode and the Claude API key, starts the app and turns on Funnel:
   ```bash
   bash <(curl -fsSL https://raw.githubusercontent.com/lilyzhaang/eats/main/deploy/setup-server.sh)
   ```
   If Tailscale already serves another app on port 443 here, the script stops and says so. Run it again with `EATS_PUBLIC_PORT=8443` in front, and Eats will use `https://omarchy.….ts.net:8443` instead, leaving the other app alone.

   If Funnel refuses to start, run `sudo tailscale set --operator=$USER` and allow Funnel when the admin console asks, then rerun the script.

The passcode and API key end up only in `~/apps/eats/.env` on the server, readable only by the `ass` user. Lily can type the API key herself when the script asks (over SSH), so it's never sent in a message.

### Lily

1. Install Tailscale for Mac (Mac App Store or tailscale.com), sign in, and accept Andrei's invite.
2. Check you can reach the server: `ssh omarchy`. The SSH shortcut and key are already on your Mac.

## Locking Lily's key to deploys (one-time, for a server set up before this)

**Andrei**, on omarchy, with your usual access:

1. Get the new files:
   ```bash
   cd ~/apps/eats && git fetch -q origin main && git checkout -q --detach origin/main
   ```
2. Install the deploy command and the container settings, outside the checkout:
   ```bash
   install -D -m 755 deploy/server/eats-deploy ~/bin/eats-deploy
   install -D -m 644 deploy/server/docker-compose.yml ~/eats-server/docker-compose.yml
   ```
3. Switch the running app over to those settings. Same container, same lockdown, same data; it restarts for a few seconds:
   ```bash
   docker compose -f ~/eats-server/docker-compose.yml up -d --build
   curl -fsS -o /dev/null http://127.0.0.1:3000/pick && echo ok
   ```
4. Restrict Lily's key. In `~/.ssh/authorized_keys`, change her line (it ends in `lily-mac-eats-deploy`) so it starts with `restrict,command="/home/ass/bin/eats-deploy"`, giving:
   ```
   restrict,command="/home/ass/bin/eats-deploy" ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINSHef22PI0el9CxqGQsJdZwB3YCyT+9bYLbFE8+n8+U lily-mac-eats-deploy
   ```
   `restrict` turns off shells, port forwarding and everything else; `command=` means the only thing it can run is the deploy command. Your own keys are unaffected.

**Then, from Lily's Mac:**
- `ssh omarchy` should now be refused with "not allowed".
- `npm run server:status` should show the app running and answering.

**Optional, Lily:** put a passphrase on the key, so a stolen laptop alone can't deploy. You type the passphrase yourself; macOS remembers it in the Keychain:
```bash
ssh-keygen -p -f ~/.ssh/omarchy_ed25519
```
```bash
ssh-add --apple-use-keychain ~/.ssh/omarchy_ed25519
```

## Deploying an update

From the `eats` folder on Lily's Mac:

```bash
npm run deploy
```

It refuses to deploy uncommitted or unpushed work, runs the tests and build, then asks omarchy to build and run that exact version. It takes a minute or two, and the site is down for a few seconds while the container restarts.

From Lily's Mac, `npm run server:status` shows whether it's running, and `npm run server:logs` shows the last 100 log lines.

## Everyday server commands

Run these on omarchy (Andrei). They all use the server's own settings file, so start each with `docker compose -f ~/eats-server/docker-compose.yml`, shortened below to `dc`. Add `alias dc='docker compose -f ~/eats-server/docker-compose.yml'` to your shell to type it that way:

| What | Command |
|---|---|
| Is it running? | `dc ps` |
| Recent logs | `dc logs --tail 100` |
| Restart | `dc restart` |
| Back up the database | `dc exec eats node scripts/db-backup.ts` (copy lands in `~/apps/eats/data/backups/`) |
| Change the passcode or API key | `nano ~/apps/eats/.env`, then `dc up -d` |
| Roll back to an earlier version | `git -C ~/apps/eats checkout --detach <commit>` then `dc up -d --build` |
| Stop it | `dc down` (data stays in `~/apps/eats/data/`) |
| Update the container settings | after pulling: `install -m 644 ~/apps/eats/deploy/server/docker-compose.yml ~/eats-server/docker-compose.yml && dc up -d` |
| See what Funnel is publishing | `tailscale funnel status` |
| Stop publishing it | `tailscale funnel --https=443 off` (or `8443`) |

Changing the owner passcode signs everyone out, so they sign in again with the new one.

## Notes

- The app only listens on `127.0.0.1:3000`, so the home network can't reach it except through Funnel.
- The database is one file, `data/eats.db`. Back up the whole `data/` folder.
- The app runs as user id 10001 with a read-only file system, no extra privileges, and memory and process limits, so a break-in at Eats can't reach other apps on omarchy. `data/` belongs to 10001, so reading it directly on the server needs `sudo`; the backup command above works without it.
- Moving an existing server to this version: run `sudo chown -R 10001:10001 ~/apps/eats/data` on omarchy once, before `npm run deploy`. Without it the app can't open its database.
- Docker images: each deploy removes old Eats images (labelled `app=eats`) so they don't pile up on the disk. Other apps' images are never touched.
