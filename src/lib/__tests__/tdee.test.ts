import { describe, it, expect } from 'vitest';
import {
  calculateBMR,
  calculateTDEE,
  calculateGoalCalories,
  calculateMacros,
} from '../tdee';

describe('calculateBMR', () => {
  it('calculates BMR for a male (80kg, 180cm, 30yo)', () => {
    // (10*80) + (6.25*180) - (5*30) + 5 = 800 + 1125 - 150 + 5 = 1780
    expect(calculateBMR('male', 80, 180, 30)).toBe(1780);
  });

  it('calculates BMR for a female (60kg, 165cm, 25yo)', () => {
    // (10*60) + (6.25*165) - (5*25) - 161 = 600 + 1031.25 - 125 - 161 = 1345.25 -> 1345
    expect(calculateBMR('female', 60, 165, 25)).toBe(1345);
  });

  it('rounds to whole number', () => {
    // (10*75) + (6.25*175) - (5*28) + 5 = 750 + 1093.75 - 140 + 5 = 1708.75 -> 1709
    expect(calculateBMR('male', 75, 175, 28)).toBe(1709);
  });
});

describe('calculateTDEE', () => {
  it('applies sedentary multiplier', () => {
    // 1780 * 1.2 = 2136
    expect(calculateTDEE(1780, 'sedentary')).toBe(2136);
  });

  it('applies moderately active multiplier', () => {
    // 1780 * 1.55 = 2759
    expect(calculateTDEE(1780, 'moderately_active')).toBe(2759);
  });

  it('applies very active multiplier', () => {
    // 1780 * 1.9 = 3382
    expect(calculateTDEE(1780, 'very_active')).toBe(3382);
  });
});

describe('calculateGoalCalories', () => {
  it('applies fat loss deficit (20%)', () => {
    // 2500 * 0.80 = 2000
    expect(calculateGoalCalories(2500, 'fat_loss')).toBe(2000);
  });

  it('keeps maintenance at TDEE', () => {
    expect(calculateGoalCalories(2500, 'maintenance')).toBe(2500);
  });

  it('applies muscle gain surplus (10%)', () => {
    // 2500 * 1.10 = 2750
    expect(calculateGoalCalories(2500, 'muscle_gain')).toBe(2750);
  });

  it('applies lean recomp deficit (10%)', () => {
    // 2500 * 0.90 = 2250
    expect(calculateGoalCalories(2500, 'lean_recomp')).toBe(2250);
  });

  it('keeps recomposition at TDEE', () => {
    expect(calculateGoalCalories(2500, 'recomposition')).toBe(2500);
  });
});

describe('calculateMacros', () => {
  it('calculates macros for fat loss (80kg)', () => {
    const result = calculateMacros(2000, 80, 'fat_loss');
    // Protein: 80 * 2.0 = 160g
    expect(result.protein).toBe(160);
    // Fat: 2000 * 0.30 / 9 = 66.67 -> 67g
    expect(result.fat).toBe(67);
    // Carbs: (2000 - 160*4 - 67*9) / 4 = (2000 - 640 - 603) / 4 = 757/4 = 189.25 -> 189g
    expect(result.carbs).toBe(189);
  });

  it('calculates macros for muscle gain (80kg)', () => {
    const result = calculateMacros(2750, 80, 'muscle_gain');
    // Protein: 80 * 1.8 = 144g
    expect(result.protein).toBe(144);
    // Fat: 2750 * 0.30 / 9 = 91.67 -> 92g
    expect(result.fat).toBe(92);
    // Carbs: (2750 - 144*4 - 92*9) / 4 = (2750 - 576 - 828) / 4 = 1346/4 = 336.5 -> 337
    expect(result.carbs).toBe(337);
  });

  it('calculates macros for lean recomp (very high protein)', () => {
    const result = calculateMacros(2250, 80, 'lean_recomp');
    // Protein: 80 * 2.2 = 176g
    expect(result.protein).toBe(176);
    // Fat: 2250 * 0.30 / 9 = 75g
    expect(result.fat).toBe(75);
    // Carbs: (2250 - 176*4 - 75*9) / 4 = (2250 - 704 - 675) / 4 = 871/4 = 217.75 -> 218
    expect(result.carbs).toBe(218);
  });

  it('calculates macros for recomposition (high protein)', () => {
    const result = calculateMacros(2500, 80, 'recomposition');
    // Protein: 80 * 2.2 = 176g
    expect(result.protein).toBe(176);
  });

  it('does not return negative carbs', () => {
    // Very low calories with heavy person = protein could exceed budget
    const result = calculateMacros(800, 100, 'recomposition');
    expect(result.carbs).toBeGreaterThanOrEqual(0);
  });
});
