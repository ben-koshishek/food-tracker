// Meal labels for display throughout the app
export const MEAL_LABELS: Record<number, string> = {
    1: 'Breakfast',
    2: 'Lunch',
    3: 'Dinner',
    4: 'Snacks',
    5: 'Meal 5',
    6: 'Meal 6',
} as const;

// Meal options for select dropdowns
export const MEAL_OPTIONS = [
    { number: 1, label: 'Breakfast' },
    { number: 2, label: 'Lunch' },
    { number: 3, label: 'Dinner' },
    { number: 4, label: 'Snacks' },
] as const;

// Get meal label with fallback
export function getMealLabel(mealNumber: number | null | undefined): string {
    if (mealNumber === null || mealNumber === undefined) return 'Other';
    return MEAL_LABELS[mealNumber] || `Meal ${mealNumber}`;
}
