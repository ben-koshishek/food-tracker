# Food Tracker

A web-based calorie/nutrition tracker with local-only storage and Open Food Facts API integration.

## Quick Start

```bash
pnpm install
pnpm dev
```

## Commands

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build locally
- `pnpm test` - Run tests in watch mode
- `pnpm test:run` - Run tests once
- `pnpm test:coverage` - Run tests with coverage report
- `pnpm lint` - Run ESLint

## Tech Stack

- **Framework**: Vite + React + TypeScript
- **UI**: shadcn/ui + Tailwind CSS v4
- **Database**: Dexie.js (IndexedDB wrapper)
- **Charts**: Recharts
- **Routing**: React Router DOM
- **Food Data**: Open Food Facts API
- **Testing**: Vitest

## Project Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui components (dialog, button, card, etc.)
│   ├── ErrorBoundary.tsx    # React error boundary for graceful error handling
│   ├── FoodLog.tsx          # Daily food log with meal grouping
│   ├── MacroDisplay.tsx     # Macro progress bars
│   ├── ProgressChart.tsx    # Weekly calorie chart
│   ├── Navigation.tsx       # Top navigation bar
│   ├── NutriScoreBadge.tsx  # Nutri-Score A-E badge with tooltip
│   ├── NovaGroupBadge.tsx   # NOVA 1-4 processing badge with tooltip
│   ├── StorePricingDialog.tsx # Store price management
│   ├── UseTemplateDialog.tsx  # Apply templates to log
│   ├── MealTemplateDialog.tsx # Create/edit meal templates
│   ├── MealTemplateList.tsx   # Meal template management
│   ├── DayTemplateDialog.tsx  # Create/edit day templates
│   └── DayTemplateList.tsx    # Day template management
├── pages/
│   ├── Dashboard.tsx    # Home with summary & weekly chart
│   ├── Log.tsx          # Daily log view
│   ├── MyFoods.tsx      # Personal food database
│   ├── Templates.tsx    # Meal & day templates
│   └── Settings.tsx     # Goals, calorie calculator & data management
├── lib/
│   ├── __tests__/       # Unit tests
│   │   ├── nutrition.test.ts
│   │   └── tdee.test.ts
│   ├── db.ts            # Dexie database setup & operations
│   ├── open-food-facts.ts # Open Food Facts API client
│   ├── nutrition.ts     # Nutrition calculation utilities
│   ├── tdee.ts          # TDEE/BMR calculator (Mifflin-St Jeor)
│   ├── constants.ts     # Shared constants (meal labels, etc.)
│   └── utils.ts         # shadcn utilities
├── types/
│   └── index.ts         # TypeScript interfaces
├── App.tsx              # Main app with routing & error boundary
├── main.tsx             # Entry point
└── index.css            # Tailwind + custom theme variables
```

## Database Schema (Dexie v4)

**FoodEntry** - Daily food log entries
- id, date, barcode, name, servingSize, servingUnit
- calories, protein, carbs, fat, fiber, sugar, salt
- mealNumber, createdAt

**SavedFood** - Personal food database (local cache)
- id, barcode, name, brand, category
- Quality scores: nutriScoreGrade, nutriScoreScore, novaGroup
- Core macros: caloriesPer100g, proteinPer100g, carbsPer100g, fatPer100g, fiberPer100g, sugarPer100g, saltPer100g
- Extended fats: saturatedFatPer100g, transFatPer100g, cholesterolPer100g, monounsaturatedFatPer100g, polyunsaturatedFatPer100g, omega3FatPer100g, omega6FatPer100g
- Minerals: sodiumPer100g, calciumPer100g, ironPer100g, potassiumPer100g, magnesiumPer100g, zincPer100g, phosphorusPer100g, iodinePer100g, seleniumPer100g, copperPer100g, manganesePer100g
- Vitamins: vitaminAPer100g, vitaminB1-B12Per100g, vitaminCPer100g, vitaminDPer100g, vitaminEPer100g, vitaminKPer100g
- Other: caffeinePer100g, alcoholPer100g, fruitsVegetablesNutsPer100g
- Serving: defaultServingSize, servingUnitName, servingUnitWeight, servingSizeFromApi
- imageUrl, createdAt

**StorePricing** - Store price tracking (multiple per food)
- id, savedFoodId, store, price, packageSize, packageUnit, pricePerKg, lastUpdated

**UserGoals**
- id, dailyCalories, dailyProtein, dailyCarbs, dailyFat
- dailyFiber, dailySugar, dailySalt

**MealTemplate** - Reusable meal combos
- id, name, createdAt
- Items: mealTemplateId, savedFoodId, servingSize

**DayTemplate** - Full day plans
- id, name, createdAt
- Meals: dayTemplateId, mealTemplateId, mealNumber

## TDEE Calculator

Settings page includes a calorie/macro calculator using the Mifflin-St Jeor equation.

**Goals** (ordered deficit → surplus):
| Goal | Calories | Protein |
|------|----------|---------|
| Cut | TDEE x 0.80 | 2.0 g/kg |
| Lean Recomp | TDEE x 0.90 | 2.2 g/kg |
| Recomp | TDEE x 1.00 | 2.2 g/kg |
| Maintain | TDEE x 1.00 | 1.6 g/kg |
| Bulk | TDEE x 1.10 | 1.8 g/kg |

**Macro split**: protein from body weight, fat 30% of calories, carbs = remainder.

## Open Food Facts API

Base URL: `https://world.openfoodfacts.org/api/v2/`

Key endpoints used:
- Search: `GET /search?search_terms={query}&countries_tags=germany`
- By barcode: `GET /product/{barcode}`

## Deployment

Configured for GitHub Pages with `base: '/food-tracker/'` in vite.config.ts (build only, dev uses `/`).

CI/CD via `.github/workflows/ci.yml`: type check → lint → test → build → deploy to GitHub Pages.

## Key Files

- `src/lib/db.ts` - Database operations (CRUD, templates, pricing)
- `src/lib/nutrition.ts` - Nutrition calculation utilities
- `src/lib/tdee.ts` - TDEE/BMR/macro calculator
- `src/lib/constants.ts` - Shared constants (meal labels)
- `src/lib/open-food-facts.ts` - Open Food Facts API client
- `src/types/index.ts` - TypeScript interfaces
- `src/components/ErrorBoundary.tsx` - App-wide error handling
- `vite.config.ts` - Vite configuration (base URL, proxy for OFF API)
- `.github/workflows/ci.yml` - CI/CD pipeline (build, lint, test, deploy)
