-- 003: Claude writes the weekly menu and the prep-day plan.
--
-- Every Saturday morning the app asks Claude for next week's options. They
-- arrive as a *draft* week that Lily or Andrei reviews and approves before
-- it opens for picking. When the picks lock in, Claude writes the prep plan.

-- A draft week is only visible to owners on the review page until approved.
ALTER TABLE weeks ADD COLUMN is_draft INTEGER NOT NULL DEFAULT 0 CHECK (is_draft IN (0, 1));

-- Which recipes a prep plan was written for (sorted ids, comma-separated).
-- If the picks change, the plan no longer matches and gets rewritten.
-- NULL means the plan was imported by hand and is kept as is.
ALTER TABLE prep_plans ADD COLUMN for_recipe_ids TEXT;

-- A log of every request to Claude: what it was for, whether it worked,
-- and how many tokens it used (which is what the API bills by).
CREATE TABLE ai_runs (
  id             INTEGER PRIMARY KEY,
  kind           TEXT    NOT NULL CHECK (kind IN ('menu', 'swap', 'prep_plan')),
  week_of        TEXT    NOT NULL,
  triggered_by   TEXT    NOT NULL CHECK (triggered_by IN ('schedule', 'owner', 'lock_in')),
  status         TEXT    NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'succeeded', 'failed')),
  model          TEXT,
  input_tokens   INTEGER,
  output_tokens  INTEGER,
  error          TEXT,
  started_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  finished_at    TEXT
);
CREATE INDEX ai_runs_by_week ON ai_runs (week_of, kind);

-- When the weekly menu arrives.
INSERT INTO settings (key, value, note) VALUES
  ('menu_day',      'saturday',         'Day of the week the new menu arrives'),
  ('menu_time',     '09:00',            'Time it arrives (24-hour clock)'),
  ('menu_timezone', 'America/New_York', 'Time zone for menu_day and menu_time');
