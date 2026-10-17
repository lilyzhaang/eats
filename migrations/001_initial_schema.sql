-- 001: Initial schema for Eats.
--
-- Mirrors §7 of CLAUDE.md (which grew out of docs/Meal Prep System.xlsx).
-- Migrations run in filename order and each one runs exactly once.
-- Never edit a migration that has already run on a real database —
-- add a new numbered file instead.

-- ── People ──────────────────────────────────────────────────────────────

-- Who can sign in. Owners can change things; viewers can only look.
CREATE TABLE personas (
  id          INTEGER PRIMARY KEY,
  name        TEXT    NOT NULL UNIQUE,           -- "Lily", "Andrei", "Viewer"
  initials    TEXT    NOT NULL,                  -- shown on picked cards: "L", "A"
  role        TEXT    NOT NULL CHECK (role IN ('owner', 'viewer')),
  email       TEXT,                              -- optional, for nudges; set from env, never seeded
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- One row per signed-in device. The cookie holds a random token;
-- we only store a hash of it, so a leaked database can't be used to sign in.
CREATE TABLE sessions (
  token_hash            TEXT    PRIMARY KEY,
  persona_id            INTEGER NOT NULL REFERENCES personas(id),
  passcode_kind         TEXT    NOT NULL CHECK (passcode_kind IN ('owner', 'viewer')),
  -- A fingerprint of the passcode used to sign in. If the passcode is changed,
  -- the fingerprint no longer matches and the session stops working.
  passcode_fingerprint  TEXT    NOT NULL,
  created_at            TEXT    NOT NULL DEFAULT (datetime('now')),
  expires_at            TEXT    NOT NULL
);

-- ── Recipes and ingredients ─────────────────────────────────────────────

-- Every recipe ever offered, one row each.
CREATE TABLE recipes (
  id             INTEGER PRIMARY KEY,
  name           TEXT    NOT NULL,
  origin         TEXT    NOT NULL CHECK (origin IN ('ai', 'own')),
  source_url     TEXT,                           -- link to a published recipe, never its text
  meal_type      TEXT    NOT NULL CHECK (meal_type IN ('lunch', 'dinner', 'either')),
  cuisine        TEXT    NOT NULL,
  servings       INTEGER,                        -- portions per batch
  total_minutes  INTEGER,
  image_url      TEXT,
  status         TEXT    NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'retired')),
  added_on       TEXT    NOT NULL DEFAULT (date('now')),
  notes          TEXT
);

-- Aisles in the order you walk the store. The grocery list sorts by this.
CREATE TABLE aisles (
  name        TEXT    PRIMARY KEY,
  sort_order  INTEGER NOT NULL UNIQUE
);

-- Every ingredient once, with one spelling and one unit.
-- This is what lets the grocery list add up "onion" from three recipes.
CREATE TABLE ingredient_catalog (
  id             INTEGER PRIMARY KEY,
  name           TEXT    NOT NULL UNIQUE,
  aisle          TEXT    NOT NULL REFERENCES aisles(name),
  unit           TEXT    NOT NULL,               -- each, lb, cup, tbsp, clove, bunch, to taste
  pantry_staple  INTEGER NOT NULL DEFAULT 0 CHECK (pantry_staple IN (0, 1)),
  where_to_buy   TEXT                            -- "H Mart", "Romanian/Polish deli"
);

-- What goes into each recipe. Quantity is per batch, in the catalog's unit.
CREATE TABLE recipe_ingredients (
  id             INTEGER PRIMARY KEY,
  recipe_id      INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id  INTEGER NOT NULL REFERENCES ingredient_catalog(id),
  quantity       REAL,                           -- NULL means "to taste"
  prep_note      TEXT,                           -- "minced", "smashed"
  UNIQUE (recipe_id, ingredient_id)
);

-- Structured steps, used later to generate prep-day plans (§8).
CREATE TABLE recipe_steps (
  id               INTEGER PRIMARY KEY,
  recipe_id        INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  step_order       INTEGER NOT NULL,
  instruction      TEXT    NOT NULL,             -- in the app's own words
  equipment        TEXT    NOT NULL CHECK (equipment IN ('oven', 'stovetop', 'kettle', 'none')),
  oven_temp_f      INTEGER,
  active_minutes   INTEGER NOT NULL DEFAULT 0,   -- hands-on time
  passive_minutes  INTEGER NOT NULL DEFAULT 0,   -- unattended time
  depends_on_step  INTEGER,                      -- step_order that must finish first
  can_batch_with   TEXT,                         -- e.g. "chop_onion"
  UNIQUE (recipe_id, step_order)
);

-- ── The weekly loop ─────────────────────────────────────────────────────

CREATE TABLE weeks (
  id             INTEGER PRIMARY KEY,
  week_of        TEXT    NOT NULL UNIQUE,        -- the Sunday, as YYYY-MM-DD
  status         TEXT    NOT NULL DEFAULT 'picking' CHECK (status IN ('picking', 'locked', 'done')),
  craving_notes  TEXT
);

-- Every option offered, every week — including the ones nobody picked.
-- Logging the unpicked ones is what makes "pick rate" meaningful.
CREATE TABLE offers (
  id             INTEGER PRIMARY KEY,
  week_id        INTEGER NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  slot           TEXT    NOT NULL CHECK (slot IN ('lunch_1', 'lunch_2', 'dinner_1', 'dinner_2')),
  letter         TEXT    NOT NULL CHECK (letter IN ('A', 'B', 'C', 'D')),
  recipe_id      INTEGER NOT NULL REFERENCES recipes(id),
  from_bank      INTEGER NOT NULL DEFAULT 0 CHECK (from_bank IN (0, 1)),
  is_final_pick  INTEGER NOT NULL DEFAULT 0 CHECK (is_final_pick IN (0, 1)),
  UNIQUE (week_id, slot, letter)
);

-- Each person's current choice for each slot. Changing your mind updates the row.
CREATE TABLE picks (
  id          INTEGER PRIMARY KEY,
  week_id     INTEGER NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  slot        TEXT    NOT NULL,
  persona_id  INTEGER NOT NULL REFERENCES personas(id),
  offer_id    INTEGER NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (week_id, slot, persona_id)
);

-- The debrief: one rating per person per meal they ate.
CREATE TABLE ratings (
  id          INTEGER PRIMARY KEY,
  offer_id    INTEGER NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  persona_id  INTEGER NOT NULL REFERENCES personas(id),
  stars       INTEGER CHECK (stars BETWEEN 1 AND 5),
  verdict     TEXT    CHECK (verdict IN ('again', 'tweak', 'never')),
  tweak_text  TEXT,
  notes       TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (offer_id, persona_id),
  -- A "Tweak" verdict must say what to change, or the tweak gets lost.
  CHECK (verdict IS NOT 'tweak' OR length(trim(coalesce(tweak_text, ''))) > 0)
);

-- "Best meal of the week?" — one vote per person per week.
CREATE TABLE best_meal_votes (
  id          INTEGER PRIMARY KEY,
  week_id     INTEGER NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  persona_id  INTEGER NOT NULL REFERENCES personas(id),
  offer_id    INTEGER NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  UNIQUE (week_id, persona_id)
);

-- Shared grocery checkboxes. A row exists = the item is checked off.
CREATE TABLE grocery_checks (
  week_id        INTEGER NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  ingredient_id  INTEGER NOT NULL REFERENCES ingredient_catalog(id),
  checked_by     INTEGER NOT NULL REFERENCES personas(id),
  checked_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (week_id, ingredient_id)
);

-- ── Prep-day plan ───────────────────────────────────────────────────────

-- The cook-day timeline for a week. Stored (not recalculated each time)
-- so it can be imported, edited or regenerated.
CREATE TABLE prep_plans (
  id             INTEGER PRIMARY KEY,
  week_id        INTEGER NOT NULL UNIQUE REFERENCES weeks(id) ON DELETE CASCADE,
  generated_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  total_minutes  INTEGER,
  oven_temp_f    INTEGER,
  oven_minutes   INTEGER,
  burners        INTEGER,
  uses_kettle    INTEGER NOT NULL DEFAULT 0 CHECK (uses_kettle IN (0, 1))
);

CREATE TABLE prep_plan_steps (
  id               INTEGER PRIMARY KEY,
  plan_id          INTEGER NOT NULL REFERENCES prep_plans(id) ON DELETE CASCADE,
  step_order       INTEGER NOT NULL,
  clock_minute     INTEGER NOT NULL,             -- minutes from the start: 0, 15, 25…
  instruction      TEXT    NOT NULL,
  -- One or more lanes, comma-separated: oven,burner_1,burner_2,kettle,hands
  equipment_lanes  TEXT    NOT NULL,
  recipe_label     TEXT,                         -- "Ciorbă", "All recipes"
  why_note         TEXT,
  checked_by       INTEGER REFERENCES personas(id),
  checked_at       TEXT,
  UNIQUE (plan_id, step_order)
);

-- Which recipes each plan step is for (a step can serve several).
CREATE TABLE prep_plan_step_recipes (
  step_id    INTEGER NOT NULL REFERENCES prep_plan_steps(id) ON DELETE CASCADE,
  recipe_id  INTEGER NOT NULL REFERENCES recipes(id),
  PRIMARY KEY (step_id, recipe_id)
);

-- ── Settings ────────────────────────────────────────────────────────────

-- Small knobs that might change: kitchen equipment, how many options per slot.
CREATE TABLE settings (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL,
  note   TEXT
);

INSERT INTO settings (key, value, note) VALUES
  ('burners',            '2', 'Number of stovetop burners'),
  ('ovens',              '1', 'Number of ovens'),
  ('has_kettle',         '1', '1 = yes, 0 = no'),
  ('has_rice_cooker',    '0', '1 = yes, 0 = no'),
  ('ai_options_per_slot',   '2', 'New AI picks offered per slot'),
  ('bank_options_per_slot', '1', 'Recipe-bank favourites offered per slot');

INSERT INTO aisles (name, sort_order) VALUES
  ('Produce', 1), ('Meat & Fish', 2), ('Dairy & Eggs', 3), ('Tofu & Refrigerated', 4),
  ('Bakery', 5), ('Frozen', 6), ('Grains & Noodles', 7), ('Canned & Jarred', 8),
  ('Asian Pantry', 9), ('Eastern European', 10), ('Spices', 11), ('Oils & Vinegars', 12),
  ('Baking', 13), ('Other', 14);
