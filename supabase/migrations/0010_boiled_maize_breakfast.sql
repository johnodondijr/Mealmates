-- MealMates schema — v10 (data fix)
-- Boiled maize is a snack/breakfast eaten with a drink, not a dinner base —
-- so the engine never proposes maize with a legume (e.g. maize + lentils).
-- Safe to re-run.

update public.foods set category = 'breakfast' where id = 'food_boiled_maize';
