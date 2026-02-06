// Nutrition calculation utilities

// Interface for any object with per-100g nutrition values
export interface NutritionPer100g {
    caloriesPer100g: number;
    proteinPer100g: number;
    carbsPer100g: number;
    fatPer100g: number;
    fiberPer100g: number;
    sugarPer100g: number;
    saltPer100g: number;
}

// Calculated nutrition for a serving
export interface CalculatedNutrition {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    salt: number;
}

/**
 * Calculate nutrition values for a given serving size from per-100g values.
 * Rounds macros to 1 decimal place, salt to 2 decimal places, calories to whole numbers.
 */
export function calculateNutritionForServing(
    food: NutritionPer100g,
    servingGrams: number,
): CalculatedNutrition {
    const multiplier = servingGrams / 100;
    return {
        calories: Math.round(food.caloriesPer100g * multiplier),
        protein: Math.round(food.proteinPer100g * multiplier * 10) / 10,
        carbs: Math.round(food.carbsPer100g * multiplier * 10) / 10,
        fat: Math.round(food.fatPer100g * multiplier * 10) / 10,
        fiber: Math.round(food.fiberPer100g * multiplier * 10) / 10,
        sugar: Math.round(food.sugarPer100g * multiplier * 10) / 10,
        salt: Math.round(food.saltPer100g * multiplier * 100) / 100,
    };
}

/**
 * Scale existing nutrition values by a ratio (e.g., when changing serving size).
 */
export function scaleNutrition(nutrition: CalculatedNutrition, ratio: number): CalculatedNutrition {
    return {
        calories: Math.round(nutrition.calories * ratio),
        protein: Math.round(nutrition.protein * ratio * 10) / 10,
        carbs: Math.round(nutrition.carbs * ratio * 10) / 10,
        fat: Math.round(nutrition.fat * ratio * 10) / 10,
        fiber: Math.round(nutrition.fiber * ratio * 10) / 10,
        sugar: Math.round(nutrition.sugar * ratio * 10) / 10,
        salt: Math.round(nutrition.salt * ratio * 100) / 100,
    };
}
