import type {
  AppData,
  Food,
  FoodCategory,
  Member,
  Effort,
  Texture,
} from '../types'
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
  food_wimbi_ugali: 'dry',
  food_boiled_maize: 'dry',
  // saucy proteins
  food_beef_stew: 'saucy',
  food_chicken_wet_fry_: 'saucy',
  food_ndengu: 'saucy',
  food_beans: 'saucy',
  food_minced_meat: 'saucy',
  food_omena: 'saucy',
  food_matumbo: 'saucy',
  food_kamande_lentils_: 'saucy',
  food_njahi: 'saucy',
  food_minji_peas_: 'saucy',
  food_goat_stew: 'saucy',
  food_fish_stew: 'saucy',
  food_liver_maini_: 'saucy',
  food_kienyeji_chicken: 'saucy',
  // dry proteins
  food_chicken_dry_fry_: 'dry',
  food_fried_tilapia: 'dry',
  food_nyama_choma: 'dry',
  food_sausages: 'dry',
  food_mutura: 'dry',
  // saucy veg
  food_sukuma_wiki: 'saucy',
  food_spinach: 'saucy',
  food_managu: 'saucy',
  food_terere: 'saucy',
  food_cabbage: 'saucy',
  food_kunde: 'saucy',
  food_mrenda: 'saucy',
  food_pumpkin_leaves: 'saucy',
  // drinks are wet
  food_tea: 'saucy',
  food_coffee: 'saucy',
  food_uji_porridge_: 'saucy',
  food_milk_milo: 'saucy',
  food_cocoa: 'saucy',
  food_weetabix: 'saucy',
}

// Conceptual tags used by the suggestion engine to avoid bad pairings
// (see pairClash in engine/suggest.ts):
//   legume — pulses; never put two on one plate (beans + green beans, etc.)
//   maize  — maize-based; with a legume it's just githeri, so don't double up
//   mash   — soft mashed starch; wants a saucy stew, not a dry/fishy side
//   fishy  — dry/strong fish proteins that clash with a mash
export const FOOD_TAGS: Record<string, string[]> = {
  // legumes / pulses
  food_beans: ['legume'],
  food_ndengu: ['legume'],
  food_njahi: ['legume'],
  food_minji_peas_: ['legume'],
  food_kamande_lentils_: ['legume'],
  food_green_beans: ['legume'],
  food_githeri: ['legume', 'maize'], // maize + beans already
  // maize-based starches
  food_muthokoi: ['maize'],
  food_boiled_maize: ['maize'],
  food_roasted_maize: ['maize'],
  // soft mashes
  food_mukimo: ['mash'],
  food_mashed_potatoes: ['mash'],
  // dry / strong fish
  food_omena: ['fishy'],
  food_fried_tilapia: ['fishy'],
  food_fish_stew: ['fishy'],
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
  food('Potatoes', 'base', '🥔', 80, 'Easy', 25),
  food('Githeri', 'base', '🫘', 80, 'Medium', 60),
  food('Muthokoi', 'base', '🌽', 90, 'Medium', 70),
  food('Pilau', 'base', '🍛', 200, 'Hard', 60),
  food('Biryani', 'base', '🍛', 250, 'Hard', 70),
  food('Coconut Rice', 'base', '🍚', 120, 'Medium', 35),
  food('Wimbi Ugali', 'base', '🌾', 50, 'Easy', 15),
  // Boiled maize is a snack/breakfast eaten with a drink — not a dinner base.
  food('Boiled Maize', 'breakfast', '🌽', 40, 'Easy', 20),
  // Kept as an option, but not something eaten for regular meals — never suggested.
  food('Fries / Chips', 'base', '🍟', 120, 'Medium', 25, false),

  // ---- Proteins ----
  food('Beef Stew', 'protein', '🥩', 250, 'Medium', 45),
  food('Boiled Meat', 'protein', '🥩', 250, 'Medium', 60),
  food('Chicken (Wet Fry)', 'protein', '🍗', 350, 'Hard', 50),
  food('Chicken (Dry Fry)', 'protein', '🍗', 350, 'Hard', 55),
  food('Kienyeji Chicken', 'protein', '🐓', 500, 'Hard', 90),
  food('Goat Stew', 'protein', '🍖', 350, 'Hard', 70),
  food('Pork', 'protein', '🥓', 300, 'Medium', 40),
  food('Nyama Choma', 'protein', '🍖', 400, 'Hard', 60),
  food('Minced Meat', 'protein', '🍖', 220, 'Medium', 35),
  food('Matumbo', 'protein', '🍲', 180, 'Medium', 50),
  food('Liver (Maini)', 'protein', '🫀', 200, 'Medium', 25),
  food('Fried Tilapia', 'protein', '🐟', 300, 'Medium', 30),
  food('Fish Stew', 'protein', '🐟', 300, 'Medium', 40),
  food('Omena', 'protein', '🐟', 120, 'Easy', 20),
  food('Eggs', 'protein', '🥚', 60, 'Easy', 10),
  food('Beans', 'protein', '🫘', 80, 'Medium', 50),
  food('Ndengu', 'protein', '🫛', 90, 'Medium', 40),
  food('Kamande (Lentils)', 'protein', '🫘', 90, 'Medium', 45),
  food('Njahi', 'protein', '🫘', 100, 'Medium', 60),
  food('Minji (Peas)', 'protein', '🫛', 90, 'Medium', 40),
  food('Mutura', 'protein', '🌭', 150, 'Hard', 60),

  // ---- Vegetables ----
  food('Sukuma Wiki', 'veg', '🥬', 30, 'Easy', 15),
  food('Cabbage', 'veg', '🥬', 40, 'Easy', 20),
  food('Spinach', 'veg', '🥬', 50, 'Easy', 15),
  food('Kachumbari', 'veg', '🥗', 50, 'Easy', 10),
  food('Managu', 'veg', '🌿', 60, 'Medium', 20),
  food('Terere', 'veg', '🌿', 60, 'Medium', 20),
  food('Kunde', 'veg', '🌿', 60, 'Medium', 25),
  food('Mrenda', 'veg', '🌿', 60, 'Medium', 25),
  food('Pumpkin Leaves', 'veg', '🌿', 60, 'Medium', 25),
  food('Carrots', 'veg', '🥕', 40, 'Easy', 15),
  food('Green Beans', 'veg', '🫛', 60, 'Easy', 20),
  food('Butternut', 'veg', '🎃', 70, 'Medium', 30),

  // ---- Fruits ----
  food('Avocado', 'fruit', '🥑', 40, 'Easy', 2),
  food('Banana', 'fruit', '🍌', 20, 'Easy', 1),
  food('Mango', 'fruit', '🥭', 40, 'Easy', 2),
  food('Pineapple', 'fruit', '🍍', 60, 'Easy', 5),
  food('Watermelon', 'fruit', '🍉', 80, 'Easy', 5),
  food('Orange', 'fruit', '🍊', 20, 'Easy', 2),
  food('Pawpaw', 'fruit', '🍈', 50, 'Easy', 3),
  food('Passion', 'fruit', '🟣', 30, 'Easy', 1),

  // ---- Drinks ----
  food('Tea', 'drink', '🍵', 20, 'Easy', 10),
  food('Coffee', 'drink', '☕', 30, 'Easy', 8),
  food('Uji (Porridge)', 'drink', '🥣', 30, 'Easy', 15),
  food('Milk / Milo', 'drink', '🥛', 40, 'Easy', 3),
  food('Cocoa', 'drink', '🍫', 40, 'Easy', 5),
  // Extra drinks — pickable, but not recommended in a spin.
  food('Soda', 'drink', '🥤', 60, 'Easy', 1, false),
  food('Fresh Juice', 'drink', '🧃', 80, 'Easy', 5, false),
  food('Water', 'drink', '💧', 0, 'Easy', 1, false),
  food('Mursik', 'drink', '🥛', 50, 'Easy', 2, false),
  food('Dawa', 'drink', '🍋', 60, 'Easy', 5, false),
  food('Smoothie', 'drink', '🥤', 120, 'Medium', 8, false),

  // ---- Breakfast foods (solids that go with a hot drink) ----
  food('Bread', 'breakfast', '🍞', 50, 'Easy', 2),
  food('Toast', 'breakfast', '🍞', 60, 'Easy', 8),
  food('Chapati', 'breakfast', '🫓', 80, 'Hard', 45, true, 'food_chapati_bf'),
  food('Mandazi', 'breakfast', '🍩', 70, 'Hard', 45),
  food('Pancakes', 'breakfast', '🥞', 80, 'Medium', 25),
  // Weetabix is a milk-based cereal — a *wet* breakfast, grouped with the
  // drinks so a spin never pairs it with tea/coffee (it stands in for them).
  food('Weetabix', 'drink', '🥣', 100, 'Easy', 5),
  food('Boiled Eggs', 'breakfast', '🥚', 60, 'Easy', 12),
  food('Arrowroots', 'breakfast', '🥔', 70, 'Medium', 25),
  food('Sweet Potato', 'breakfast', '🍠', 60, 'Medium', 30),
  food('Groundnuts', 'breakfast', '🥜', 50, 'Easy', 2),
  // Sausages are more of a snack/breakfast item, not a main-meal protein.
  food('Sausages', 'breakfast', '🌭', 150, 'Easy', 12),

  // ---- Treats / Snacks ----
  food('Samosas', 'treat', '🥟', 120, 'Hard', 40),
  food('Smokies', 'treat', '🌭', 100, 'Easy', 8),
  // Sausages also live in Breakfast; here as a snack.
  food('Sausages', 'treat', '🌭', 150, 'Easy', 12, true, 'food_sausages_treat'),
  food('Chips Masala', 'treat', '🍟', 180, 'Medium', 30),
  food('Bhajia', 'treat', '🍟', 150, 'Medium', 30),
  food('Viazi Karai', 'treat', '🥔', 120, 'Medium', 25),
  food('Mahamri', 'treat', '🍩', 80, 'Hard', 45),
  food('Roasted Maize', 'treat', '🌽', 30, 'Easy', 15),
  food('Cake', 'treat', '🍰', 150, 'Medium', 5),
  food('Ice Cream', 'treat', '🍦', 100, 'Easy', 1),
  food('Kaimati', 'treat', '🍡', 80, 'Hard', 40),
  food('Crisps', 'treat', '🥔', 50, 'Easy', 1),
  food('Sugarcane', 'treat', '🎋', 30, 'Easy', 2),
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

// Start with a single housemate. The user adds the rest in Settings.
export const SEED_MEMBERS: Member[] = [
  { id: 'member_1', name: 'Me', emoji: '🙂', color: '#C4704F', created_at: now() },
]

export function buildSeedData(): AppData {
  return {
    members: SEED_MEMBERS,
    foods: SEED_FOODS,
    // No preferences / history / spending yet — these fill in as the household
    // uses the app. Only the food library is pre-seeded.
    preferences: [],
    comboDislikes: [],
    plannedMeals: [],
    wishes: [],
    votes: [],
    voteOptions: [],
    ballots: [],
    meals: [],
    expenses: [],
    settings: {
      id: 'settings',
      household_name: 'My Household',
      monthly_budget: 30000,
      budget_mode: false,
      currency: 'KES',
    },
  }
}
