import type {
  AppData,
  Food,
  FoodCategory,
  Member,
  Effort,
} from '../types'
import { newId } from '../lib/id'

const now = () => new Date().toISOString()

// Deterministic-ish ids for seed foods so pairing rules can reference names.
function food(
  name: string,
  category: FoodCategory,
  emoji: string,
  cost: number,
  effort: Effort,
  prep_minutes: number,
): Food {
  return {
    id: `food_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    name,
    category,
    emoji,
    cost,
    effort,
    prep_minutes,
    created_at: now(),
  }
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
  food('Fries / Chips', 'base', '🍟', 120, 'Medium', 25),
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
  food('Sausages', 'protein', '🌭', 150, 'Easy', 12),
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

  // ---- Breakfast ----
  food('Tea + Bread', 'breakfast', '🍞', 60, 'Easy', 10),
  food('Uji', 'breakfast', '🥣', 40, 'Easy', 15),
  food('Pancakes', 'breakfast', '🥞', 80, 'Medium', 25),
  food('Mandazi', 'breakfast', '🍩', 70, 'Hard', 45),
  food('Eggs + Toast', 'breakfast', '🍳', 90, 'Easy', 15),
  food('Weetabix', 'breakfast', '🥛', 100, 'Easy', 5),

  // ---- Treats / Extras ----
  food('Pilau', 'treat', '🍛', 200, 'Hard', 60),
  food('Biryani', 'treat', '🍛', 250, 'Hard', 70),
  food('Ugali + Matumbo', 'treat', '🍲', 180, 'Medium', 50),
  food('Samosas', 'treat', '🥟', 120, 'Hard', 40),
  food('Smokies', 'treat', '🌭', 100, 'Easy', 8),
  food('Chips Masala', 'treat', '🍟', 180, 'Medium', 30),
]

const COLORS = ['#F45A28', '#F59300', '#6B942A', '#C2478E']
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
  return rows.map(([label, base, protein, veg, cost, ago]) => ({
    id: newId('meal'),
    slot: 'dinner' as const,
    label,
    base_id: base,
    protein_id: protein,
    veg_id: veg,
    cost,
    eaten_on: daysAgo(ago),
    logged_by: 'member_1',
    from_vote_id: null,
    created_at: now(),
  }))
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
