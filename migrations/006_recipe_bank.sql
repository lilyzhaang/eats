-- 006: Recipes Lily and Andrei add to the bank themselves.
--
-- Most recipes earn a place in the recipe bank by being cooked and rated
-- well. Ones they already know and love (found online, family recipes) are
-- added straight in: in_bank = 1 makes them favourites from day one, so they
-- show on the Recipe bank page and can be offered in weekly menus.
ALTER TABLE recipes ADD COLUMN in_bank INTEGER NOT NULL DEFAULT 0 CHECK (in_bank IN (0, 1));
