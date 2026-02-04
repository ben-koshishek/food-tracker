import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  getSavedFoods,
  searchSavedFoods,
  getSavedFoodByBarcode,
  addSavedFood,
  deleteSavedFoodWithPricing,
  addFoodEntry,
} from '@/lib/db';
import { getProductByBarcode, getProductByBarcodePartial, calculateNutrition } from '@/lib/open-food-facts';
import { calculateNutritionForServing } from '@/lib/nutrition';
import { NutriScoreBadge } from '@/components/NutriScoreBadge';
import { NovaGroupBadge } from '@/components/NovaGroupBadge';
import { StorePricingDialog } from '@/components/StorePricingDialog';
import type { SavedFood, NormalizedProduct, FoodCategory } from '@/types';

const CATEGORY_LABELS: Record<FoodCategory, string> = {
  protein: 'Protein',
  carbs: 'Carbs',
  fat: 'Fat',
  dairy: 'Dairy',
  vegetable: 'Vegetable',
  fruit: 'Fruit',
  condiment: 'Condiment',
  beverage: 'Beverage',
  snack: 'Snack',
  other: 'Other',
};

const CATEGORY_COLORS: Record<FoodCategory, string> = {
  protein: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  carbs: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  fat: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  dairy: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  vegetable: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  fruit: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  condiment: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  beverage: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  snack: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
};

// Helper to convert NormalizedProduct to SavedFood data
function normalizedProductToSavedFood(product: NormalizedProduct, defaultServing: number): Omit<SavedFood, 'id'> {
  return {
    barcode: product.barcode,
    name: product.name,
    brand: product.brand,
    // Quality scores
    nutriScoreGrade: product.nutriScoreGrade,
    nutriScoreScore: product.nutriScoreScore,
    novaGroup: product.novaGroup,
    // Core macros
    caloriesPer100g: product.caloriesPer100g,
    proteinPer100g: product.proteinPer100g,
    carbsPer100g: product.carbsPer100g,
    fatPer100g: product.fatPer100g,
    fiberPer100g: product.fiberPer100g,
    sugarPer100g: product.sugarPer100g,
    saltPer100g: product.saltPer100g,
    // Extended fats
    saturatedFatPer100g: product.saturatedFatPer100g,
    transFatPer100g: product.transFatPer100g,
    cholesterolPer100g: product.cholesterolPer100g,
    monounsaturatedFatPer100g: product.monounsaturatedFatPer100g,
    polyunsaturatedFatPer100g: product.polyunsaturatedFatPer100g,
    omega3FatPer100g: product.omega3FatPer100g,
    omega6FatPer100g: product.omega6FatPer100g,
    // Minerals
    sodiumPer100g: product.sodiumPer100g,
    calciumPer100g: product.calciumPer100g,
    ironPer100g: product.ironPer100g,
    potassiumPer100g: product.potassiumPer100g,
    magnesiumPer100g: product.magnesiumPer100g,
    zincPer100g: product.zincPer100g,
    phosphorusPer100g: product.phosphorusPer100g,
    iodinePer100g: product.iodinePer100g,
    seleniumPer100g: product.seleniumPer100g,
    copperPer100g: product.copperPer100g,
    manganesePer100g: product.manganesePer100g,
    // Vitamins
    vitaminAPer100g: product.vitaminAPer100g,
    vitaminB1Per100g: product.vitaminB1Per100g,
    vitaminB2Per100g: product.vitaminB2Per100g,
    vitaminB3Per100g: product.vitaminB3Per100g,
    vitaminB5Per100g: product.vitaminB5Per100g,
    vitaminB6Per100g: product.vitaminB6Per100g,
    vitaminB9Per100g: product.vitaminB9Per100g,
    vitaminB12Per100g: product.vitaminB12Per100g,
    vitaminCPer100g: product.vitaminCPer100g,
    vitaminDPer100g: product.vitaminDPer100g,
    vitaminEPer100g: product.vitaminEPer100g,
    vitaminKPer100g: product.vitaminKPer100g,
    // Other
    caffeinePer100g: product.caffeinePer100g,
    alcoholPer100g: product.alcoholPer100g,
    fruitsVegetablesNutsPer100g: product.fruitsVegetablesNutsPer100g,
    // Serving & display
    defaultServingSize: defaultServing,
    servingUnitName: product.servingUnitName,
    servingUnitWeight: product.servingUnitWeight,
    servingSizeFromApi: product.servingSize,
    imageUrl: product.imageUrl,
    createdAt: new Date(),
  };
}

export function MyFoods() {
  const navigate = useNavigate();
  const [foods, setFoods] = useState<SavedFood[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(true);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<FoodCategory | 'all'>('all');

  // For adding to log
  const [selectedFood, setSelectedFood] = useState<SavedFood | null>(null);
  const [servingSize, setServingSize] = useState('100');
  const [useServingUnit, setUseServingUnit] = useState(false);

  // For new food from barcode
  const [newProduct, setNewProduct] = useState<NormalizedProduct | null>(null);
  const [newServingSize, setNewServingSize] = useState('100');

  // For custom food creation
  const [showCustomFood, setShowCustomFood] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customBrand, setCustomBrand] = useState('');
  const [customCalories, setCustomCalories] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customFat, setCustomFat] = useState('');
  const [customServing, setCustomServing] = useState('100');

  // For pricing dialog
  const [pricingFood, setPricingFood] = useState<SavedFood | null>(null);

  // Get unique categories from foods
  const availableCategories = useMemo(() => {
    const categories = new Set<FoodCategory>();
    foods.forEach(food => {
      if (food.category) {
        categories.add(food.category);
      }
    });
    return Array.from(categories).sort();
  }, [foods]);

  // Filter foods by category
  const filteredFoods = useMemo(() => {
    if (selectedCategory === 'all') return foods;
    return foods.filter(food => food.category === selectedCategory);
  }, [foods, selectedCategory]);

  const loadFoods = useCallback(async () => {
    setLoading(true);
    try {
      const data = searchQuery.trim()
        ? await searchSavedFoods(searchQuery)
        : await getSavedFoods();
      setFoods(data);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadFoods();
  }, [loadFoods]);

  const handleBarcodeSearch = async () => {
    if (!barcode.trim()) return;

    setLookupLoading(true);
    setError(null);

    try {
      // First check local database
      const localFood = await getSavedFoodByBarcode(barcode.trim());
      if (localFood) {
        setSelectedFood(localFood);
        setServingSize(localFood.defaultServingSize.toString());
        setBarcode('');
        setLookupLoading(false);
        return;
      }

      // Query Open Food Facts
      const product = await getProductByBarcode(barcode.trim());
      if (product) {
        setNewProduct(product);
        // Use API serving size if available, otherwise default to 100g
        setNewServingSize((product.servingUnitWeight || product.servingQuantity || 100).toString());
        setBarcode('');
      } else {
        // Product might exist but have no nutrition data — pre-fill custom form
        const partial = await getProductByBarcodePartial(barcode.trim());
        if (partial) {
          setCustomName(partial.name);
          setCustomBrand(partial.brand || '');
          setShowCustomFood(true);
          setBarcode('');
        } else {
          setError('Product not found. Check the barcode and try again.');
        }
      }
    } catch {
      setError('Failed to lookup barcode. Please try again.');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSaveNewFood = async () => {
    if (!newProduct) return;

    const defaultServing = parseFloat(newServingSize) || 100;
    await addSavedFood(normalizedProductToSavedFood(newProduct, defaultServing));

    setNewProduct(null);
    loadFoods();
  };

  const handleSaveAndLog = async () => {
    if (!newProduct) return;

    const servingGrams = parseFloat(newServingSize) || 100;
    const nutrition = calculateNutrition(newProduct, servingGrams);
    const today = new Date().toISOString().split('T')[0];

    // Save to personal database with all nutrients
    await addSavedFood(normalizedProductToSavedFood(newProduct, servingGrams));

    // Add to today's log
    await addFoodEntry({
      date: today,
      barcode: newProduct.barcode,
      name: newProduct.brand ? `${newProduct.name} (${newProduct.brand})` : newProduct.name,
      servingSize: servingGrams,
      servingUnit: 'g',
      calories: nutrition.calories,
      protein: nutrition.protein,
      carbs: nutrition.carbs,
      fat: nutrition.fat,
      fiber: nutrition.fiber,
      sugar: nutrition.sugar,
      salt: nutrition.salt,
      createdAt: new Date(),
    });

    setNewProduct(null);
    loadFoods();
    navigate('/log');
  };

  const handleLogFood = async () => {
    if (!selectedFood) return;

    const servingGrams = getGramsFromServing(selectedFood, servingSize, useServingUnit) || selectedFood.defaultServingSize;
    const nutrition = calculateNutritionForServing(selectedFood, servingGrams);
    const today = new Date().toISOString().split('T')[0];

    // Determine display unit
    const displayUnit = useServingUnit && selectedFood.servingUnitName
      ? selectedFood.servingUnitName
      : 'g';
    const displaySize = useServingUnit && selectedFood.servingUnitName
      ? parseFloat(servingSize) || 1
      : servingGrams;

    await addFoodEntry({
      date: today,
      barcode: selectedFood.barcode,
      name: selectedFood.brand ? `${selectedFood.name} (${selectedFood.brand})` : selectedFood.name,
      servingSize: displaySize,
      servingUnit: displayUnit,
      ...nutrition,
      createdAt: new Date(),
    });

    setSelectedFood(null);
    setUseServingUnit(false);
    navigate('/log');
  };

  const handleDeleteFood = async (id: number) => {
    try {
      await deleteSavedFoodWithPricing(id);
      loadFoods();
    } catch {
      setError('Failed to delete food. Please try again.');
    }
  };

  const resetCustomForm = () => {
    setCustomName('');
    setCustomBrand('');
    setCustomCalories('');
    setCustomProtein('');
    setCustomCarbs('');
    setCustomFat('');
    setCustomServing('100');
    setShowCustomFood(false);
  };

  const buildCustomFood = (): Omit<SavedFood, 'id'> => ({
    name: customName.trim(),
    brand: customBrand.trim() || undefined,
    caloriesPer100g: parseFloat(customCalories) || 0,
    proteinPer100g: parseFloat(customProtein) || 0,
    carbsPer100g: parseFloat(customCarbs) || 0,
    fatPer100g: parseFloat(customFat) || 0,
    fiberPer100g: 0,
    sugarPer100g: 0,
    saltPer100g: 0,
    defaultServingSize: parseFloat(customServing) || 100,
    createdAt: new Date(),
  });

  const handleSaveCustomFood = async () => {
    if (!customName.trim()) return;
    await addSavedFood(buildCustomFood());
    resetCustomForm();
    loadFoods();
  };

  const handleSaveCustomAndLog = async () => {
    if (!customName.trim()) return;
    const food = buildCustomFood();
    const servingGrams = parseFloat(customServing) || 100;
    const nutrition = calculateNutritionForServing(food, servingGrams);
    const today = new Date().toISOString().split('T')[0];

    await addSavedFood(food);
    await addFoodEntry({
      date: today,
      name: food.brand ? `${food.name} (${food.brand})` : food.name,
      servingSize: servingGrams,
      servingUnit: 'g',
      ...nutrition,
      createdAt: new Date(),
    });

    resetCustomForm();
    loadFoods();
    navigate('/log');
  };

  const customPreview = customName.trim()
    ? calculateNutritionForServing({
        caloriesPer100g: parseFloat(customCalories) || 0,
        proteinPer100g: parseFloat(customProtein) || 0,
        carbsPer100g: parseFloat(customCarbs) || 0,
        fatPer100g: parseFloat(customFat) || 0,
        fiberPer100g: 0,
        sugarPer100g: 0,
        saltPer100g: 0,
      }, parseFloat(customServing) || 100)
    : null;

  const calculatePreview = (food: { caloriesPer100g: number; proteinPer100g: number; carbsPer100g: number; fatPer100g: number; fiberPer100g: number; sugarPer100g: number; saltPer100g: number }, grams: number) => {
    return calculateNutritionForServing(food, grams);
  };

  const newProductPreview = newProduct
    ? calculatePreview(newProduct, parseFloat(newServingSize) || 100)
    : null;

  // Calculate grams from serving size (handles both grams and unit-based input)
  const getGramsFromServing = (food: SavedFood, inputValue: string, isUnitBased: boolean): number => {
    const value = parseFloat(inputValue) || 0;
    if (isUnitBased && food.servingUnitWeight) {
      return value * food.servingUnitWeight;
    }
    return value;
  };

  const selectedFoodPreview = selectedFood
    ? calculatePreview(selectedFood, getGramsFromServing(selectedFood, servingSize, useServingUnit) || 100)
    : null;

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Foods</h1>
        <span className="text-sm text-muted-foreground">{foods.length} foods saved</span>
      </div>

      {/* Add food - barcode or custom */}
      <Card className="border-2 border-dashed border-primary/30 bg-primary-50/30 dark:bg-primary-900/10">
        <CardContent className="py-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Add Food</h3>
              <p className="text-sm text-muted-foreground">Scan a barcode or create your own</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Input
                placeholder="Barcode (e.g., 4014400900057)"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleBarcodeSearch()}
                className="flex-1 sm:w-64 bg-background"
              />
              <Button onClick={handleBarcodeSearch} disabled={lookupLoading}>
                {lookupLoading ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  'Lookup'
                )}
              </Button>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-px bg-border flex-1" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="h-px bg-border flex-1" />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowCustomFood(true)}
            className="mt-3 w-full sm:w-auto"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Custom Food
          </Button>
          {error && (
            <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search and filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <Input
            placeholder="Search your foods..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category filter chips */}
        {availableCategories.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              All
            </button>
            {availableCategories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                  selectedCategory === category
                    ? CATEGORY_COLORS[category]
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {CATEGORY_LABELS[category]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Food list */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-40 bg-muted rounded-lg" />
            </div>
          ))}
        </div>
      ) : filteredFoods.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            {searchQuery || selectedCategory !== 'all' ? (
              <>
                <h3 className="font-medium text-lg mb-1">No foods found</h3>
                <p className="text-muted-foreground">Try adjusting your search or filter.</p>
              </>
            ) : (
              <>
                <h3 className="font-medium text-lg mb-1">No saved foods yet</h3>
                <p className="text-muted-foreground mb-4">Start by scanning a barcode or looking up a product.</p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredFoods.map((food) => (
            <Card
              key={food.id}
              className="cursor-pointer group hover:shadow-md transition-all overflow-hidden"
              onClick={() => {
                setSelectedFood(food);
                // Default to unit-based input if available
                if (food.servingUnitName && food.servingUnitWeight) {
                  setUseServingUnit(true);
                  setServingSize((food.defaultServingSize / food.servingUnitWeight).toFixed(1));
                } else {
                  setUseServingUnit(false);
                  setServingSize(food.defaultServingSize.toString());
                }
              }}
            >
              {/* Food image header */}
              <div className="relative h-24 bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center overflow-hidden">
                {food.imageUrl ? (
                  <img
                    src={food.imageUrl}
                    alt={food.name}
                    className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <svg className="w-12 h-12 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z" />
                  </svg>
                )}
                {food.category && (
                  <div className={`absolute top-2 right-2 px-2 py-0.5 text-xs font-medium rounded ${CATEGORY_COLORS[food.category]}`}>
                    {CATEGORY_LABELS[food.category]}
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm hover:bg-destructive hover:text-destructive-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (food.id) handleDeleteFood(food.id);
                  }}
                  aria-label={`Delete ${food.name}`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </Button>
              </div>

              <CardContent className="py-3">
                <h4 className="font-medium truncate">{food.name}</h4>
                {food.brand && (
                  <p className="text-sm text-muted-foreground truncate">{food.brand}</p>
                )}

                {/* Quality score badges */}
                {(food.nutriScoreGrade && food.nutriScoreGrade !== 'unknown') || food.novaGroup ? (
                  <div className="flex gap-1.5 mt-2">
                    {food.nutriScoreGrade && <NutriScoreBadge grade={food.nutriScoreGrade} />}
                    {food.novaGroup && <NovaGroupBadge group={food.novaGroup} />}
                  </div>
                ) : null}

                {/* Nutrition badges */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <Badge className="border-0 text-xs" style={{ backgroundColor: 'color-mix(in srgb, var(--macro-calories) 20%, transparent)', color: 'var(--macro-calories)' }}>
                    {Math.round(food.caloriesPer100g)} kcal
                  </Badge>
                  <Badge variant="outline" className="text-xs" style={{ borderColor: 'var(--macro-protein)', color: 'var(--macro-protein)' }}>
                    P: {Math.round(food.proteinPer100g)}g
                  </Badge>
                  <Badge variant="outline" className="text-xs" style={{ borderColor: 'var(--macro-carbs)', color: 'var(--macro-carbs)' }}>
                    C: {Math.round(food.carbsPer100g)}g
                  </Badge>
                  <Badge variant="outline" className="text-xs" style={{ borderColor: 'var(--macro-fat)', color: 'var(--macro-fat)' }}>
                    F: {Math.round(food.fatPer100g)}g
                  </Badge>
                </div>

                {/* Pricing button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 h-8 w-full text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPricingFood(food);
                  }}
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Add/View Prices
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog for logging saved food */}
      <Dialog open={selectedFood !== null} onOpenChange={(open) => !open && setSelectedFood(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Log</DialogTitle>
          </DialogHeader>
          {selectedFood && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {selectedFood.imageUrl && (
                  <img
                    src={selectedFood.imageUrl}
                    alt={selectedFood.name}
                    className="w-16 h-16 object-contain rounded"
                  />
                )}
                <div>
                  <h4 className="font-medium">{selectedFood.name}</h4>
                  {selectedFood.brand && (
                    <p className="text-sm text-muted-foreground">{selectedFood.brand}</p>
                  )}
                  <div className="flex gap-2 mt-1">
                    {selectedFood.category && (
                      <Badge variant="outline" className="text-xs">{selectedFood.category}</Badge>
                    )}
                    {selectedFood.nutriScoreGrade && <NutriScoreBadge grade={selectedFood.nutriScoreGrade} />}
                    {selectedFood.novaGroup && <NovaGroupBadge group={selectedFood.novaGroup} />}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="serving">
                    Serving Size {useServingUnit && selectedFood.servingUnitName
                      ? `(${selectedFood.servingUnitName})`
                      : '(grams)'}
                  </Label>
                  {selectedFood.servingUnitName && selectedFood.servingUnitWeight && (
                    <button
                      type="button"
                      onClick={() => {
                        if (useServingUnit) {
                          // Switching to grams: convert current units to grams
                          const units = parseFloat(servingSize) || 1;
                          setServingSize(Math.round(units * selectedFood.servingUnitWeight!).toString());
                        } else {
                          // Switching to units: convert current grams to units
                          const grams = parseFloat(servingSize) || selectedFood.defaultServingSize;
                          setServingSize((grams / selectedFood.servingUnitWeight!).toFixed(1));
                        }
                        setUseServingUnit(!useServingUnit);
                      }}
                      className="text-xs text-primary hover:underline"
                    >
                      Switch to {useServingUnit ? 'grams' : selectedFood.servingUnitName}
                    </button>
                  )}
                </div>
                <Input
                  id="serving"
                  type="number"
                  step={useServingUnit ? "0.5" : "1"}
                  value={servingSize}
                  onChange={(e) => setServingSize(e.target.value)}
                  min="0.1"
                />
                {useServingUnit && selectedFood.servingUnitWeight && (
                  <p className="text-xs text-muted-foreground">
                    = {Math.round(getGramsFromServing(selectedFood, servingSize, true))}g
                    ({selectedFood.servingUnitWeight}g per {selectedFood.servingUnitName})
                  </p>
                )}
              </div>
              {selectedFoodPreview && (
                <div className="flex gap-2 flex-wrap">
                  <Badge style={{ backgroundColor: 'var(--macro-calories)', color: '#fff' }}>{selectedFoodPreview.calories} kcal</Badge>
                  <Badge variant="outline" style={{ borderColor: 'var(--macro-protein)', color: 'var(--macro-protein)' }}>P: {selectedFoodPreview.protein}g</Badge>
                  <Badge variant="outline" style={{ borderColor: 'var(--macro-carbs)', color: 'var(--macro-carbs)' }}>C: {selectedFoodPreview.carbs}g</Badge>
                  <Badge variant="outline" style={{ borderColor: 'var(--macro-fat)', color: 'var(--macro-fat)' }}>F: {selectedFoodPreview.fat}g</Badge>
                  <Badge variant="outline" style={{ borderColor: 'var(--macro-fiber)', color: 'var(--macro-fiber)' }}>Fiber: {selectedFoodPreview.fiber}g</Badge>
                  <Badge variant="outline" style={{ borderColor: 'var(--macro-sugar)', color: 'var(--macro-sugar)' }}>Sugar: {selectedFoodPreview.sugar}g</Badge>
                  <Badge variant="outline" style={{ borderColor: 'var(--macro-salt)', color: 'var(--macro-salt)' }}>Salt: {selectedFoodPreview.salt}g</Badge>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedFood(null)}>
              Cancel
            </Button>
            <Button onClick={handleLogFood}>Add to Log</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for new product from barcode */}
      <Dialog open={newProduct !== null} onOpenChange={(open) => !open && setNewProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Food Found</DialogTitle>
          </DialogHeader>
          {newProduct && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {newProduct.imageUrl && (
                  <img
                    src={newProduct.imageUrl}
                    alt={newProduct.name}
                    className="w-16 h-16 object-contain rounded"
                  />
                )}
                <div>
                  <h4 className="font-medium">{newProduct.name}</h4>
                  {newProduct.brand && (
                    <p className="text-sm text-muted-foreground">{newProduct.brand}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Barcode: {newProduct.barcode}</p>
                  <div className="flex gap-2 mt-1">
                    {newProduct.nutriScoreGrade && <NutriScoreBadge grade={newProduct.nutriScoreGrade} />}
                    {newProduct.novaGroup && <NovaGroupBadge group={newProduct.novaGroup} />}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newServing">Default Serving Size (grams)</Label>
                <Input
                  id="newServing"
                  type="number"
                  value={newServingSize}
                  onChange={(e) => setNewServingSize(e.target.value)}
                  min="1"
                />
              </div>
              {newProductPreview && (
                <div className="flex gap-2 flex-wrap">
                  <Badge style={{ backgroundColor: 'var(--macro-calories)', color: '#fff' }}>{newProductPreview.calories} kcal</Badge>
                  <Badge variant="outline" style={{ borderColor: 'var(--macro-protein)', color: 'var(--macro-protein)' }}>P: {newProductPreview.protein}g</Badge>
                  <Badge variant="outline" style={{ borderColor: 'var(--macro-carbs)', color: 'var(--macro-carbs)' }}>C: {newProductPreview.carbs}g</Badge>
                  <Badge variant="outline" style={{ borderColor: 'var(--macro-fat)', color: 'var(--macro-fat)' }}>F: {newProductPreview.fat}g</Badge>
                  <Badge variant="outline" style={{ borderColor: 'var(--macro-fiber)', color: 'var(--macro-fiber)' }}>Fiber: {newProductPreview.fiber}g</Badge>
                  <Badge variant="outline" style={{ borderColor: 'var(--macro-sugar)', color: 'var(--macro-sugar)' }}>Sugar: {newProductPreview.sugar}g</Badge>
                  <Badge variant="outline" style={{ borderColor: 'var(--macro-salt)', color: 'var(--macro-salt)' }}>Salt: {newProductPreview.salt}g</Badge>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setNewProduct(null)}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={handleSaveNewFood}>
              Save to My Foods
            </Button>
            <Button onClick={handleSaveAndLog}>Save & Add to Log</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for custom food creation */}
      <Dialog open={showCustomFood} onOpenChange={(open) => !open && resetCustomForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Custom Food</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="customName">Name</Label>
                <Input
                  id="customName"
                  placeholder="e.g., Whey Protein Shake"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="customBrand">Brand (optional)</Label>
                <Input
                  id="customBrand"
                  placeholder="e.g., MyProtein"
                  value={customBrand}
                  onChange={(e) => setCustomBrand(e.target.value)}
                />
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-3">Nutrition per 100g</p>
              <div className="grid gap-3 grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="customCalories" className="text-xs text-muted-foreground">Calories</Label>
                  <div className="relative">
                    <Input
                      id="customCalories"
                      type="number"
                      placeholder="0"
                      value={customCalories}
                      onChange={(e) => setCustomCalories(e.target.value)}
                      min="0"
                      className="pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">kcal</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="customProtein" className="text-xs text-muted-foreground">Protein</Label>
                  <div className="relative">
                    <Input
                      id="customProtein"
                      type="number"
                      placeholder="0"
                      value={customProtein}
                      onChange={(e) => setCustomProtein(e.target.value)}
                      min="0"
                      className="pr-6"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">g</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="customCarbs" className="text-xs text-muted-foreground">Carbs</Label>
                  <div className="relative">
                    <Input
                      id="customCarbs"
                      type="number"
                      placeholder="0"
                      value={customCarbs}
                      onChange={(e) => setCustomCarbs(e.target.value)}
                      min="0"
                      className="pr-6"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">g</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="customFat" className="text-xs text-muted-foreground">Fat</Label>
                  <div className="relative">
                    <Input
                      id="customFat"
                      type="number"
                      placeholder="0"
                      value={customFat}
                      onChange={(e) => setCustomFat(e.target.value)}
                      min="0"
                      className="pr-6"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">g</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customServing">Default Serving Size</Label>
              <div className="relative">
                <Input
                  id="customServing"
                  type="number"
                  value={customServing}
                  onChange={(e) => setCustomServing(e.target.value)}
                  min="1"
                  className="pr-6"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">g</span>
              </div>
            </div>

            {customPreview && (
              <div className="flex gap-2 flex-wrap">
                <Badge style={{ backgroundColor: 'var(--macro-calories)', color: '#fff' }}>{customPreview.calories} kcal</Badge>
                <Badge variant="outline" style={{ borderColor: 'var(--macro-protein)', color: 'var(--macro-protein)' }}>P: {customPreview.protein}g</Badge>
                <Badge variant="outline" style={{ borderColor: 'var(--macro-carbs)', color: 'var(--macro-carbs)' }}>C: {customPreview.carbs}g</Badge>
                <Badge variant="outline" style={{ borderColor: 'var(--macro-fat)', color: 'var(--macro-fat)' }}>F: {customPreview.fat}g</Badge>
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={resetCustomForm}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={handleSaveCustomFood} disabled={!customName.trim()}>
              Save to My Foods
            </Button>
            <Button onClick={handleSaveCustomAndLog} disabled={!customName.trim()}>
              Save & Add to Log
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Store pricing dialog */}
      {pricingFood && (
        <StorePricingDialog
          food={pricingFood}
          open={pricingFood !== null}
          onOpenChange={(open) => !open && setPricingFood(null)}
        />
      )}
    </div>
  );
}
