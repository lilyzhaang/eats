-- 005: No Saturday schedule. Menus are written when an owner clicks
-- "Generate next week's menu". The time zone setting stays: it decides
-- which week counts as "next week".

DELETE FROM settings WHERE key IN ('menu_day', 'menu_time');
UPDATE settings SET note = 'Time zone for working out which week is next' WHERE key = 'menu_timezone';
