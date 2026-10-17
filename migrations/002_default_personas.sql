-- 002: The three starting personas.
--
-- These are part of the app itself (not sample data), so every database,
-- including the live one, starts with them. More can be added later with
-- a new migration. Emails are left blank on purpose: they come from
-- environment settings, never from the repo.

INSERT INTO personas (name, initials, role, sort_order) VALUES
  ('Lily',   'L', 'owner',  1),
  ('Andrei', 'A', 'owner',  2),
  ('Viewer', 'V', 'viewer', 3);
