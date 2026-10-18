-- 004: Claude's note about each week, and keeping Claude's answers.

-- Claude's short note about the shape of the week, shown when reviewing it.
CREATE TABLE week_notes (
  week_id  INTEGER PRIMARY KEY REFERENCES weeks(id) ON DELETE CASCADE,
  note     TEXT    NOT NULL
);

-- Claude's answer, kept as soon as it arrives. If saving it into the app
-- fails, trying again reuses this answer instead of paying for a new one.
ALTER TABLE ai_runs ADD COLUMN result_json TEXT;
