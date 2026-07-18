import type {
  AppData,
  Food,
  FoodCategory,
  Member,
  Effort,
  Texture,
} from '../types'
import { newId } from '../lib/id'

const now = () => new Date().toISOString()

// Deterministic-ish ids for seed foods so pairing rules can reference names.
// `id` can be overridden when a name would collide across categories (e.g. a
// breakfast Chapati vs the dinner Chapati base).
function food(
  name: string,
  category: FoodCategory,
  emoji: string,
  cost: number,
  effort: Effort,
  prep_minutes: number,
  suggestable = true,
  id?: string,
): Food {
  return {
    id: id ?? `food_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    name,
    category,
    emoji,
    cost,
    effort,
    prep_minutes,
    texture: 'neutral',
    suggestable,
    available: true,
    ingredients: [],
    created_at: now(),
  }
}

// Which foods are dry (need a saucy partner) vs saucy (provide moisture).
// Anything omitted stays 'neutral' (pairs freely).
export const TEXTURE_MAP: Record<string, Texture> = {
  // dry starches
  food_ugali: 'dry',
  food_chapati: 'dry',
  food_chapati_bf: 'dry',
  food_mukimo: 'dry',
  food_mashed_potatoes: 'dry',
  food_fries_chips: 'dry',
  food_bread: 'dry',
  food_toast: 'dry',
  food_mandazi: 'dry',
  food_arrowroots: 'dry',
  food_sweet_potato: 'dry',
  food_groundnuts: 'dry',
  // saucy proteins
  food_beef_stew: 'saucy',
  food_chicken_wet_fry_: 'saucy',
  food_ndengu: 'saucy',
  food_beans: 'saucy',
  food_minced_meat: 'saucy',
  food_omena: 'saucy',
  // dry proteins
  food_chicken_dry_fry_: 'dry',
  food_fried_tilapia: 'dry',
  food_nyama_choma: 'dry',
  food_sausages: 'dry',
  // saucy veg
  food_sukuma_wiki: 'saucy',
  food_spinach: 'saucy',
  food_managu: 'saucy',
  food_terere: 'saucy',
  food_cabbage: 'saucy',
  // drinks are wet
  food_tea: 'saucy',
  food_coffee: 'saucy',
  food_uji_porridge_: 'saucy',
  food_milk_milo: 'saucy',
  food_cocoa: 'saucy',
}

export const SEED_FOODS: Food[] = [
  // ---- Bases / Starches ----
  food('Ugali', 'base', '🌽', 40, 'Easy', 15),
  food('Rice', 'base', '🍚', 60, 'Easy', 25),
  food('Chapati', 'base', '🫓', 80, 'Hard', 45),
  food('Spaghetti', 'base', '🍝', 90, 'Easy', 20),
  food('Mukimo', 'base', '🥔', 100, 'Medium', 40),
  food('Matoke', 'base', '🍌', 90, 'Medium', 40),
  food('Mashed Potatoes', 'base', '🥔', 100, 'Medium', 35),
  // Kept as an option, but not something eaten for regular meals — never suggested.
  food('Fries / Chips', 'base', '🍟', 120, 'Medium', 25, false),
  food('Githeri', 'base', '🫘', 80, 'Medium', 60),

  // ---- Proteins ----
  food('Beef Stew', 'protein', '🥩', 250, 'Medium', 45),
  food('Chicken (Wet Fry)', 'protein', '🍗', 350, 'Hard', 50),
  food('Chicken (Dry Fry)', 'protein', '🍗', 350, 'Hard', 55),
  food('Fried Tilapia', 'protein', '🐟', 300, 'Medium', 30),
  food('Omena', 'protein', '🐟', 120, 'Easy', 20),
  food('Ndengu', 'protein', '🫛', 90, 'Medium', 40),
  food('Beans', 'protein', '🫘', 80, 'Medium', 50),
  food('Eggs', 'protein', '🥚', 60, 'Easy', 10),
  food('Minced Meat', 'protein', '🍖', 220, 'Medium', 35),
  food('Nyama Choma', 'protein', '🍖', 400, 'Hard', 60),

  // ---- Vegetables / Sides ----
  food('Sukuma Wiki', 'veg', '🥬', 30, 'Easy', 15),
  food('Cabbage', 'veg', '🥬', 40, 'Easy', 20),
  food('Spinach', 'veg', '🥬', 50, 'Easy', 15),
  food('Kachumbari', 'veg', '🥗', 50, 'Easy', 10),
  food('Managu', 'veg', '🌿', 60, 'Medium', 20),
  food('Terere', 'veg', '🌿', 60, 'Medium', 20),
  food('Avocado', 'veg', '🥑', 40, 'Easy', 2),

  // ---- Breakfast drinks ----
  food('Tea', 'drink', '🍵', 20, 'Easy', 10),
  food('Coffee', 'drink', '☕', 30, 'Easy', 8),
  food('Uji (Porridge)', 'drink', '🥣', 30, 'Easy', 15),
  food('Milk / Milo', 'drink', '🥛', 40, 'Easy', 3),
  food('Cocoa', 'drink', '🍫', 40, 'Easy', 5),

  // ---- Breakfast foods (solids that go with a hot drink) ----
  food('Bread', 'breakfast', '🍞', 50, 'Easy', 2),
  food('Toast', 'breakfast', '🍞', 60, 'Easy', 8),
  food('Chapati', 'breakfast', '🫓', 80, 'Hard', 45, true, 'food_chapati_bf'),
  food('Mandazi', 'breakfast', '🍩', 70, 'Hard', 45),
  food('Pancakes', 'breakfast', '🥞', 80, 'Medium', 25),
  food('Weetabix', 'breakfast', '🥣', 100, 'Easy', 5),
  food('Boiled Eggs', 'breakfast', '🥚', 60, 'Easy', 12),
  food('Arrowroots', 'breakfast', '🥔', 70, 'Medium', 25),
  food('Sweet Potato', 'breakfast', '🍠', 60, 'Medium', 30),
  food('Groundnuts', 'breakfast', '🥜', 50, 'Easy', 2),
  // Sausages are more of a snack/breakfast item, not a main-meal protein.
  food('Sausages', 'breakfast', '🌭', 150, 'Easy', 12),

  // ---- Treats / Extras ----
  food('Pilau', 'treat', '🍛', 200, 'Hard', 60),
  food('Biryani', 'treat', '🍛', 250, 'Hard', 70),
  food('Ugali + Matumbo', 'treat', '🍲', 180, 'Medium', 50),
  food('Samosas', 'treat', '🥟', 120, 'Hard', 40),
  food('Smokies', 'treat', '🌭', 100, 'Easy', 8),
  food('Chips Masala', 'treat', '🍟', 180, 'Medium', 30),
]

// Seed a few ingredient breakdowns so the feature isn't empty on first run.
const SEED_INGREDIENTS: Record<string, Array<[string, number]>> = {
  food_ugali: [['Maize flour', 35], ['Water', 0], ['Salt', 5]],
  food_beef_stew: [
    ['Beef (½ kg)', 200],
    ['Onions', 20],
    ['Tomatoes', 20],
    ['Oil & spices', 10],
  ],
  food_rice: [['Rice (2 cups)', 55], ['Oil', 5]],
  food_sukuma_wiki: [['Sukuma bunch', 20], ['Onion & oil', 10]],
}
for (const f of SEED_FOODS) {
  const rows = SEED_INGREDIENTS[f.id]
  if (rows) {
    f.ingredients = rows.map(([name, cost]) => ({
      id: `ing_${f.id}_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
      name,
      cost,
    }))
  }
  f.texture = TEXTURE_MAP[f.id] ?? 'neutral'
}

// Curated, muted earthy palette that blends with the greige/green system.
const COLORS = ['#C4704F', '#C79A3E', '#6B8E5A', '#9A6E8A']
const EMOJIS = ['🦁', '🌸', '🚀', '🦋']
const NAMES = ['Fred', 'Girlfriend', 'Friend', "Friend's GF"]

export const SEED_MEMBERS: Member[] = NAMES.map((name, i) => ({
  id: `member_${i + 1}`,
  name,
  emoji: EMOJIS[i],
  color: COLORS[i],
  created_at: now(),
}))

export function buildSeedData(): AppData {
  return {
    members: SEED_MEMBERS,
    foods: SEED_FOODS,
    preferences: [
      // A little starter flavour so preferences aren't empty.
      { id: newId('pref'), member_id: 'member_1', food_id: 'food_ugali', preference: 'love' },
      { id: newId('pref'), member_id: 'member_1', food_id: 'food_nyama_choma', preference: 'love' },
      { id: newId('pref'), member_id: 'member_2', food_id: 'food_chapati', preference: 'love' },
      { id: newId('pref'), member_id: 'member_2', food_id: 'food_omena', preference: 'refuse' },
      { id: newId('pref'), member_id: 'member_3', food_id: 'food_pilau', preference: 'love' },
      { id: newId('pref'), member_id: 'member_4', food_id: 'food_fried_tilapia', preference: 'love' },
    ],
    wishes: [],
    votes: [],
    voteOptions: [],
    ballots: [],
    meals: seedMeals(),
    expenses: seedExpenses(),
    settings: {
      id: 'settings',
      household_name: 'The Nairobi Four',
      monthly_budget: 30000,
      budget_mode: false,
      currency: 'KES',
    },
  }
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

// A few recent meals so recency logic + stats have something to chew on.
function seedMeals(): AppData['meals'] {
  const rows: Array<[string, string | null, string | null, string | null, number, number]> = [
    ['Ugali + Beef Stew + Sukuma', 'food_ugali', 'food_beef_stew', 'food_sukuma_wiki', 320, 1],
    ['Rice + Beans + Kachumbari', 'food_rice', 'food_beans', 'food_kachumbari', 190, 2],
    ['Chapati + Ndengu', 'food_chapati', 'food_ndengu', null, 170, 3],
    ['Ugali + Sukuma Wiki', 'food_ugali', null, 'food_sukuma_wiki', 70, 5],
    ['Spaghetti + Minced Meat', 'food_spaghetti', 'food_minced_meat', null, 310, 6],
  ]
  const foodName = (id: string | null) =>
    SEED_FOODS.find((f) => f.id === id)?.name ?? ''
  return rows.map(([label, base, protein, veg, cost, ago]) => {
    // Split the total across the components so cost history has data.
    const parts = [base, protein, veg].filter(Boolean) as string[]
    const each = parts.length ? Math.round(cost / parts.length) : 0
    return {
      id: newId('meal'),
      slot: 'dinner' as const,
      label,
      base_id: base,
      protein_id: protein,
      veg_id: veg,
      cost,
      component_costs: parts.map((id) => ({
        food_id: id,
        label: foodName(id),
        amount: each,
      })),
      eaten_on: daysAgo(ago),
      logged_by: 'member_1',
      from_vote_id: null,
      created_at: now(),
    }
  })
}

function seedExpenses(): AppData['expenses'] {
  const rows: Array<[number, string, AppData['expenses'][number]['category'], string, number]> = [
    [1200, 'Weekly groceries', 'groceries', 'member_1', 2],
    [450, 'Beef from butcher', 'protein', 'member_2', 3],
    [300, 'Vegetables at market', 'veg', 'member_3', 4],
    [800, 'Rice & flour', 'groceries', 'member_1', 6],
    [500, 'Chicken', 'protein', 'member_4', 8],
  ]
  return rows.map(([amount, description, category, paid_by, ago]) => ({
    id: newId('exp'),
    amount,
    description,
    category,
    paid_by,
    spent_on: daysAgo(ago),
    meal_id: null,
    created_at: now(),
  }))
}
