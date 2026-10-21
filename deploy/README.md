# Running Eats on omarchy

The live app runs in Docker on Andrei's server, omarchy. Tailscale Funnel publishes it at a public `https://….ts.net` address. Anyone with the link can view it read-only; Lily and Andrei sign in to make changes.

Updates only happen when someone runs `npm run deploy`. Nothing on the server checks for updates by itself.

```
Lily's Mac ──git push──▶ GitHub
     │
     └──npm run deploy (SSH over Tailscale)──▶ omarchy: fetch that version, rebuild
                                                  │
phones / browsers ──https://omarchy.….ts.net──▶ Tailscale Funnel ──▶ 127.0.0.1:3000 (Docker)
```

## One-time setup

### Andrei

1. **Invite Lily to the tailnet**: Tailscale admin console → Users → Invite users.
2. **Turn on MagicDNS and HTTPS certificates**: admin console → DNS.
3. **Let Lily's Mac log in over SSH**: add this line to `~/.ssh/authorized_keys` for the `ass` user. `restrict` and `command=` mean her key can only run `~/.local/bin/eats-ssh` (the fixed commands below), never a shell:
   ```
   restrict,command="/home/ass/.local/bin/eats-ssh" ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINSHef22PI0el9CxqGQsJdZwB3YCyT+9bYLbFE8+n8+U lily-mac-eats-deploy
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
2. Check you can reach the server: `ssh omarchy health && echo ok`. The SSH shortcut and key are already on your Mac.

## Deploying an update

From the `eats` folder on Lily's Mac:

```bash
npm run deploy
```

It refuses to deploy uncommitted or unpushed work, runs the tests and build, then has omarchy fetch that exact version and rebuild. It takes a minute or two, and the site is down for a few seconds while the container restarts.

## Everyday server commands

From Lily's Mac, as `ssh omarchy <command>`:

| Command           | What it does                                                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `deploy <commit>` | Fetches main, checks out that commit (it must be on origin/main), rebuilds, and prunes old Eats images. `npm run deploy` does this for you. |
| `health`          | Exits successfully when the app answers on /pick.                                                                                           |
| `status`          | Shows whether the container is running.                                                                                                     |
| `restart`         | Restarts the app.                                                                                                                           |
| `backup`          | Makes a safe copy of the database.                                                                                                          |
| `logs [lines]`    | Shows the most recent log lines, e.g. `ssh omarchy logs 50`.                                                                                |

Anything else, including a plain `ssh omarchy`, just prints that list and closes. Lily's key can't open a shell on omarchy. Anything else on the server (changing the passcode or API key, Funnel, rolling back, the container settings) is done by Andrei.

Changing the owner passcode signs everyone out, so they sign in again with the new one.

## Notes

- The app only listens on `127.0.0.1:3000`, so the home network can't reach it except through Funnel.
- The database is one file, `data/eats.db`. Back up the whole `data/` folder.
- On omarchy, Eats runs with `~/apps/eats-run/compose.yml`, which Andrei owns. The repo's `docker-compose.yml` is for running it elsewhere. Changes to ports, mounts, memory or the user go through Andrei, so a commit to this repo can't change what the container is allowed to do.
- The app runs as user id 10001 with a read-only file system, no extra privileges, and memory and process limits, so a break-in at Eats can't reach other apps on omarchy. `data/` belongs to 10001, so reading it directly on the server needs `sudo`; `ssh omarchy backup` works without it.
- Moving an existing server to this version: run `sudo chown -R 10001:10001 ~/apps/eats/data` on omarchy once, before `npm run deploy`. Without it the app can't open its database.
- Docker images: each deploy removes old Eats images (labelled `app=eats`) so they don't pile up on the disk. Other apps' images are never touched.
