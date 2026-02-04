import Dexie, { type EntityTable } from 'dexie';
import type { FoodEntry, UserGoals, SavedFood, MealTemplate, MealTemplateItem, DayTemplate, DayTemplateMeal, StorePricing } from '@/types';
import { calculateNutritionForServing } from './nutrition';

// Helper to calculate price per kg with validation
function calculatePricePerKg(price: number, packageSize: number, packageUnit: string): number | undefined {
  if (packageSize <= 0 || price < 0) {
    return undefined;
  }
  const unit = (packageUnit || 'g').toLowerCase();
  if (unit === 'g' || unit === 'ml') {
    return (price / packageSize) * 1000;
  } else if (unit === 'kg' || unit === 'l') {
    return price / packageSize;
  }
  return undefined;
}

const db = new Dexie('FoodTrackerDB') as Dexie & {
  foodEntries: EntityTable<FoodEntry, 'id'>;
  userGoals: EntityTable<UserGoals, 'id'>;
  savedFoods: EntityTable<SavedFood, 'id'>;
  mealTemplates: EntityTable<MealTemplate, 'id'>;
  mealTemplateItems: EntityTable<MealTemplateItem, 'id'>;
  dayTemplates: EntityTable<DayTemplate, 'id'>;
  dayTemplateMeals: EntityTable<DayTemplateMeal, 'id'>;
  storePricing: EntityTable<StorePricing, 'id'>;
};

db.version(1).stores({
  foodEntries: '++id, date, createdAt',
  userGoals: '++id',
});

db.version(2).stores({
  foodEntries: '++id, date, createdAt',
  userGoals: '++id',
  savedFoods: '++id, barcode, name',
});

db.version(3).stores({
  foodEntries: '++id, date, mealNumber, createdAt',
  userGoals: '++id',
  savedFoods: '++id, barcode, name',
  mealTemplates: '++id, name',
  mealTemplateItems: '++id, mealTemplateId, savedFoodId',
  dayTemplates: '++id, name',
  dayTemplateMeals: '++id, dayTemplateId, mealTemplateId',
});

// Version 4: Add storePricing table, migrate existing price/store data from savedFoods
db.version(4).stores({
  foodEntries: '++id, date, mealNumber, createdAt',
  userGoals: '++id',
  savedFoods: '++id, barcode, name',
  mealTemplates: '++id, name',
  mealTemplateItems: '++id, mealTemplateId, savedFoodId',
  dayTemplates: '++id, name',
  dayTemplateMeals: '++id, dayTemplateId, mealTemplateId',
  storePricing: '++id, savedFoodId, store',
}).upgrade(async (trans) => {
  // Migrate existing price/store data to storePricing table
  const savedFoods = await trans.table('savedFoods').toArray();
  const pricingEntries: Omit<StorePricing, 'id'>[] = [];

  for (const food of savedFoods) {
    // Only migrate if food has pricing data
    if (food.store && food.price && food.packageSize && food.id) {
      const pricePerKg = calculatePricePerKg(food.price, food.packageSize, food.packageUnit || 'g');

      pricingEntries.push({
        savedFoodId: food.id,
        store: food.store,
        price: food.price,
        packageSize: food.packageSize,
        packageUnit: food.packageUnit || 'g',
        pricePerKg,
        lastUpdated: new Date(),
      });
    }
  }

  if (pricingEntries.length > 0) {
    await trans.table('storePricing').bulkAdd(pricingEntries);
  }
});

// Food entries operations
export async function addFoodEntry(entry: Omit<FoodEntry, 'id'>): Promise<number> {
  const id = await db.foodEntries.add(entry as FoodEntry);
  return id as number;
}

export async function updateFoodEntry(id: number, entry: Partial<FoodEntry>): Promise<void> {
  await db.foodEntries.update(id, entry);
}

export async function deleteFoodEntry(id: number): Promise<void> {
  await db.foodEntries.delete(id);
}

export async function getFoodEntriesByDate(date: string): Promise<FoodEntry[]> {
  return await db.foodEntries.where('date').equals(date).toArray();
}

export async function getFoodEntriesForDateRange(startDate: string, endDate: string): Promise<FoodEntry[]> {
  return await db.foodEntries
    .where('date')
    .between(startDate, endDate, true, true)
    .toArray();
}

// User goals operations
export async function getGoals(): Promise<UserGoals | undefined> {
  const goals = await db.userGoals.toArray();
  return goals[0];
}

export async function setGoals(goals: Omit<UserGoals, 'id'>): Promise<void> {
  const existing = await db.userGoals.toArray();
  if (existing.length > 0 && existing[0].id !== undefined) {
    await db.userGoals.update(existing[0].id, goals);
  } else {
    await db.userGoals.add(goals as UserGoals);
  }
}

// Saved foods operations
export async function addSavedFood(food: Omit<SavedFood, 'id'>): Promise<number> {
  const id = await db.savedFoods.add(food as SavedFood);
  return id as number;
}

export async function getSavedFoods(): Promise<SavedFood[]> {
  return await db.savedFoods.orderBy('name').toArray();
}

export async function getSavedFoodByBarcode(barcode: string): Promise<SavedFood | undefined> {
  return await db.savedFoods.where('barcode').equals(barcode).first();
}

export async function searchSavedFoods(query: string): Promise<SavedFood[]> {
  const lowerQuery = query.toLowerCase();
  const all = await db.savedFoods.toArray();
  return all.filter(
    (f) =>
      f.name.toLowerCase().includes(lowerQuery) ||
      f.brand?.toLowerCase().includes(lowerQuery)
  );
}

export async function deleteSavedFood(id: number): Promise<void> {
  await db.savedFoods.delete(id);
}

export async function updateSavedFood(id: number, food: Partial<SavedFood>): Promise<void> {
  await db.savedFoods.update(id, food);
}

// Store pricing operations
export async function addStorePricing(pricing: Omit<StorePricing, 'id'>): Promise<number> {
  // Calculate price per kg if not provided
  if (pricing.pricePerKg === undefined) {
    pricing.pricePerKg = calculatePricePerKg(pricing.price, pricing.packageSize, pricing.packageUnit);
  }
  const id = await db.storePricing.add(pricing as StorePricing);
  return id as number;
}

export async function getStorePricingForFood(savedFoodId: number): Promise<StorePricing[]> {
  return await db.storePricing.where('savedFoodId').equals(savedFoodId).toArray();
}

export async function updateStorePricing(id: number, pricing: Partial<StorePricing>): Promise<void> {
  // Recalculate price per kg if price or package size changed
  if (pricing.price !== undefined || pricing.packageSize !== undefined || pricing.packageUnit !== undefined) {
    const existing = await db.storePricing.get(id);
    if (existing) {
      const price = pricing.price ?? existing.price;
      const packageSize = pricing.packageSize ?? existing.packageSize;
      const packageUnit = pricing.packageUnit ?? existing.packageUnit;
      pricing.pricePerKg = calculatePricePerKg(price, packageSize, packageUnit);
    }
  }
  await db.storePricing.update(id, pricing);
}

export async function deleteStorePricing(id: number): Promise<void> {
  await db.storePricing.delete(id);
}

// Delete saved food with cascade to pricing entries and meal template items
export async function deleteSavedFoodWithPricing(id: number): Promise<void> {
  await db.transaction('rw', db.savedFoods, db.storePricing, db.mealTemplateItems, async () => {
    await db.storePricing.where('savedFoodId').equals(id).delete();
    await db.mealTemplateItems.where('savedFoodId').equals(id).delete();
    await db.savedFoods.delete(id);
  });
}

/**
 * Resolve a FoodEntry to a savedFoodId.
 * Tries barcode lookup, then name match, then creates a new SavedFood.
 */
export async function findOrCreateSavedFoodFromEntry(entry: FoodEntry): Promise<number> {
  // 1. Try barcode lookup
  if (entry.barcode) {
    const found = await getSavedFoodByBarcode(entry.barcode);
    if (found?.id) return found.id;
  }

  // 2. Try name match
  const all = await db.savedFoods.toArray();
  const nameMatch = all.find(f => f.name === entry.name);
  if (nameMatch?.id) return nameMatch.id;

  // 3. Create new SavedFood from entry (back-calculate per-100g)
  const servingG = entry.servingSize || 100;
  const factor = 100 / servingG;
  return await addSavedFood({
    name: entry.name,
    barcode: entry.barcode,
    caloriesPer100g: Math.round(entry.calories * factor),
    proteinPer100g: Math.round(entry.protein * factor * 10) / 10,
    carbsPer100g: Math.round(entry.carbs * factor * 10) / 10,
    fatPer100g: Math.round(entry.fat * factor * 10) / 10,
    fiberPer100g: Math.round((entry.fiber || 0) * factor * 10) / 10,
    sugarPer100g: Math.round((entry.sugar || 0) * factor * 10) / 10,
    saltPer100g: Math.round((entry.salt || 0) * factor * 100) / 100,
    defaultServingSize: servingG,
    createdAt: new Date(),
  });
}

// Export all data as JSON
export async function exportData(): Promise<{ foodEntries: FoodEntry[]; userGoals: UserGoals | undefined; savedFoods: SavedFood[]; storePricing: StorePricing[] }> {
  const foodEntries = await db.foodEntries.toArray();
  const userGoals = await getGoals();
  const savedFoods = await getSavedFoods();
  const storePricing = await db.storePricing.toArray();
  return { foodEntries, userGoals, savedFoods, storePricing };
}

// Import data from JSON
export async function importData(data: { foodEntries: FoodEntry[]; userGoals?: UserGoals; savedFoods?: SavedFood[]; storePricing?: StorePricing[] }): Promise<void> {
  await db.transaction('rw', db.foodEntries, db.userGoals, db.savedFoods, db.storePricing, async () => {
    await db.foodEntries.clear();
    await db.userGoals.clear();
    await db.savedFoods.clear();
    await db.storePricing.clear();

    // Track old ID to new ID mapping for savedFoods
    const foodIdMap = new Map<number, number>();

    if (data.savedFoods && data.savedFoods.length > 0) {
      for (const food of data.savedFoods) {
        const { id: oldId, ...foodWithoutId } = food;
        const newId = await db.savedFoods.add(foodWithoutId as SavedFood);
        if (oldId !== undefined) {
          foodIdMap.set(oldId, newId as number);
        }
      }
    }

    if (data.foodEntries.length > 0) {
      const entriesWithoutIds = data.foodEntries.map(({ id: _id, ...entry }) => entry);
      await db.foodEntries.bulkAdd(entriesWithoutIds as FoodEntry[]);
    }

    if (data.userGoals) {
      const { id: _id, ...goalsWithoutId } = data.userGoals;
      await db.userGoals.add(goalsWithoutId as UserGoals);
    }

    if (data.storePricing && data.storePricing.length > 0) {
      for (const pricing of data.storePricing) {
        const { id: _id, savedFoodId, ...pricingWithoutId } = pricing;
        // Map to new savedFood ID
        const newSavedFoodId = foodIdMap.get(savedFoodId);
        if (newSavedFoodId !== undefined) {
          await db.storePricing.add({ ...pricingWithoutId, savedFoodId: newSavedFoodId } as StorePricing);
        }
      }
    }
  });
}

// Meal templates operations
export async function addMealTemplate(template: Omit<MealTemplate, 'id'>): Promise<number> {
  const id = await db.mealTemplates.add(template as MealTemplate);
  return id as number;
}

export async function getMealTemplates(): Promise<MealTemplate[]> {
  return await db.mealTemplates.orderBy('name').toArray();
}

export async function deleteMealTemplate(id: number): Promise<void> {
  await db.transaction('rw', db.mealTemplates, db.mealTemplateItems, db.dayTemplateMeals, async () => {
    await db.mealTemplateItems.where('mealTemplateId').equals(id).delete();
    await db.dayTemplateMeals.where('mealTemplateId').equals(id).delete();
    await db.mealTemplates.delete(id);
  });
}

export async function getMealTemplateWithItems(id: number): Promise<{ template: MealTemplate; items: (MealTemplateItem & { savedFood: SavedFood })[] } | undefined> {
  const template = await db.mealTemplates.get(id);
  if (!template) return undefined;

  const items = await db.mealTemplateItems.where('mealTemplateId').equals(id).toArray();
  const itemsWithFoods = await Promise.all(
    items.map(async (item) => {
      const savedFood = await db.savedFoods.get(item.savedFoodId);
      return { ...item, savedFood: savedFood! };
    })
  );

  return { template, items: itemsWithFoods };
}

// Meal template items operations
export async function addMealTemplateItem(item: Omit<MealTemplateItem, 'id'>): Promise<number> {
  const id = await db.mealTemplateItems.add(item as MealTemplateItem);
  return id as number;
}

export async function getMealTemplateItems(mealTemplateId: number): Promise<MealTemplateItem[]> {
  return await db.mealTemplateItems.where('mealTemplateId').equals(mealTemplateId).toArray();
}

export async function deleteMealTemplateItem(id: number): Promise<void> {
  await db.mealTemplateItems.delete(id);
}

// Day templates operations
export async function addDayTemplate(template: Omit<DayTemplate, 'id'>): Promise<number> {
  const id = await db.dayTemplates.add(template as DayTemplate);
  return id as number;
}

export async function getDayTemplates(): Promise<DayTemplate[]> {
  return await db.dayTemplates.orderBy('name').toArray();
}

export async function deleteDayTemplate(id: number): Promise<void> {
  await db.transaction('rw', db.dayTemplates, db.dayTemplateMeals, async () => {
    await db.dayTemplateMeals.where('dayTemplateId').equals(id).delete();
    await db.dayTemplates.delete(id);
  });
}

export async function getDayTemplateWithMeals(id: number): Promise<{ template: DayTemplate; meals: (DayTemplateMeal & { mealTemplate: MealTemplate })[] } | undefined> {
  const template = await db.dayTemplates.get(id);
  if (!template) return undefined;

  const meals = await db.dayTemplateMeals.where('dayTemplateId').equals(id).toArray();
  const mealsWithTemplates = await Promise.all(
    meals.map(async (meal) => {
      const mealTemplate = await db.mealTemplates.get(meal.mealTemplateId);
      return { ...meal, mealTemplate: mealTemplate! };
    })
  );

  return { template, meals: mealsWithTemplates.sort((a, b) => a.mealNumber - b.mealNumber) };
}

// Day template meals operations
export async function addDayTemplateMeal(meal: Omit<DayTemplateMeal, 'id'>): Promise<number> {
  const id = await db.dayTemplateMeals.add(meal as DayTemplateMeal);
  return id as number;
}

export async function getDayTemplateMeals(dayTemplateId: number): Promise<DayTemplateMeal[]> {
  return await db.dayTemplateMeals.where('dayTemplateId').equals(dayTemplateId).toArray();
}

export async function deleteDayTemplateMeal(id: number): Promise<void> {
  await db.dayTemplateMeals.delete(id);
}

// Apply templates to log
export async function applyMealTemplateToLog(mealTemplateId: number, date: string, mealNumber: number): Promise<void> {
  const templateData = await getMealTemplateWithItems(mealTemplateId);
  if (!templateData) return;

  const entries: Omit<FoodEntry, 'id'>[] = templateData.items.map((item) => {
    const nutrition = calculateNutritionForServing(item.savedFood, item.servingSize);
    return {
      date,
      barcode: item.savedFood.barcode,
      name: item.savedFood.name,
      servingSize: item.servingSize,
      servingUnit: 'g',
      ...nutrition,
      mealNumber,
      createdAt: new Date(),
    };
  });

  await db.foodEntries.bulkAdd(entries as FoodEntry[]);
}

export async function applyDayTemplateToLog(dayTemplateId: number, date: string): Promise<void> {
  const templateData = await getDayTemplateWithMeals(dayTemplateId);
  if (!templateData) return;

  for (const meal of templateData.meals) {
    await applyMealTemplateToLog(meal.mealTemplateId, date, meal.mealNumber);
  }
}

// Reset data - clears history and templates but keeps saved foods
export async function resetData(): Promise<void> {
  await db.transaction('rw', [db.foodEntries, db.mealTemplates, db.mealTemplateItems, db.dayTemplates, db.dayTemplateMeals], async () => {
    await db.foodEntries.clear();
    await db.mealTemplateItems.clear();
    await db.mealTemplates.clear();
    await db.dayTemplateMeals.clear();
    await db.dayTemplates.clear();
  });
}

export default db;
