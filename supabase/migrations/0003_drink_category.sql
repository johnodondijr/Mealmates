-- MealMates schema — v3
-- Adds the 'drink' food category (breakfast = drink + breakfast food).

alter table public.foods drop constraint if exists foods_category_check;
alter table public.foods
  add constraint foods_category_check
  check (category in ('base','protein','veg','drink','breakfast','treat'));
