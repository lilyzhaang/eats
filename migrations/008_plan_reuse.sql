-- 008: Never pay twice for the same cook-day plan.
--
-- for_key records which recipes a Claude answer was for (sorted recipe ids,
-- like prep_plans.for_recipe_ids). If the week's picks come back to a set
-- that already has a plan, the stored answer is reused instead of asking
-- Claude again.
ALTER TABLE ai_runs ADD COLUMN for_key TEXT;
