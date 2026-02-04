import { describe, it, expect } from 'vitest';
import {
  calculateNutritionForServing,
  scaleNutrition,
  type NutritionPer100g,
  type CalculatedNutrition,
} from '../nutrition';

describe('calculateNutritionForServing', () => {
  const sampleFood: NutritionPer100g = {
    caloriesPer100g: 250,
    proteinPer100g: 10,
    carbsPer100g: 30,
    fatPer100g: 12,
    fiberPer100g: 3,
    sugarPer100g: 15,
    saltPer100g: 0.5,
  };

  it('calculates correct nutrition for 100g serving (same as per-100g)', () => {
    const result = calculateNutritionForServing(sampleFood, 100);
    expect(result.calories).toBe(250);
    expect(result.protein).toBe(10);
    expect(result.carbs).toBe(30);
    expect(result.fat).toBe(12);
    expect(result.fiber).toBe(3);
    expect(result.sugar).toBe(15);
    expect(result.salt).toBe(0.5);
  });

  it('calculates correct nutrition for 50g serving (half)', () => {
    const result = calculateNutritionForServing(sampleFood, 50);
    expect(result.calories).toBe(125);
    expect(result.protein).toBe(5);
    expect(result.carbs).toBe(15);
    expect(result.fat).toBe(6);
    expect(result.fiber).toBe(1.5);
    expect(result.sugar).toBe(7.5);
    expect(result.salt).toBe(0.25);
  });

  it('calculates correct nutrition for 200g serving (double)', () => {
    const result = calculateNutritionForServing(sampleFood, 200);
    expect(result.calories).toBe(500);
    expect(result.protein).toBe(20);
    expect(result.carbs).toBe(60);
    expect(result.fat).toBe(24);
    expect(result.fiber).toBe(6);
    expect(result.sugar).toBe(30);
    expect(result.salt).toBe(1);
  });

  it('rounds calories to whole numbers', () => {
    const food: NutritionPer100g = {
      caloriesPer100g: 33,
      proteinPer100g: 0,
      carbsPer100g: 0,
      fatPer100g: 0,
      fiberPer100g: 0,
      sugarPer100g: 0,
      saltPer100g: 0,
    };
    // 33 * 0.75 = 24.75, should round to 25
    const result = calculateNutritionForServing(food, 75);
    expect(result.calories).toBe(25);
  });

  it('rounds macros to 1 decimal place', () => {
    const food: NutritionPer100g = {
      caloriesPer100g: 0,
      proteinPer100g: 10.55,
      carbsPer100g: 20.34,
      fatPer100g: 5.67,
      fiberPer100g: 2.11,
      sugarPer100g: 3.89,
      saltPer100g: 0,
    };
    // 75g: multiply by 0.75
    const result = calculateNutritionForServing(food, 75);
    // 10.55 * 0.75 = 7.9125 -> 7.9
    expect(result.protein).toBe(7.9);
    // 20.34 * 0.75 = 15.255 -> 15.3
    expect(result.carbs).toBe(15.3);
    // 5.67 * 0.75 = 4.2525 -> 4.3
    expect(result.fat).toBe(4.3);
  });

  it('rounds salt to 2 decimal places', () => {
    const food: NutritionPer100g = {
      caloriesPer100g: 0,
      proteinPer100g: 0,
      carbsPer100g: 0,
      fatPer100g: 0,
      fiberPer100g: 0,
      sugarPer100g: 0,
      saltPer100g: 1.234,
    };
    // 75g: 1.234 * 0.75 = 0.9255 -> 0.93
    const result = calculateNutritionForServing(food, 75);
    expect(result.salt).toBe(0.93);
  });

  it('handles zero serving size', () => {
    const result = calculateNutritionForServing(sampleFood, 0);
    expect(result.calories).toBe(0);
    expect(result.protein).toBe(0);
    expect(result.carbs).toBe(0);
    expect(result.fat).toBe(0);
    expect(result.fiber).toBe(0);
    expect(result.sugar).toBe(0);
    expect(result.salt).toBe(0);
  });

  it('handles very small serving sizes', () => {
    const result = calculateNutritionForServing(sampleFood, 1);
    expect(result.calories).toBe(3); // 250 * 0.01 = 2.5 -> 3
    expect(result.protein).toBe(0.1);
    expect(result.carbs).toBe(0.3);
  });

  it('handles very large serving sizes', () => {
    const result = calculateNutritionForServing(sampleFood, 1000);
    expect(result.calories).toBe(2500);
    expect(result.protein).toBe(100);
  });
});

describe('scaleNutrition', () => {
  const sampleNutrition: CalculatedNutrition = {
    calories: 250,
    protein: 10,
    carbs: 30,
    fat: 12,
    fiber: 3,
    sugar: 15,
    salt: 0.5,
  };

  it('scales by 1 (no change)', () => {
    const result = scaleNutrition(sampleNutrition, 1);
    expect(result.calories).toBe(250);
    expect(result.protein).toBe(10);
    expect(result.carbs).toBe(30);
  });

  it('scales by 2 (double)', () => {
    const result = scaleNutrition(sampleNutrition, 2);
    expect(result.calories).toBe(500);
    expect(result.protein).toBe(20);
    expect(result.carbs).toBe(60);
    expect(result.fat).toBe(24);
    expect(result.salt).toBe(1);
  });

  it('scales by 0.5 (half)', () => {
    const result = scaleNutrition(sampleNutrition, 0.5);
    expect(result.calories).toBe(125);
    expect(result.protein).toBe(5);
    expect(result.carbs).toBe(15);
    expect(result.salt).toBe(0.25);
  });

  it('scales by 0 (zero)', () => {
    const result = scaleNutrition(sampleNutrition, 0);
    expect(result.calories).toBe(0);
    expect(result.protein).toBe(0);
    expect(result.carbs).toBe(0);
    expect(result.fat).toBe(0);
    expect(result.fiber).toBe(0);
    expect(result.sugar).toBe(0);
    expect(result.salt).toBe(0);
  });

  it('applies proper rounding when scaling', () => {
    const nutrition: CalculatedNutrition = {
      calories: 100,
      protein: 7.5,
      carbs: 12.3,
      fat: 4.7,
      fiber: 2.1,
      sugar: 8.9,
      salt: 0.33,
    };
    // Scale by 1.5
    const result = scaleNutrition(nutrition, 1.5);
    // 100 * 1.5 = 150
    expect(result.calories).toBe(150);
    // 7.5 * 1.5 = 11.25 -> 11.3
    expect(result.protein).toBe(11.3);
    // 0.33 * 1.5 = 0.495 -> 0.50
    expect(result.salt).toBe(0.5);
  });
});
