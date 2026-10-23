# Meal Prep System — Project Brief

> Hand-off document for building this project in Claude Code. Lives at the repo root as `CLAUDE.md`, so Claude Code reads it at the start of every session. It captures everything decided in planning; update the decisions log (§14) as things change.

---

## 1. What this is

A small web app that runs a weekly meal-prep routine for two people, **Lily** and **Andrei**.

Every week they meal prep **two lunches and two dinners**. Lily is Chinese and Andrei is Romanian. They like working their own food traditions into the week (not every meal, but regularly), alongside whatever else sounds good.

The app turns that routine into a system with four steps:

1. **Pick:** each week, a menu of options per slot. Some are **new recipes suggested by AI**, and some are proven favourites from **their own recipe bank**.
2. **Shop:** an automatic grocery list for whatever they picked.
3. **Cook:** a **sequenced prep-day plan** that weaves all four recipes into one efficient flow ("oven's on for the potatoes, so start the soup on burner 1 and mix the meatballs while it heats").
4. **Rate:** a quick debrief the following week, which grows the recipe bank with what they actually like.

Over time the recipe bank gets better, and favourites rotate back in alongside new ideas.

### Why it's being built this way

- **Fun over form:** replying to emails in a fixed format ("L1 B · L2 C …") was judged boring. Tapping cards and stars on a phone is the point.
- **Sequencing is the secret sauce:** the thing they value most about good meal-prep guides isn't any particular recipe. It's the choreography, planned around equipment and idle time, that makes a cook day efficient. The app should do this for *any* four recipes they pick.
- **Portable:** it should start somewhere easy to host and later move onto **a server Andrei is setting up**. Avoid lock-in to any one hosting vendor.

---

## 2. Users and personas

Three personas, at minimum:

| Persona | Role | Can do |
|---|---|---|
| **Lily** | Owner | Everything: pick, rate, tweak, check off groceries and prep steps, import weeks and recipes. Owner of the repo. Business background, not a software engineer — code should be readable and well commented, and setup steps should be explicit. |
| **Andrei** | Owner | Same permissions as Lily. |
| **Viewer** | Read-only placeholder | Sees everything (menu, picks, grocery list, prep plan, ratings, recipe bank) but can't change anything. All controls are hidden or disabled, with a small "Viewing only" badge. Useful for showing the app to someone, or for a future guest. |

Store personas in a table (not hard-coded) so more can be added later. No public sign-up. Everything must work comfortably on **mobile and desktop browsers**.

---

## 3. The weekly loop

| When | What happens | Screen |
|---|---|---|
| Sunday | A new week is created with **2–3 options for each of the four slots** (Lunch 1, Lunch 2, Dinner 1, Dinner 2). Nudge: "This week's menu is ready." | Pick |
| Sunday–Monday | Lily and Andrei each tap their pick for every slot. Disagreements are flagged so they can settle them. Once all four slots agree, the week is locked in. | Pick |
| After lock-in | The grocery list and the prep-day plan are generated for the four chosen recipes. | Shop, Cook |
| Shopping trip | Either person checks items off; the other sees it. | Shop |
| Cook day | They follow the sequenced plan, checking off steps. | Cook |
| Following Sunday | Debrief for last week's four meals: ratings, verdict, tweaks. Then the next week's menu. | Rate |

### Where options come from

Two sources, tagged on each card:

| Tag | Source | Notes |
|---|---|---|
| **New · AI pick** | Recipes suggested by AI for this week, never made before | Varied cuisines, with Chinese and Romanian dishes regularly in the mix. Take into account last week's "craving" answers, the season, and variety against recent weeks. |
| **Recipe bank** | Recipes they've made and rated well | See §7.5 for how favourites are chosen. |

Default mix per slot: **two new AI picks + one from the recipe bank**. Make this configurable, since the bank will be small at first and may deserve more slots later.

Earlier ideas that were **dropped**: drawing options from one specific newsletter or Substack; a "remix" option (someone else's recipe with a Chinese or Romanian twist); a soy-sauce counter (that was a joke).

### Recipe content and licensing

The repo is public. Don't copy recipe text from websites, books, or newsletters into the repo or seed data. For AI-suggested recipes, store **structured data** (ingredients, quantities, steps written in the app's own words) and, where a recipe is based on a specific published one, a **link to the source** rather than its text.

### Who populates the options (phase 1)

Initially Lily asks Claude to assemble each week's options, and they get loaded into the app through an admin/import screen or a JSON seed file. Generating options automatically is phase 3 (§11).

---

## 4. Screens

Mobile-first, with one clear job per screen. A bottom tab bar (Pick · Shop · Cook · Rate) on mobile and a top nav on desktop is a reasonable default.

### 4.1 Pick

- Week header: "Week of Oct 18".
- Four sections: Lunch 1, Lunch 2, Dinner 1, Dinner 2, each showing **portions it makes**.
- 2–3 **option cards** per slot. Each card shows:
  - Letter (A/B/C), source tag (**New · AI pick** or **Recipe bank**), recipe name.
  - Cuisine and time ("Chinese · 25 min"), plus a source link if there is one.
  - For recipe-bank cards: average rating, pick history ("picked 3 of 3"), last made ("4 wks ago").
  - If the recipe has a saved tweak: "With your tweak: less Sichuan peppercorn, extra tofu".
  - Optional photo.
- Each person taps their choice. Show both people's selections, such as initials on the chosen card.
- **Disagreement state:** if they picked different cards for a slot, highlight it ("You two disagree").
- When all four slots agree, show "Locked in → grocery list & prep plan".

### 4.2 Shop

- "You picked" summary: the four slots and recipes.
- Shopping list **grouped by aisle**, in a fixed shopping order (§7.4).
- **Duplicates added up:** onions from three recipes become one line, "Onion · 4".
- Each row: checkbox, ingredient, total quantity + unit, optional "where to buy" note (such as "H Mart" or "Romanian/Polish deli").
- **Pantry staples last**, in a separate "Pantry check" group: things they probably have already.
- Checkbox state is shared between both users.
- Link to the prep-day plan.

### 4.3 Cook — the prep-day plan (core feature)

One timeline that interleaves all four recipes:

- Header stats: total time, oven temperature and time in use, burners needed.
- Ordered steps, each with:
  - **Clock time** from the start (0:00, 0:15 …).
  - **What to do**, in plain language.
  - **Equipment tag**: Oven · Burner 1 · Burner 2 · Kettle · Hands (no heat).
  - **Which recipe(s)** the step is for.
  - Optional **"why" note** ("Passive window: the best time for the no-heat recipe", "Your tweak: 10-minute head start").
- Steps that happen at the same time share a clock time.
- Checkable steps; nice to have: timers ("ciorbă simmer: 30 min") with a nudge when they're up.
- Saved tweaks are applied inside the plan (if a tweak says "roast potatoes 10 min before everything else", the plan does that).

See §8 for the sequencing rules.

### 4.4 Rate (debrief)

For each of last week's four meals:

- Recipe name, slot and source tag.
- **Lily's rating** and **Andrei's rating**, 1–5 each.
- **Make again?** Again / Tweak / Never.
- **If Tweak:** a text box, "What should change next time?" Tweak must capture *what* to change.
- If the recipe already had a tweak applied, show "Already includes your tweak from Oct 11: …".

Then two closing questions:

1. Best meal of the week? (pick one of the four)
2. Anything you're craving for next week? (free text — feeds the next week's AI picks)

Footer stats (nice to have): recipes rated so far, recipes in the bank, most-picked recipe.

### 4.5 Recipe bank (nice to have)

Browse all recipes with filters (cuisine, lunch/dinner, rating, verdict, times made).

---

## 5. Nudges (emails / notifications)

Emails are **short nudges with a button into the app**, not forms. Each nudge's button is the **app link**, deep-linked to the right screen (Pick, Shop, Cook or Rate), which then goes through the sign-in in §10. Mockups exist for each (see §9).

| Nudge | When | Content |
|---|---|---|
| Menu ready | Sunday | "This week's menu is ready" + "Pick your lineup" |
| Grocery list ready | When picks lock | "Your grocery list is ready (26 items)" + link to prep plan |
| Prep-day plan | When picks lock, or the morning of cook day | "Your Sunday cook plan: about 1 hr 35 min" + "Open the plan" |
| Debrief | Following Sunday | "How was last week's prep?" + "Rate last week" |

**Hard rule (from Lily):** nothing is ever sent on Lily's behalf (email, text, message, invitation) without her explicit permission. An automated sender should send *from the app* (a no-reply address), only to Lily and Andrei, and only after Lily turns it on deliberately. In phase 1, nudges can be manual, or Gmail drafts that Lily sends herself.

---

## 6. Recipe bank: how it grows

- A recipe enters the app as a **new AI pick** (or one they add themselves).
- Once it has been made and rated, it becomes part of their history.
- It's **eligible to be offered from the recipe bank** when it meets the §7.5 rule (rated highly, not made recently).
- **Never** removes it from future suggestions.
- **Tweaks** refine it over time (§7.3).

---

## 7. Data model

First designed as a spreadsheet (`docs/Meal Prep System.xlsx`, kept for reference and sample data); it translates directly into tables. Two months of trial use is roughly 8 weeks × 4 slots × 3 options ≈ 100 offers, maybe 60 recipes and 600 ingredient lines, which is tiny. Design for years anyway.

### 7.1 Tables

**personas** (users) — `id`, `name` ("Lily", "Andrei", "Viewer"), `role` (`owner` · `viewer`), `email` (optional; for nudges; from env/config, not seed data). Picks, ratings and checks reference a persona id; viewers can't create them.

**recipes** — one row per recipe, ever
| column | notes |
|---|---|
| id | |
| name | |
| origin | `ai` (suggested by AI) · `own` (added by Lily/Andrei, such as a family recipe) |
| source_url | optional link if based on a published recipe |
| meal_type | `lunch` · `dinner` · `either` |
| cuisine | Chinese, Romanian, American, Italian, Mexican, Korean, Japanese, Mediterranean, Other |
| servings | portions per batch |
| total_minutes | |
| image_url | optional |
| status | `active` · `retired` |
| added_on | |
| notes | |

The card tag is **derived**: never made → "New · AI pick"; offered from the bank → "Recipe bank".

**ingredient_catalog** — every ingredient once, with one spelling and one unit
| column | notes |
|---|---|
| id | |
| name | "Soy sauce", "Lovage (leuștean)" |
| aisle | see §7.4 |
| unit | the single unit used everywhere for this ingredient (`each`, `lb`, `cup`, `tbsp`, `clove`, `bunch`, `to taste`) |
| pantry_staple | boolean |
| where_to_buy | optional note |

> **Why a catalog?** It's what makes the grocery list add up. If one recipe says "onion" and another says "onions", or one uses grams and another cups, totals break. Every recipe ingredient points at a catalog entry and uses its unit.

**recipe_ingredients** — `recipe_id`, `ingredient_id`, `quantity` (per batch in the catalog's unit; null = "to taste"), `prep_note` ("minced")

**recipe_steps** — structured steps, needed for the prep-day plan
| column | notes |
|---|---|
| recipe_id, step_order | |
| instruction | in the app's own words |
| equipment | `oven` · `stovetop` · `kettle` · `none` (hands only) |
| oven_temp_f | when equipment = oven |
| active_minutes | hands-on time |
| passive_minutes | unattended time (roasting, simmering, resting) |
| depends_on_step | optional — must finish before this one starts |
| can_batch_with | optional tag, such as `chop_onion`, so prep across recipes can be grouped |

**weeks** — `id`, `week_of` (Sunday date), `status` (`picking` · `locked` · `done`), `craving_notes`

**offers** — every option offered, every week (including unpicked ones, which is what makes pick rate meaningful)
| column | notes |
|---|---|
| id, week_id | |
| slot | `lunch_1` · `lunch_2` · `dinner_1` · `dinner_2` |
| letter | A / B / C |
| recipe_id | |
| from_bank | boolean — offered as a recipe-bank favourite vs a new pick |
| is_final_pick | true for the agreed choice |

**picks** — `week_id`, `slot`, `user_id` (unique together), `offer_id`

**ratings** — per person per picked meal
| column | notes |
|---|---|
| offer_id, user_id | unique together |
| stars | 1–5 |
| verdict | `again` · `tweak` · `never` |
| tweak_text | required when verdict = tweak |
| notes | |
| created_at | |

**prep_plans** — `week_id`, `generated_at`, and ordered **prep_plan_steps**: `clock_minute`, `instruction`, `equipment_lane` (oven/burner_1/burner_2/kettle/hands), `recipe_ids`, `why_note`, `checked_by`, `checked_at`. Store the generated plan so it can be edited or regenerated.

**grocery_checks** — `week_id`, `ingredient_id`, `checked_by`, `checked_at`

**best_meal votes** — per person per week.

### 7.2 Derived values (compute in queries)

Per recipe: `times_offered`, `times_picked` (also how often they choose it again, which Lily specifically wants), `pick_rate`, `avg_rating`, `last_made`, `weeks_since_made`, `latest_tweak`.

### 7.3 Tweak lifecycle

1. A meal is rated **Tweak** with what to change.
2. The tweak attaches to the recipe (`latest_tweak`).
3. Next time it's offered, the card shows "With your tweak: …", and the prep plan applies it.
4. If the tweaked version is later rated **Again**, the tweak becomes part of the **house version**. Consider a `recipe_tweaks` table with `status: proposed | adopted`.
5. **Never** retires the recipe from suggestions (decide whether one person's Never is enough, or both are needed).

### 7.4 Grocery list rules

- Input: the four final-pick recipes for the week.
- Join `recipe_ingredients` → `ingredient_catalog`, **sum quantity by ingredient**.
- A recipe picked twice in one week counts twice.
- "To taste" items still appear, with no number.
- Sort: non-pantry first by aisle order, then pantry staples by aisle order.
- Aisle order: Produce, Meat & Fish, Dairy & Eggs, Tofu & Refrigerated, Bakery, Frozen, Grains & Noodles, Canned & Jarred, Asian Pantry, Eastern European, Spices, Oils & Vinegars, Baking, Other.

### 7.5 Recipe-bank selection

Suggested rule (tune later): `avg_rating ≥ 4`, not retired, a strong pick rate, and `weeks_since_made ≥ 3`, so favourites **rotate** instead of repeating. Match meal_type to the slot.

---

## 8. Prep-day sequencing rules

The plan generator (rules-based, AI-assisted, or both; the start can be AI-generated from the structured steps and then validated) should:

1. **Preheat first:** if anything uses the oven, the first step turns it on.
2. **Batch prep:** group identical chopping across recipes (all onions at once), then split into bowls by recipe.
3. **Longest passive items start earliest:** braises, soups and roasts go on as early as possible.
4. **Fill passive windows with active work:** chop, mix, make dressings, and assemble no-heat recipes while things roast or simmer.
5. **Respect equipment limits:** one oven (one temperature at a time; flag a conflict if recipes need different temperatures and suggest a compromise or an order), a configurable number of burners (default 2), plus a kettle.
6. **Respect dependencies:** a step that needs another step finished waits for it.
7. **Apply saved tweaks:** a tweak that changes timing or order shows up in the plan, with a "why" note.
8. **Finish with cooling and packing:** let hot food cool before it's sealed; pack and label lunches vs dinners.
9. **Explain itself:** short "why" notes on non-obvious ordering.

Kitchen settings (number of burners, oven count, rice cooker yes/no) should be configurable.

---

## 9. Design direction

Mockups exist as a Claude design canvas ("Meal Prep Emails") with four artboards: menu, grocery list, debrief, prep-day plan. Carry the look into the app:

- **Feel:** warm and friendly, food-magazine rather than dashboard. No emoji; simple line icons.
- **Type:** Bricolage Grotesque (headings, bold), Figtree (body), both from Google Fonts.
- **Colors:**
  - Background `#F4F2EE`, surface `#FBFAF7`, cards `#FFFFFF`, borders `#E3DDD3`
  - Ink `#1F2421`, secondary text `#5C615D`
  - Accent (paprika) `#9A3A17`
  - Tags: New · AI pick `#E8EEF7` / `#1F4170`; Recipe bank `#F7E7DD` / `#8A3414`
  - Equipment tags: Oven `#F7E7DD` / `#8A3414`; Burner `#E8EEF7` / `#1F4170`; Hands/Kettle `#EEF3E6` / `#3C5520`
  - Dark callout panels `#1F2421` with light text; pill buttons ≥ 44px tall
- Rounded cards (12px), generous spacing, phone width first.
- Accessible: real buttons and inputs, labels, sufficient contrast.

---

## 10. Technical direction (stack confirmed Oct 17, 2026 — see §14)

Goals: easy for Lily to run and understand, cheap or free to host now, **easy to move onto Andrei's server later**.

- **Frontend:** a simple, mobile-first web UI. A lightweight framework (such as SvelteKit or Next.js) or plain HTML + a small JS framework is fine. Pick whatever keeps the code most readable.
- **Backend + DB:** a small server with **SQLite** (single file, zero setup, portable) or **Postgres** if Andrei's server will run one. Versioned migrations in the repo.
- **Packaging:** `Dockerfile` + `docker-compose.yml`, so moving to Andrei's server is "copy and run".
- **Hosting now:** any service that runs a container (Fly.io, Railway, Render). **GitHub Pages alone isn't enough**, since it only serves static files and this app stores shared data.
- **Sign-in (decided; updated Oct 19, 2026, see §14):** viewing needs no passcode; owners sign in with the owner passcode + persona picker. The original two-passcode design below is kept for history.
  1. The nudge email contains the app link (deep-linked to the right screen).
  2. Opening it shows a simple sign-in screen: a **passcode** field and a **"Who are you?" dropdown**.
  3. **Owner passcode** (shared by Lily and Andrei): unlocks the Lily and Andrei personas (the dropdown can also offer Viewer, for previewing what a viewer sees).
  4. **Viewer passcode**: unlocks **only** the Viewer persona. The dropdown shows just "Viewer" (or is skipped). It can never sign in as Lily or Andrei.
  5. A successful sign-in is remembered on that device (a long-lived session cookie), so they rarely see this screen again. Include a "Switch person" option in the menu; switching to an owner persona from a viewer session asks for the owner passcode.
  6. Viewer access is read-only, enforced **on the server**, not just by hiding buttons.
  - Store both passcodes in environment variables (`OWNER_PASSCODE`, `VIEWER_PASSCODE`), compared as hashes, never in the repo. Rate-limit attempts. Changing one passcode should sign out sessions created with it.
  - Remaining trade-off: Lily and Andrei share one passcode, so either can pick the other's persona. Fine for a household app; a per-person PIN can be added later.
- **AI features** (option suggestions, prep-plan generation): call an LLM API from the server, with the API key in env vars. Keep prompts in versioned files. Phase 1 can skip this and import JSON.
- **Real-time:** nice for the shared checklist; refresh-on-focus is fine for v1.
- **Config:** secrets and personal emails in environment variables, never committed. Provide `.env.example`.

Open question for Andrei: what will his server run (Docker? which OS? a database already?)?

---

## 11. Phases

**Phase 1 — MVP**
- Repo setup, README, MIT license, schema + migrations, seed with §12 sample data and the three personas.
- Sign-in: app link + passcode + persona dropdown; owner passcode for Lily/Andrei, separate viewer passcode for Viewer only (read-only, server-enforced).
- Pick screen with both users' selections and disagreement state.
- Shop screen with aggregated, aisle-sorted list and shared checkboxes.
- Cook screen showing a prep plan imported as JSON (hand- or Claude-generated), with checkable steps.
- Rate screen with stars, verdict, tweak box, best meal, cravings.
- Admin/import page (or JSON import) for a week's options, recipes, ingredients and steps.
- Deployed to a temporary host; works on both phones.

**Phase 2 — Smarter system**
- Recipe bank view with stats.
- Tweak lifecycle with house versions.
- Recipe-bank auto-selection (§7.5).
- Prep-plan generator following §8, with timers.
- Opt-in email nudges (§5).

**Phase 3 — Automation**
- ~~Weekly job that drafts next week's menu~~ (done early as an on-demand Generate button, Oct 17, 2026; see §14): new AI picks (using cravings, variety and cuisine balance) plus recipe-bank favourites. It lands as a **draft week** that Lily approves before it goes live.
- Ingredient and step structuring for new recipes, mapped onto the catalog, with review for new catalog entries.
- Move to Andrei's server.

---

## 12. Sample data (for seeding and tests)

Week of **2026-10-18** (generic dishes; write the steps in the app's own words):

| Slot | A (New · AI pick) | B (New · AI pick) | C (Recipe bank) | Picked |
|---|---|---|---|---|
| Lunch 1 | Chicken burrito bowls (Mexican) | Cold sesame noodles with smashed cucumber (Chinese) | Tomato egg fried rice | B |
| Lunch 2 | Greek chicken orzo (Mediterranean) | Gochujang pork rice bowls (Korean) | Ciorbă de perișoare (Romanian) | C |
| Dinner 1 | Sheet-pan sausage, peppers & potatoes (American) | Red-braised pork belly / hong shao rou (Chinese) | Mapo tofu with rice | A |
| Dinner 2 | Turkey meatballs with marinara (Italian) | Chicken papricaș with mămăligă (Romanian) | Tomato egg stir-fry | B |

Prior week (2026-10-11): Ciorbă de perișoare rated 4 (Lily) / 5 (Andrei), Tweak: "Extra lovage, more borș". Tomato egg stir-fry rated 5 / 4, Again.

**Expected grocery list** for the 10-18 picks (26 items — a good test):

| Ingredient | Total | Aisle | Pantry |
|---|---|---|---|
| Onion | 4 (1 ciorbă + 1 sheet-pan + 2 papricaș) | Produce | |
| Bell pepper | 4 (3 + 1) | Produce | |
| Garlic | 7 cloves (3 noodles + 4 sheet-pan) | Produce | |
| Baby potatoes | 1.5 lb | Produce | |
| Cucumber | 2 | Produce | |
| Carrot | 2 | Produce | |
| Scallions | 1 bunch | Produce | |
| Lovage (leuștean) | 1 bunch | Produce | |
| Chicken thighs | 2 lb | Meat & Fish | |
| Italian sausage | 1.5 lb | Meat & Fish | |
| Ground pork | 1 lb | Meat & Fish | |
| Sour cream | 2 cups (1 + 1) | Dairy & Eggs | |
| Egg | 1 | Dairy & Eggs | |
| Wheat noodles | 1 lb | Grains & Noodles | |
| Borș | 2 cups | Eastern European | |
| Rice, cornmeal (mălai), tomato paste, Chinese sesame paste, soy sauce, Chinkiang black vinegar, chili oil, sweet paprika, olive oil, flour, salt | per recipe | various | ✓ |

Per-recipe ingredient lists are in the `Ingredients` tab of the spreadsheet.

**Expected prep-day plan** for the same picks (about 1 hr 35 min, oven at 425°F, 2 burners + kettle), matching the prep-plan mockup:

| Time | Lane | Step |
|---|---|---|
| 0:00 | Oven + Hands | Preheat to 425°F. Batch-chop 4 onions, 4 peppers, 7 garlic cloves, 2 carrots; split by recipe |
| 0:15 | Oven | Potatoes in alone (tweak: 10-min head start) |
| 0:15 | Burner 1 | Ciorbă broth: onion, carrot, tomato paste, bring to a simmer |
| 0:20 | Hands | Mix and roll meatballs (pork, rice, egg) |
| 0:25 | Oven | Sausage, peppers, onion join; roast 30 min |
| 0:25 | Burner 1 | Meatballs into broth; simmer 30 min |
| 0:30 | Burner 2 | Brown chicken, then onion, paprika, pepper; braise 35 min |
| 0:40 | Hands | Sesame dressing, smash cucumbers, slice scallions; wash up |
| 0:55 | Oven off / Burner 1 | Sheet pan out to cool; finish ciorbă with borș and lovage |
| 1:00 | Kettle + Burner 1 | Boil noodles, rinse, toss; start mămăligă (20 min, stirring) |
| 1:10 | Burner 2 | Papricaș off heat; stir in flour-thickened sour cream |
| 1:25 | Hands | Pack and label 4 lunches + 4 dinners; done ~1:35 |

---

## 13. Out of scope (for now)

- Nutrition tracking, calories, macros.
- Grocery delivery integrations or price comparison.
- More than two owner personas plus viewers (the personas table allows it later, but the UI only needs to handle Lily, Andrei and Viewer now).
- Native iOS/Android apps (mobile web is enough; "Add to Home Screen" support is a nice touch).

---

## 14. Decisions log

| Decision | Rationale |
|---|---|
| 2 lunches + 2 dinners per week, 2–3 options per slot | Matches how they actually prep |
| Options = new AI picks + recipe-bank favourites (default 2 + 1) | Variety plus proven winners; no dependence on any one publisher |
| Don't copy recipe text from other sources into the public repo; link instead | Content isn't theirs to license |
| Sequenced prep-day plan is a core feature | Efficient choreography is what they value most in good meal-prep guides |
| Log every offer, not just picks | Enables pick rate and repeat tracking |
| Single ingredient catalog with one unit per ingredient | Makes grocery totals add up |
| Grocery list includes pantry staples, shown last | They cross off what they have |
| Tweak verdict requires "what to change"; carried into future cards and prep plans | Tweaks were otherwise lost |
| Web app instead of email replies; emails are just nudges | Replying in a fixed format is boring |
| Build in GitHub with Claude Code; MIT license | Future move to Andrei's server |
| Sign-in = emailed app link + passcode + persona dropdown; one owner passcode (Lily + Andrei), one viewer-only passcode | Simple, no accounts to manage; the viewer passcode can be shared without giving edit access |
| Three personas: Lily, Andrei, Viewer (read-only) | A safe way to show the app to others; room to add more later |
| Never send anything on Lily's behalf without explicit permission | Lily's standing rule |
| Stack: SvelteKit 3 (screens + server in one project) + SQLite via Node's built-in `node:sqlite`, packaged with Docker | Most readable for a non-engineer; no database server to install; portable to Andrei's server. Confirmed Oct 17, 2026 |
| Own small server, not a hosted backend (Supabase/Firebase) | Shared data and server-enforced viewer rules need a server; avoids vendor lock-in |
| Two environments only: dev (Lily's Mac, sample data) and live. No staging | Household app; the rule is just that they never share a database |
| The three personas are created by a migration (`002_default_personas.sql`), not the sample-data seed | Every database, including the live one, needs them to sign in |
| Claude writes next week's menu when an owner clicks "Generate next week's menu" (moved up from phase 3); no import page, no fixed schedule | Lily wants new recipes delivered to the app without copy-pasting, on demand rather than on a timer. Decided Oct 17, 2026 |
| The menu lands as a draft that an owner reviews (swap any option, approve, or discard) before it opens for picking | Matches §11's "draft week that Lily approves"; drafts are hidden from viewers |
| Claude writes the prep-day plan automatically when the picks lock in; rewritten if the picks change | Replaces importing plans by hand |
| Claude is called from the app's server (Claude API, Opus 5.5, structured outputs); prompts live in `prompts/` | Keeps everything in one portable app; no separate scheduler service |
| Recipe-bank favourites are chosen by the app (avg ≥ 4, picked ≥ half the times offered, not made in 3 weeks); Claude fills any gap | Rule from §7.5; Claude only writes new recipes |
| One person's "Never" is enough to stop suggesting a recipe | Resolves the open question in §7.3 |
| Rate shows the most recent locked-in week whose Sunday has arrived (updated Oct 23, 2026; was "most recent finished week") | Rate the week you're cooking before asking for the next menu, so Claude learns from its ratings, tweaks and cravings |
| Every Claude request is logged with token use; an answer that can't be saved is reused on retry | Cost visibility; never pay twice for one answer |
| No viewer passcode: anyone with the link can view read-only without signing in; only owners sign in (owner passcode) | Lily's call (Oct 19, 2026): fine to show the app freely as long as visitors can't change anything or see internal data. Supersedes the two-passcode design in §10; changes still server-enforced; drafts, Claude logs and settings stay owner-only; noindex for search engines |
| Recipe bank page (read-only, Bank tab) and a "Keep screen on" switch on Cook (Screen Wake Lock) | Lily and Andrei's requests, Oct 21, 2026 |
| Recipes found online are added as "Saved to try" (not favourites) from `scripts/saved-recipes.json` via `npm run recipes:load`; menus offer up to one per matching slot until cooked | They haven't tried them yet; ratings decide if they become favourites |
| Every recipe from a creator carries `source_credit` + link, shown on cards and bank pages; the app stores its own wording, never the creator's text | Credit creators; public repo |
| Models per job: Sonnet 5.5 for menus and swaps, Opus 5.5 for the cook-day plan; grocery list stays rule-based (no Claude) | Balance cost and quality (Oct 23, 2026): recipe writing is fine on Sonnet at half the price; sequencing is the core feature and one small request a week |
| Plans are stored per set of picks and reused if the picks return to that set; automatic rewrites capped at 3 a week, then an owner taps "Write the plan" | Generate once, store until the next selection; never pay twice; flipping picks can't run up a bill |
| "Write next week's menu" lives in a Next week card at the bottom of Pick (owners only), not the profile menu; it's offered only once the current week is locked in, with a nudge to rate first | Easier to find; stops menus stacking up weeks ahead; ratings feed the next menu |
| While a new week is still being picked, Shop and Cook keep showing the last locked-in week | Approving next week's menu early mustn't hide this week's grocery list and plan |

