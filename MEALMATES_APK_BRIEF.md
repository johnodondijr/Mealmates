# MealMates APK Brief

## App Summary

**MealMates** is a mobile-first household meal decision app built to settle the daily "what are we eating?" question quickly, fairly, and with a bit of fun. It is designed for shared homes where several people eat together, vote on meals, track preferences, plan ahead, and keep an eye on food spending.

The app is especially tailored around familiar Kenyan household meals and prices, using a pre-seeded food library with items such as ugali, rice, chapati, beef stew, ndengu, beans, sukuma wiki, tea, mandazi, and more.

## APK Details

- **App name:** MealMates
- **Package name:** `com.johnodondi.mealmates`
- **Version:** `1.0`
- **Platform:** Android
- **Built with:** React, TypeScript, Vite, Capacitor, Tailwind CSS, Supabase-ready data sync

## What The App Does

MealMates helps a household decide, plan, and remember meals together. Users can spin for smart meal suggestions, create meal votes, maintain a shared food catalog, log actual meals eaten, and track spending against a monthly food budget.

The app works locally by default, so it can be tested immediately after installing the APK. When Supabase sync is configured, multiple housemates can join the same household and see live updates for votes, meals, spending, and join requests.

## Key Features

- **Smart meal decider:** Suggests balanced meal combinations using base, protein, and vegetable options.
- **Surprise spin mode:** A playful slot-machine style meal picker for quick decisions.
- **Live household voting:** Start breakfast, lunch, or dinner votes and let everyone choose from their phone.
- **Tie breaker:** Handles close votes with a built-in tie-breaker wheel.
- **Meal planning:** Plan meals for the week and auto-fill empty days.
- **Food library:** Add, edit, remove, and categorize foods with cost, prep time, effort, availability, and ingredients.
- **Preferences:** Mark foods that each member loves or refuses so suggestions better match the household.
- **Spending tracker:** Log groceries and meal costs, track a monthly food budget, and view contribution splits.
- **Meal history and stats:** See frequently eaten foods, recent meals, monthly summaries, and household recap stats.
- **Household sync:** Optional Supabase-powered sync for multiple devices and shared household join codes.
- **Dark mode:** Includes a comfortable dark theme and reduced-motion support.

## Suggested Testing Flow

1. Install the APK on an Android device.
2. Open MealMates and complete the short household setup.
3. Try the **Decide** screen and spin for a meal suggestion.
4. Start a meal vote from the **Vote** screen.
5. Add or edit a food from the **Foods** screen.
6. Log a meal or grocery cost from **Money** or **Stats**.
7. Check whether the meal history, budget, and household stats update correctly.
8. Optional: configure Supabase sync in Settings to test multi-device household sharing.

## Notes For Recipients

- The app can run in local-only mode without any server setup.
- Live cross-device sync requires Supabase configuration.
- The food catalog and estimated prices are intended as practical starting data and can be edited by the user.
- If Android shows a warning while installing, allow installation from the sharing source because the APK is being shared outside the Play Store.

## One-Line Pitch

**MealMates is a shared-household meal companion built for people who regularly eat together and want an easier way to answer the everyday question of what to cook. It brings meal suggestions, group voting, weekly planning, food preferences, meal history, and spending tracking into one simple Android app, so housemates can make fair decisions, avoid repetitive meals, respect each person's likes and dislikes, and keep food costs visible. Whether used by one person locally or by a synced household across multiple phones, MealMates makes choosing, planning, and managing meals feel more organized, collaborative, and fun.**
