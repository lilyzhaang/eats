-- 007: Crediting recipe creators, and recipes saved to try.
--
-- source_credit: who created the recipe ("Hot Thai Kitchen (Pailin
-- Chongchitnant)"). Shown with a link to the original wherever the recipe
-- appears. The app stores its own wording of ingredients and steps, never
-- the creator's text.
--
-- to_try: Lily and Andrei found it and want to cook it, but haven't yet.
-- Weekly menus offer saved recipes as options until they've been made;
-- after that, ratings decide whether they become favourites.
ALTER TABLE recipes ADD COLUMN source_credit TEXT;
ALTER TABLE recipes ADD COLUMN to_try INTEGER NOT NULL DEFAULT 0 CHECK (to_try IN (0, 1));
