import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FoodLog } from '@/components/FoodLog';
import { MacroDisplay } from '@/components/MacroDisplay';
import { UseTemplateDialog } from '@/components/UseTemplateDialog';
import { getFoodEntriesByDate, updateFoodEntry, deleteFoodEntry, getGoals, getSavedFoods, searchSavedFoods, addFoodEntry, findOrCreateSavedFoodFromEntry, addMealTemplate, addMealTemplateItem, addDayTemplate, addDayTemplateMeal } from '@/lib/db';
import { getMealLabel } from '@/lib/constants';
import { calculateNutritionForServing } from '@/lib/nutrition';
import type { FoodEntry, UserGoals, DailyTotals, SavedFood } from '@/types';

export function Log() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [goals, setGoals] = useState<UserGoals | undefined>();
  const [loading, setLoading] = useState(true);

  // Add food dialog state
  const [showAddFood, setShowAddFood] = useState(false);
  const [savedFoods, setSavedFoods] = useState<SavedFood[]>([]);
  const [foodSearchQuery, setFoodSearchQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<SavedFood | null>(null);
  const [servingSize, setServingSize] = useState('');
  const [inputMode, setInputMode] = useState<'grams' | 'servings'>('servings');
  const [selectedMealNumber, setSelectedMealNumber] = useState<number>(1);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Save as template state
  const [savingMeal, setSavingMeal] = useState<{ mealNumber: number | null; entries: FoodEntry[] } | null>(null);
  const [saveMealName, setSaveMealName] = useState('');
  const [savingDay, setSavingDay] = useState(false);
  const [saveDayName, setSaveDayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const [data, goalsData] = await Promise.all([
        getFoodEntriesByDate(selectedDate),
        getGoals(),
      ]);
      setEntries(data);
      setGoals(goalsData);
    } catch {
      setError('Failed to load entries. Please try again.');
      setTimeout(() => setError(null), 4000);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleUpdateEntry = async (id: number, updates: Partial<FoodEntry>) => {
    try {
      await updateFoodEntry(id, updates);
      loadEntries();
    } catch {
      setError('Failed to update entry. Please try again.');
      setTimeout(() => setError(null), 4000);
    }
  };

  const handleDeleteEntry = async (id: number) => {
    try {
      await deleteFoodEntry(id);
      loadEntries();
    } catch {
      setError('Failed to delete entry. Please try again.');
      setTimeout(() => setError(null), 4000);
    }
  };

  const loadSavedFoods = useCallback(async () => {
    const foods = foodSearchQuery
      ? await searchSavedFoods(foodSearchQuery)
      : await getSavedFoods();
    setSavedFoods(foods);
  }, [foodSearchQuery]);

  useEffect(() => {
    if (showAddFood) {
      loadSavedFoods();
    }
  }, [showAddFood, loadSavedFoods]);

  const handleOpenAddFood = () => {
    setFoodSearchQuery('');
    setSelectedFood(null);
    setServingSize('');
    setSelectedMealNumber(1);
    setShowAddFood(true);
  };

  const handleSelectFood = (food: SavedFood) => {
    setSelectedFood(food);
    setInputMode('servings');
    setServingSize('1');
  };

  // Get the serving unit label and weight
  const getServingInfo = () => {
    if (!selectedFood) return { label: 'serving', weight: 100 };
    // If food has a specific unit name (like "egg"), use it
    if (selectedFood.servingUnitName) {
      return {
        label: selectedFood.servingUnitName,
        weight: selectedFood.servingUnitWeight || selectedFood.defaultServingSize
      };
    }
    // Use servingUnitWeight if available (from API), otherwise defaultServingSize
    const weight = selectedFood.servingUnitWeight || selectedFood.defaultServingSize;
    return { label: 'serving', weight };
  };

  // Calculate grams from input
  const getGramsFromInput = (): number => {
    if (!selectedFood) return 0;
    const value = parseFloat(servingSize) || 0;
    if (inputMode === 'servings') {
      return value * getServingInfo().weight;
    }
    return value;
  };

  const handleBackToList = () => {
    setSelectedFood(null);
    setServingSize('');
    setInputMode('servings');
  };

  const handleAddFood = async () => {
    if (!selectedFood) return;
    const servingGrams = getGramsFromInput() || selectedFood.defaultServingSize;
    const nutrition = calculateNutritionForServing(selectedFood, servingGrams);

    // Determine display unit
    const info = getServingInfo();
    const displayUnit = inputMode === 'servings' ? info.label : 'g';
    const displaySize = inputMode === 'servings' ? parseFloat(servingSize) || 1 : servingGrams;

    await addFoodEntry({
      date: selectedDate,
      barcode: selectedFood.barcode,
      name: selectedFood.brand ? `${selectedFood.name} (${selectedFood.brand})` : selectedFood.name,
      servingSize: displaySize,
      servingUnit: displayUnit,
      ...nutrition,
      mealNumber: selectedMealNumber,
      createdAt: new Date(),
    });

    setSelectedFood(null);
    setShowAddFood(false);
    setInputMode('servings');
    loadEntries();
  };

  const getPreviewNutrition = () => {
    if (!selectedFood) return null;
    const servingGrams = getGramsFromInput() || selectedFood.defaultServingSize;
    return calculateNutritionForServing(selectedFood, servingGrams);
  };

  // Save meal as template
  const handleOpenSaveMeal = (mealNumber: number | null, mealEntries: FoodEntry[]) => {
    setSaveMealName(getMealLabel(mealNumber));
    setSavingMeal({ mealNumber, entries: mealEntries });
  };

  const handleSaveMealTemplate = async () => {
    if (!savingMeal || !saveMealName.trim()) return;
    setIsSaving(true);
    try {
      const templateId = await addMealTemplate({ name: saveMealName.trim(), createdAt: new Date() });
      for (const entry of savingMeal.entries) {
        const savedFoodId = await findOrCreateSavedFoodFromEntry(entry);
        await addMealTemplateItem({
          mealTemplateId: templateId,
          savedFoodId,
          servingSize: entry.servingSize || 100,
        });
      }
      setSavingMeal(null);
      setSuccessMessage('Meal template saved!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      setError('Failed to save template. Please try again.');
      setTimeout(() => setError(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  // Save day as template
  const handleOpenSaveDay = () => {
    const date = new Date(selectedDate);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    setSaveDayName(dayName);
    setSavingDay(true);
  };

  const handleSaveDayTemplate = async () => {
    if (!saveDayName.trim() || entries.length === 0) return;
    setIsSaving(true);
    try {
      // Group entries by meal number
      const groups = new Map<number, FoodEntry[]>();
      entries.forEach(entry => {
        const mealNum = entry.mealNumber ?? 1;
        if (!groups.has(mealNum)) groups.set(mealNum, []);
        groups.get(mealNum)!.push(entry);
      });

      const dayTemplateId = await addDayTemplate({ name: saveDayName.trim(), createdAt: new Date() });

      for (const [mealNum, mealEntries] of groups) {
        const mealTemplateName = `${saveDayName.trim()} - ${getMealLabel(mealNum)}`;
        const mealTemplateId = await addMealTemplate({ name: mealTemplateName, createdAt: new Date() });

        for (const entry of mealEntries) {
          const savedFoodId = await findOrCreateSavedFoodFromEntry(entry);
          await addMealTemplateItem({
            mealTemplateId: mealTemplateId,
            savedFoodId,
            servingSize: entry.servingSize || 100,
          });
        }

        await addDayTemplateMeal({
          dayTemplateId,
          mealTemplateId: mealTemplateId,
          mealNumber: mealNum,
        });
      }

      setSavingDay(false);
      setSuccessMessage('Day template saved!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      setError('Failed to save day template. Please try again.');
      setTimeout(() => setError(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  const goToDate = (offset: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + offset);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const totals: DailyTotals = useMemo(
    () =>
      entries.reduce(
        (acc, entry) => ({
          calories: acc.calories + entry.calories,
          protein: acc.protein + entry.protein,
          carbs: acc.carbs + entry.carbs,
          fat: acc.fat + entry.fat,
          fiber: acc.fiber + (entry.fiber || 0),
          sugar: acc.sugar + (entry.sugar || 0),
          salt: acc.salt + (entry.salt || 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, salt: 0 }
      ),
    [entries]
  );

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Error toast */}
      {error && (
        <div role="alert" className="fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg border bg-destructive/10 border-destructive/20 text-destructive animate-in slide-in-from-right">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Success toast */}
      {successMessage && (
        <div role="status" className="fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg border bg-primary/10 border-primary/20 text-primary animate-in slide-in-from-right">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">{successMessage}</span>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Daily Log</h1>
          <p className="text-muted-foreground">{formatDate(selectedDate)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => goToDate(-1)} aria-label="Previous day">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            disabled={isToday}
          >
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => goToDate(1)} disabled={isToday} aria-label="Next day">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleOpenAddFood} className="flex-1 sm:flex-none">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Food
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowTemplateDialog(true)}
              className="flex-1 sm:flex-none"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Use Template
            </Button>
            {entries.length > 0 && (
              <Button
                variant="outline"
                onClick={handleOpenSaveDay}
                className="w-full sm:w-auto text-muted-foreground"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                Save Day as Template
              </Button>
            )}
          </div>

          {/* Food entries */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium text-muted-foreground">Food Entries</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-muted rounded-lg" />
                    </div>
                  ))}
                </div>
              ) : (
                <FoodLog
                  entries={entries}
                  onUpdateEntry={handleUpdateEntry}
                  onDeleteEntry={handleDeleteEntry}
                  onAddFood={handleOpenAddFood}
                  onSaveMealAsTemplate={handleOpenSaveMeal}
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="shadow-sm sticky top-20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium text-muted-foreground">Daily Totals</CardTitle>
            </CardHeader>
            <CardContent>
              <MacroDisplay totals={totals} goals={goals} />
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showAddFood} onOpenChange={(open) => !open && setShowAddFood(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedFood ? 'Set Serving Size' : 'Add Food'}
            </DialogTitle>
          </DialogHeader>

          {!selectedFood ? (
            <>
              <div className="space-y-4">
                <Input
                  placeholder="Search saved foods..."
                  value={foodSearchQuery}
                  onChange={(e) => setFoodSearchQuery(e.target.value)}
                />
                <ScrollArea className="h-64">
                  {savedFoods.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No saved foods found.</p>
                      <p className="text-sm">Add foods from the "My Foods" page first.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 pr-4">
                      {savedFoods.map((food) => (
                        <Card
                          key={food.id}
                          className="cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => handleSelectFood(food)}
                        >
                          <CardContent className="py-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium truncate">{food.name}</h4>
                                {food.brand && (
                                  <p className="text-sm text-muted-foreground truncate">
                                    {food.brand}
                                  </p>
                                )}
                              </div>
                              <Badge variant="secondary">
                                {food.caloriesPer100g} kcal/100g
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddFood(false)}>
                  Cancel
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="space-y-5">
                {/* Food header with image */}
                <div className="flex items-start gap-3">
                  {selectedFood.imageUrl && (
                    <img
                      src={selectedFood.imageUrl}
                      alt={selectedFood.name}
                      className="w-12 h-12 rounded-lg object-cover bg-muted flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-lg leading-tight">{selectedFood.name}</h4>
                    {selectedFood.brand && (
                      <p className="text-sm text-muted-foreground">{selectedFood.brand}</p>
                    )}
                  </div>
                </div>

                {/* Input mode toggle with clearer active state */}
                <div className="flex rounded-lg border p-1 bg-muted/50">
                  <button
                    type="button"
                    onClick={() => {
                      if (inputMode !== 'servings') {
                        const grams = parseFloat(servingSize) || selectedFood.defaultServingSize;
                        setServingSize(Math.round(grams / getServingInfo().weight).toString());
                        setInputMode('servings');
                      }
                    }}
                    className={`flex-1 px-3 py-2 text-sm rounded-md transition-all ${
                      inputMode === 'servings'
                        ? 'bg-primary text-primary-foreground shadow-sm font-medium'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {getServingInfo().label}s ({getServingInfo().weight}g)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (inputMode !== 'grams') {
                        const servings = parseFloat(servingSize) || 1;
                        setServingSize(Math.round(servings * getServingInfo().weight).toString());
                        setInputMode('grams');
                      }
                    }}
                    className={`flex-1 px-3 py-2 text-sm rounded-md transition-all ${
                      inputMode === 'grams'
                        ? 'bg-primary text-primary-foreground shadow-sm font-medium'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    grams
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Serving input - stepper for servings, regular input for grams */}
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-sm">
                      {inputMode === 'servings' ? getServingInfo().label + 's' : 'Grams'}
                    </Label>
                    {inputMode === 'servings' ? (
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 flex-shrink-0"
                          onClick={() => setServingSize(Math.max(1, parseInt(servingSize) - 1).toString())}
                          disabled={parseInt(servingSize) <= 1}
                          aria-label="Decrease serving"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </Button>
                        <div className="flex-1 text-center">
                          <span className="text-2xl font-semibold">{parseInt(servingSize) || 1}</span>
                          <p className="text-xs text-muted-foreground">= {Math.round(getGramsFromInput())}g</p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 flex-shrink-0"
                          onClick={() => setServingSize((parseInt(servingSize) + 1).toString())}
                          aria-label="Increase serving"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </Button>
                      </div>
                    ) : (
                      <Input
                        id="servingSize"
                        type="number"
                        step="1"
                        value={servingSize}
                        onChange={(e) => setServingSize(e.target.value)}
                        min="1"
                        className="text-center text-lg"
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-sm">Meal</Label>
                    <Select
                      value={selectedMealNumber.toString()}
                      onValueChange={(v) => setSelectedMealNumber(parseInt(v))}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select meal" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Breakfast</SelectItem>
                        <SelectItem value="2">Lunch</SelectItem>
                        <SelectItem value="3">Dinner</SelectItem>
                        <SelectItem value="4">Snacks</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Nutrition preview */}
                {(() => {
                  const preview = getPreviewNutrition();
                  if (!preview) return null;
                  return (
                    <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                      <div className="text-center">
                        <span className="text-3xl font-bold" style={{ color: 'var(--macro-calories)' }}>
                          {preview.calories}
                        </span>
                        <span className="text-sm text-muted-foreground ml-1">kcal</span>
                      </div>
                      <div className="flex justify-center gap-4 text-sm font-medium">
                        <span style={{ color: 'var(--macro-protein)' }}>P: {preview.protein}g</span>
                        <span style={{ color: 'var(--macro-carbs)' }}>C: {preview.carbs}g</span>
                        <span style={{ color: 'var(--macro-fat)' }}>F: {preview.fat}g</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={handleBackToList}>
                  Back
                </Button>
                <Button onClick={handleAddFood}>Add to Log</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <UseTemplateDialog
        open={showTemplateDialog}
        onClose={() => setShowTemplateDialog(false)}
        date={selectedDate}
        onApplied={loadEntries}
      />

      {/* Save meal as template dialog */}
      <Dialog open={savingMeal !== null} onOpenChange={(open) => !open && setSavingMeal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save as Meal Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Save {savingMeal?.entries.length} item{savingMeal?.entries.length !== 1 ? 's' : ''} as a reusable template.
            </p>
            <div className="space-y-2">
              <Label htmlFor="mealTemplateName">Template Name</Label>
              <Input
                id="mealTemplateName"
                value={saveMealName}
                onChange={(e) => setSaveMealName(e.target.value)}
                placeholder="e.g. Breakfast"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSavingMeal(null)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSaveMealTemplate} disabled={!saveMealName.trim() || isSaving}>
              {isSaving ? 'Saving...' : 'Save Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save day as template dialog */}
      <Dialog open={savingDay} onOpenChange={(open) => !open && setSavingDay(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save Day as Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Save all {entries.length} entries across your meals as a day template.
            </p>
            <div className="space-y-2">
              <Label htmlFor="dayTemplateName">Template Name</Label>
              <Input
                id="dayTemplateName"
                value={saveDayName}
                onChange={(e) => setSaveDayName(e.target.value)}
                placeholder="e.g. Monday"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSavingDay(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSaveDayTemplate} disabled={!saveDayName.trim() || isSaving}>
              {isSaving ? 'Saving...' : 'Save Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
