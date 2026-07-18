-- MealMates schema — v4
-- Adds the 'fruit' food category. Safe to run on top of earlier migrations.

alter table public.foods drop constraint if exists foods_category_check;
alter table public.foods
  add constraint foods_category_check
  check (category in ('base', 'protein', 'veg', 'fruit', 'drink', 'breakfast', 'treat'));
