-- MealMates schema — v3
-- Adds food texture (dry/saucy balance), availability, and the breakfast
-- "drink" category. Safe to run on top of 0001 + 0002.

-- ---------- foods: texture + availability ----------
alter table public.foods
  add column if not exists texture text not null default 'neutral'
    check (texture in ('dry', 'saucy', 'neutral'));
alter table public.foods
  add column if not exists available boolean not null default true;

-- ---------- foods: allow the 'drink' category ----------
alter table public.foods drop constraint if exists foods_category_check;
alter table public.foods
  add constraint foods_category_check
  check (category in ('base', 'protein', 'veg', 'drink', 'breakfast', 'treat'));
