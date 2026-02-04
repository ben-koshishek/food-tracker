// Nutri-Score grade (A-E quality rating)
export type NutriScoreGrade = 'a' | 'b' | 'c' | 'd' | 'e' | 'unknown';

// NOVA food processing classification (1-4)
export type NovaGroup = 1 | 2 | 3 | 4 | null;

// Food log entry stored in IndexedDB
export interface FoodEntry {
  id?: number;
  date: string; // YYYY-MM-DD
  barcode?: string; // Open Food Facts barcode
  name: string;
  servingSize: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  salt: number;
  mealNumber?: number; // 1, 2, 3, etc. for grouping foods by meal
  createdAt: Date;
}

// Store pricing for a saved food
export interface StorePricing {
  id?: number;
  savedFoodId: number;
  store: string;
  price: number;
  packageSize: number;
  packageUnit: string;
  pricePerKg?: number;
  lastUpdated: Date;
}

// User goals stored in IndexedDB
export interface UserGoals {
  id?: number;
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFat: number;
  dailyFiber: number;
  dailySugar: number;
  dailySalt: number;
}

// Open Food Facts product response
export interface OpenFoodFactsProduct {
  code: string;
  product_name: string;
  product_name_de?: string;
  brands?: string;
  nutriscore_grade?: string;
  nutriscore_score?: number;
  nova_group?: number;
  nutriments: {
    // Energy
    'energy-kcal_100g'?: number;
    'energy-kcal'?: number;
    // Macros
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
    fiber_100g?: number;
    sugars_100g?: number;
    salt_100g?: number;
    // Extended fats
    'saturated-fat_100g'?: number;
    'trans-fat_100g'?: number;
    cholesterol_100g?: number;
    'monounsaturated-fat_100g'?: number;
    'polyunsaturated-fat_100g'?: number;
    'omega-3-fat_100g'?: number;
    'omega-6-fat_100g'?: number;
    // Minerals
    sodium_100g?: number;
    calcium_100g?: number;
    iron_100g?: number;
    potassium_100g?: number;
    magnesium_100g?: number;
    zinc_100g?: number;
    phosphorus_100g?: number;
    iodine_100g?: number;
    selenium_100g?: number;
    copper_100g?: number;
    manganese_100g?: number;
    // Vitamins
    'vitamin-a_100g'?: number;
    'vitamin-b1_100g'?: number;
    'vitamin-b2_100g'?: number;
    'vitamin-b3_100g'?: number;
    'vitamin-b5_100g'?: number;
    'vitamin-b6_100g'?: number;
    'vitamin-b9_100g'?: number;
    'vitamin-b12_100g'?: number;
    'vitamin-c_100g'?: number;
    'vitamin-d_100g'?: number;
    'vitamin-e_100g'?: number;
    'vitamin-k_100g'?: number;
    // Other
    caffeine_100g?: number;
    alcohol_100g?: number;
    'fruits-vegetables-nuts_100g'?: number;
  };
  serving_size?: string;
  serving_quantity?: string | number; // API returns string but sometimes number
  image_url?: string;
  image_small_url?: string;
}

// Normalized product for display
export interface NormalizedProduct {
  barcode: string;
  name: string;
  brand?: string;
  // Quality scores
  nutriScoreGrade: NutriScoreGrade;
  nutriScoreScore?: number;
  novaGroup: NovaGroup;
  // Core macros (per 100g)
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g: number;
  sugarPer100g: number;
  saltPer100g: number;
  // Extended fats (per 100g)
  saturatedFatPer100g?: number;
  transFatPer100g?: number;
  cholesterolPer100g?: number;
  monounsaturatedFatPer100g?: number;
  polyunsaturatedFatPer100g?: number;
  omega3FatPer100g?: number;
  omega6FatPer100g?: number;
  // Minerals (per 100g)
  sodiumPer100g?: number;
  calciumPer100g?: number;
  ironPer100g?: number;
  potassiumPer100g?: number;
  magnesiumPer100g?: number;
  zincPer100g?: number;
  phosphorusPer100g?: number;
  iodinePer100g?: number;
  seleniumPer100g?: number;
  copperPer100g?: number;
  manganesePer100g?: number;
  // Vitamins (per 100g)
  vitaminAPer100g?: number;
  vitaminB1Per100g?: number;
  vitaminB2Per100g?: number;
  vitaminB3Per100g?: number;
  vitaminB5Per100g?: number;
  vitaminB6Per100g?: number;
  vitaminB9Per100g?: number;
  vitaminB12Per100g?: number;
  vitaminCPer100g?: number;
  vitaminDPer100g?: number;
  vitaminEPer100g?: number;
  vitaminKPer100g?: number;
  // Other
  caffeinePer100g?: number;
  alcoholPer100g?: number;
  fruitsVegetablesNutsPer100g?: number;
  // Serving info
  servingSize?: string;
  servingQuantity?: number;
  // Parsed serving unit info
  servingUnitName?: string;
  servingUnitWeight?: number;
  imageUrl?: string;
}

// Daily macro totals
export interface DailyTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  salt: number;
}

// Food categories
export type FoodCategory =
  | 'protein'
  | 'carbs'
  | 'fat'
  | 'dairy'
  | 'vegetable'
  | 'fruit'
  | 'condiment'
  | 'beverage'
  | 'snack'
  | 'other';

// Saved food in personal database
export interface SavedFood {
  id?: number;
  barcode?: string;
  name: string;
  brand?: string;
  category?: FoodCategory;
  // Quality scores
  nutriScoreGrade?: NutriScoreGrade;
  nutriScoreScore?: number;
  novaGroup?: NovaGroup;
  // Core macros (per 100g)
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g: number;
  sugarPer100g: number;
  saltPer100g: number;
  // Extended fats (per 100g)
  saturatedFatPer100g?: number;
  transFatPer100g?: number;
  cholesterolPer100g?: number;
  monounsaturatedFatPer100g?: number;
  polyunsaturatedFatPer100g?: number;
  omega3FatPer100g?: number;
  omega6FatPer100g?: number;
  // Minerals (per 100g)
  sodiumPer100g?: number;
  calciumPer100g?: number;
  ironPer100g?: number;
  potassiumPer100g?: number;
  magnesiumPer100g?: number;
  zincPer100g?: number;
  phosphorusPer100g?: number;
  iodinePer100g?: number;
  seleniumPer100g?: number;
  copperPer100g?: number;
  manganesePer100g?: number;
  // Vitamins (per 100g)
  vitaminAPer100g?: number;
  vitaminB1Per100g?: number;
  vitaminB2Per100g?: number;
  vitaminB3Per100g?: number;
  vitaminB5Per100g?: number;
  vitaminB6Per100g?: number;
  vitaminB9Per100g?: number;
  vitaminB12Per100g?: number;
  vitaminCPer100g?: number;
  vitaminDPer100g?: number;
  vitaminEPer100g?: number;
  vitaminKPer100g?: number;
  // Other
  caffeinePer100g?: number;
  alcoholPer100g?: number;
  fruitsVegetablesNutsPer100g?: number;
  // Serving & display
  defaultServingSize: number;
  // Custom serving unit (e.g., "piece", "egg", "slice", "cup")
  servingUnitName?: string;
  servingUnitWeight?: number; // weight in grams per unit
  // Original serving info from API
  servingSizeFromApi?: string;
  imageUrl?: string;
  createdAt: Date;
  // DEPRECATED: use StorePricing table instead
  /** @deprecated Use StorePricing table */
  store?: string;
  /** @deprecated Use StorePricing table */
  price?: number;
  /** @deprecated Use StorePricing table */
  packageSize?: number;
  /** @deprecated Use StorePricing table */
  packageUnit?: string;
}

// Meal template - a saved collection of foods (e.g., "Breakfast combo")
export interface MealTemplate {
  id?: number;
  name: string;
  createdAt: Date;
}

// Foods included in a meal template
export interface MealTemplateItem {
  id?: number;
  mealTemplateId: number;
  savedFoodId: number;
  servingSize: number;
}

// Day template - a full day's diet (e.g., "Workout day")
export interface DayTemplate {
  id?: number;
  name: string;
  createdAt: Date;
}

// Meals included in a day template
export interface DayTemplateMeal {
  id?: number;
  dayTemplateId: number;
  mealTemplateId: number;
  mealNumber: number;
}

// Extended types with calculated nutrition totals (used in dialogs/lists)
export interface MealTemplateWithNutrition extends MealTemplate {
  itemCount: number;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export interface DayTemplateWithNutrition extends DayTemplate {
  mealCount: number;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}
