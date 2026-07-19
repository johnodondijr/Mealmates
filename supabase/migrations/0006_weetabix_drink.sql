-- MealMates schema — v6 (data fix)
-- Weetabix is a milk-based cereal — a *wet* breakfast. Move it to the drink
-- (wet) slot so a breakfast spin never pairs it with tea/coffee. Safe to re-run.

update public.foods set category = 'drink', texture = 'saucy'
where id = 'food_weetabix';
