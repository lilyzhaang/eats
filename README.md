# Eats

A small web app for Lily and Andrei's weekly meal prep: **pick** two lunches and two dinners, **shop** from an automatic grocery list, **cook** from one sequenced prep-day plan, and **rate** the week so the recipe bank grows.

The full brief (what it does and why) is in [CLAUDE.md](CLAUDE.md). Mockups and the original spreadsheet are in [docs/](docs/).

## What it's built with

| Piece                                    | What it is                                         | Why                                                     |
| ---------------------------------------- | -------------------------------------------------- | ------------------------------------------------------- |
| [SvelteKit](https://svelte.dev/docs/kit) | The screens _and_ the small server, in one project | Svelte files read close to plain HTML                   |
| SQLite                                   | The database: one file, `data/eats.db`             | Nothing to install; moving the app means copying a file |
| Docker                                   | Packaging for hosting                              | "Copy and run" on any server, including Andrei's        |

## Run it on your Mac

You need [Node.js](https://nodejs.org) 24 or newer. Check with `node -v`.

1. **Install the project's libraries** (once, and again whenever `package.json` changes):

   ```bash
   npm install
   ```

2. **Create your settings file** from the template. The dev passcodes in it are fine for your Mac:

   ```bash
   cp .env.example .env
   ```

3. **Build the database with sample data** (the week of Oct 18 from the brief):

   ```bash
   npm run db:reset
   ```

4. **Start the app:**

   ```bash
   npm run dev
   ```

   Open <http://localhost:5173>, choose who you are, and enter a passcode from your `.env` file. The page updates by itself as code changes. Press `Ctrl+C` in the terminal to stop the app.

## Claude writes the menu

When an owner clicks **Generate next week's menu** (on the **Next week's menu** page, in the menu under your initial), the app asks Claude for next week's options. Claude sees your ratings, tweaks, "Never" recipes, recent meals, cravings and the season, and writes new recipes (in its own words) with ingredients matched to your ingredient list. Recipe-bank favourites are chosen by the app. The menu arrives as a **draft** a few minutes later: owners see a banner, swap anything they don't fancy, and approve it. Only then does it appear on Pick.

When you both lock in your picks, Claude writes the **prep-day plan** for those four recipes, following the rules in `prompts/prep-plan.md`.

- Claude's instructions are plain text in [`prompts/`](prompts/). Edit them like any document.
- Turn it on by setting `ANTHROPIC_API_KEY` (from [console.anthropic.com](https://console.anthropic.com)) in `.env`.
- Every request is logged in the `ai_runs` table with its token use. A full menu has cost about $0.66 (Claude Opus 5.5); a prep plan costs less.
- If Claude's answer arrives but can't be saved, trying again reuses it instead of paying twice.

## Everyday commands

| Command                          | What it does                                                                           |
| -------------------------------- | -------------------------------------------------------------------------------------- |
| `npm run dev`                    | Start the app on your Mac                                                              |
| `npm test`                       | Run the automated checks                                                               |
| `npm run check`                  | Look for code mistakes (type errors)                                                   |
| `npm run db:reset`               | Wipe your **local** database and reload the sample data. Refuses to run in production. |
| `npm run db:migrate`             | Apply new database changes (the app also does this when it starts)                     |
| `npm run build` then `npm start` | Run the production version locally                                                     |

## How the code is laid out

```
migrations/           Database tables, one numbered file per change. Never edit an old one; add a new file.
prompts/              Claude's instructions for writing menus and prep plans.
scripts/              The db:reset and db:migrate commands.
src/
  env.ts              The settings the app reads (passcodes, database location).
  hooks.server.ts     Runs before every request: who's signed in, and blocking viewers from changing things.
  app.css             Colors, fonts and shared styles (from the design brief).
  lib/server/         Code that only runs on the server: database, sign-in, queries.
    ai/               Talking to Claude: the weekly menu, swaps, prep plans.
  lib/components/     Reusable pieces of screen (icons, cards…).
  routes/             One folder per page. The folder name is the web address.
    signin/           Passcode + "Who are you?"
    switch/           Switch person
    (app)/            The four main screens and the tab bar around them
      pick/ shop/ cook/ rate/
      review/         Next week's menu from Claude, before it opens for picking (owners only)
docs/                 The spreadsheet and mockups the app is based on.
```

In each route folder, `+page.svelte` is what you see and `+page.server.ts` loads its data or handles its buttons on the server.

## Dev and live (prod)

- **Dev** is your Mac: `npm run dev`, with the sample data in `data/eats.db`. Break things freely.
- **Live** is the hosted copy you both use on your phones. It has its own database and its own, different passcodes.

The two never share a database, so testing never touches real picks. Change things on your Mac first, then deploy.

## Sign-in

There are no accounts. Two passcodes are set as environment variables:

- `OWNER_PASSCODE` — Lily and Andrei share it. Opens Lily, Andrei or Viewer.
- `VIEWER_PASSCODE` — for showing the app to someone. Only opens Viewer, which can look but not change anything. That rule is enforced on the server, not just by hiding buttons.

Devices stay signed in for a year. Changing a passcode signs out every device that used it. After 10 wrong tries, a device has to wait 15 minutes.

## Hosting (later)

The app runs anywhere that runs a Docker container. On a machine with Docker:

```bash
cp .env.example .env   # then set real passcodes and ORIGIN
docker compose up -d
```

The database is stored in `./data` on the host. Back up that folder.

## Known quirks

- `npm run build` uses `--logLevel warn` to work around a SvelteKit 3.1 bug on Node 25 (it uses a color name newer Node versions reject). Once SvelteKit fixes it, the flag can go.

## License

[MIT](LICENSE)
