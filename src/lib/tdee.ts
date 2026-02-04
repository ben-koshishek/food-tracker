export type Sex = 'male' | 'female';

export type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'active'
  | 'very_active';

export type Goal = 'fat_loss' | 'lean_recomp' | 'recomposition' | 'maintenance' | 'muscle_gain';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const GOAL_CALORIE_MULTIPLIERS: Record<Goal, number> = {
  fat_loss: 0.80,
  lean_recomp: 0.90,
  recomposition: 1.00,
  maintenance: 1.00,
  muscle_gain: 1.10,
};

const GOAL_PROTEIN_PER_KG: Record<Goal, number> = {
  fat_loss: 2.0,
  lean_recomp: 2.2,
  recomposition: 2.2,
  maintenance: 1.6,
  muscle_gain: 1.8,
};

/**
 * Mifflin-St Jeor equation for Basal Metabolic Rate.
 */
export function calculateBMR(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  const base = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
  return Math.round(sex === 'male' ? base + 5 : base - 161);
}

/**
 * Total Daily Energy Expenditure = BMR × activity multiplier.
 */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

/**
 * Adjusted calories based on goal.
 */
export function calculateGoalCalories(tdee: number, goal: Goal): number {
  return Math.round(tdee * GOAL_CALORIE_MULTIPLIERS[goal]);
}

/**
 * Macro split: protein from body weight, fat 30% of calories, carbs remainder.
 */
export function calculateMacros(
  targetCalories: number,
  weightKg: number,
  goal: Goal,
): { protein: number; carbs: number; fat: number } {
  const protein = Math.round(weightKg * GOAL_PROTEIN_PER_KG[goal]);
  const fat = Math.round((targetCalories * 0.30) / 9);
  const proteinCals = protein * 4;
  const fatCals = fat * 9;
  const carbs = Math.round(Math.max(0, targetCalories - proteinCals - fatCals) / 4);
  return { protein, carbs, fat };
}

export const ACTIVITY_LABELS: Record<ActivityLevel, { label: string; description: string }> = {
  sedentary: { label: 'Sedentary', description: 'Desk job, no exercise' },
  lightly_active: { label: 'Lightly Active', description: 'Mostly sitting, 1-2 gym days' },
  moderately_active: { label: 'Moderately Active', description: 'Regular exercise, 3-4 days' },
  active: { label: 'Active', description: 'Hard exercise, 5-6 days' },
  very_active: { label: 'Very Active', description: 'Physical job + daily training' },
};

export const GOAL_LABELS: Record<Goal, { label: string; description: string }> = {
  fat_loss: { label: 'Cut', description: 'Lose fat fast, -20% calories' },
  lean_recomp: { label: 'Lean Recomp', description: 'Lose fat + gain muscle, -10%' },
  recomposition: { label: 'Recomp', description: 'Build muscle at maintenance calories' },
  maintenance: { label: 'Maintain', description: 'Keep current weight and shape' },
  muscle_gain: { label: 'Bulk', description: 'Gain muscle, +10% surplus' },
};
