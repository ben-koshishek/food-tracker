import type { OpenFoodFactsProduct, NormalizedProduct, NutriScoreGrade, NovaGroup } from '@/types';
import { calculateNutritionForServing, type CalculatedNutrition } from './nutrition';

// Use proxy in development to avoid CORS issues
const BASE_URL = import.meta.env.DEV
  ? '/api/off'
  : 'https://world.openfoodfacts.org/api/v2';

interface SearchResponse {
  count: number;
  page: number;
  page_size: number;
  products: OpenFoodFactsProduct[];
}

interface ProductResponse {
  code: string;
  product: OpenFoodFactsProduct;
  status: number;
  status_verbose: string;
}

// Normalize Nutri-Score grade from API
function normalizeNutriScore(grade: string | undefined): NutriScoreGrade {
  if (!grade) return 'unknown';
  const lowerGrade = grade.toLowerCase();
  if (lowerGrade === 'a' || lowerGrade === 'b' || lowerGrade === 'c' || lowerGrade === 'd' || lowerGrade === 'e') {
    return lowerGrade;
  }
  return 'unknown';
}

// Normalize NOVA group from API
function normalizeNovaGroup(group: number | undefined): NovaGroup {
  if (group === 1 || group === 2 || group === 3 || group === 4) {
    return group;
  }
  return null;
}

// Parse serving size string to extract unit name and weight
// Examples: "60g", "1 egg (60g)", "1 slice (30g)", "100ml"
function parseServingUnit(servingSize: string | undefined, servingQuantity: number | undefined): { unitName?: string; unitWeight?: number } {
  // If we have servingQuantity, use it as the serving weight
  // This is the grams per serving from the API
  let unitWeight = servingQuantity;
  let unitName: string | undefined;

  if (servingSize) {
    // Try to extract unit name from patterns like "1 egg (60g)" or "1 slice"
    const unitMatch = servingSize.match(/^(\d+)\s*([a-zA-ZäöüÄÖÜß]+(?:\s+[a-zA-ZäöüÄÖÜß]+)?)/i);
    if (unitMatch) {
      const count = parseInt(unitMatch[1]);
      const possibleUnit = unitMatch[2].toLowerCase().trim();

      // Only use as unit name if it's not just a weight unit
      if (!['g', 'ml', 'kg', 'l', 'oz', 'lb'].includes(possibleUnit)) {
        unitName = possibleUnit;
        // Adjust weight for count (e.g., "2 slices (60g)" means 30g per slice)
        if (unitWeight && count > 1) {
          unitWeight = unitWeight / count;
        }
      }
    }

    // If no servingQuantity, try to parse weight from string like "(60g)"
    if (!unitWeight) {
      const weightMatch = servingSize.match(/(\d+(?:\.\d+)?)\s*g/i);
      if (weightMatch) {
        unitWeight = parseFloat(weightMatch[1]);
      }
    }
  }

  return { unitName, unitWeight };
}

function normalizeProduct(product: OpenFoodFactsProduct): NormalizedProduct | null {
  // Skip products without essential nutrition data
  const calories = product.nutriments['energy-kcal_100g'] ?? product.nutriments['energy-kcal'];
  if (calories === undefined) {
    return null;
  }

  // Prefer German name if available
  const name = product.product_name_de || product.product_name;
  if (!name) {
    return null;
  }

  const n = product.nutriments;

  return {
    barcode: product.code,
    name,
    brand: product.brands,
    // Quality scores
    nutriScoreGrade: normalizeNutriScore(product.nutriscore_grade),
    nutriScoreScore: product.nutriscore_score,
    novaGroup: normalizeNovaGroup(product.nova_group),
    // Core macros
    caloriesPer100g: calories,
    proteinPer100g: n.proteins_100g ?? 0,
    carbsPer100g: n.carbohydrates_100g ?? 0,
    fatPer100g: n.fat_100g ?? 0,
    fiberPer100g: n.fiber_100g ?? 0,
    sugarPer100g: n.sugars_100g ?? 0,
    saltPer100g: n.salt_100g ?? 0,
    // Extended fats
    saturatedFatPer100g: n['saturated-fat_100g'],
    transFatPer100g: n['trans-fat_100g'],
    cholesterolPer100g: n.cholesterol_100g,
    monounsaturatedFatPer100g: n['monounsaturated-fat_100g'],
    polyunsaturatedFatPer100g: n['polyunsaturated-fat_100g'],
    omega3FatPer100g: n['omega-3-fat_100g'],
    omega6FatPer100g: n['omega-6-fat_100g'],
    // Minerals
    sodiumPer100g: n.sodium_100g,
    calciumPer100g: n.calcium_100g,
    ironPer100g: n.iron_100g,
    potassiumPer100g: n.potassium_100g,
    magnesiumPer100g: n.magnesium_100g,
    zincPer100g: n.zinc_100g,
    phosphorusPer100g: n.phosphorus_100g,
    iodinePer100g: n.iodine_100g,
    seleniumPer100g: n.selenium_100g,
    copperPer100g: n.copper_100g,
    manganesePer100g: n.manganese_100g,
    // Vitamins
    vitaminAPer100g: n['vitamin-a_100g'],
    vitaminB1Per100g: n['vitamin-b1_100g'],
    vitaminB2Per100g: n['vitamin-b2_100g'],
    vitaminB3Per100g: n['vitamin-b3_100g'],
    vitaminB5Per100g: n['vitamin-b5_100g'],
    vitaminB6Per100g: n['vitamin-b6_100g'],
    vitaminB9Per100g: n['vitamin-b9_100g'],
    vitaminB12Per100g: n['vitamin-b12_100g'],
    vitaminCPer100g: n['vitamin-c_100g'],
    vitaminDPer100g: n['vitamin-d_100g'],
    vitaminEPer100g: n['vitamin-e_100g'],
    vitaminKPer100g: n['vitamin-k_100g'],
    // Other
    caffeinePer100g: n.caffeine_100g,
    alcoholPer100g: n.alcohol_100g,
    fruitsVegetablesNutsPer100g: n['fruits-vegetables-nuts_100g'],
    // Serving info - serving_quantity can be string or number from API
    servingSize: product.serving_size,
    servingQuantity: product.serving_quantity ? Number(product.serving_quantity) : undefined,
    ...parseServingUnit(product.serving_size, product.serving_quantity ? Number(product.serving_quantity) : undefined),
    imageUrl: product.image_small_url || product.image_url,
  };
}

export async function searchProducts(
  query: string,
  options: { page?: number; pageSize?: number } = {}
): Promise<{ products: NormalizedProduct[]; totalCount: number }> {
  const { page = 1, pageSize = 20 } = options;

  const params = new URLSearchParams({
    search_terms: query,
    countries_tags: 'germany',
    page_size: pageSize.toString(),
    page: page.toString(),
    fields: 'code,product_name,product_name_de,brands,nutriscore_grade,nutriscore_score,nova_group,nutriments,serving_size,serving_quantity,image_url,image_small_url',
  });

  const response = await fetch(`${BASE_URL}/search?${params}`);

  if (!response.ok) {
    throw new Error(`Failed to search products: ${response.status}`);
  }

  const data: SearchResponse = await response.json();

  const products = data.products
    .map(normalizeProduct)
    .filter((p): p is NormalizedProduct => p !== null);

  return {
    products,
    totalCount: data.count,
  };
}

export interface PartialProduct {
  barcode: string;
  name: string;
  brand?: string;
  imageUrl?: string;
}

export async function getProductByBarcode(barcode: string): Promise<NormalizedProduct | null> {
  const response = await fetch(`${BASE_URL}/product/${barcode}`);

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(`Failed to fetch product: ${response.status}`);
  }

  const data: ProductResponse = await response.json();

  if (data.status !== 1) {
    return null;
  }

  return normalizeProduct(data.product);
}

export async function getProductByBarcodePartial(barcode: string): Promise<PartialProduct | null> {
  const response = await fetch(`${BASE_URL}/product/${barcode}`);

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to fetch product: ${response.status}`);
  }

  const data: ProductResponse = await response.json();
  if (data.status !== 1) return null;

  const p = data.product;
  const name = p.product_name_de || p.product_name;
  if (!name) return null;

  return {
    barcode: p.code,
    name,
    brand: p.brands,
    imageUrl: p.image_small_url || p.image_url,
  };
}

// Calculate nutrition for a given serving size
// Re-export from nutrition.ts for backwards compatibility
export function calculateNutrition(
  product: NormalizedProduct,
  servingGrams: number
): CalculatedNutrition {
  return calculateNutritionForServing(product, servingGrams);
}
