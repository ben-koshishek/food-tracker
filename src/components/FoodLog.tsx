import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { FoodEntry } from '@/types';
import { getMealLabel } from '@/lib/constants';

interface FoodLogProps {
  entries: FoodEntry[];
  onUpdateEntry: (id: number, entry: Partial<FoodEntry>) => void;
  onDeleteEntry: (id: number) => void;
  onAddFood?: () => void;
  onSaveMealAsTemplate?: (mealNumber: number | null, entries: FoodEntry[]) => void;
}

interface MealGroup {
  mealNumber: number | null;
  entries: FoodEntry[];
  totals: { calories: number; protein: number; carbs: number; fat: number };
}

export function FoodLog({ entries, onUpdateEntry, onDeleteEntry, onAddFood, onSaveMealAsTemplate }: FoodLogProps) {
  const [editingEntry, setEditingEntry] = useState<FoodEntry | null>(null);
  const [editServingSize, setEditServingSize] = useState('');
  const [editServingUnit, setEditServingUnit] = useState('');
  const [collapsedMeals, setCollapsedMeals] = useState<Set<number | null>>(new Set());

  const mealGroups = useMemo(() => {
    const groups = new Map<number | null, FoodEntry[]>();

    entries.forEach(entry => {
      const mealNum = entry.mealNumber ?? null;
      if (!groups.has(mealNum)) {
        groups.set(mealNum, []);
      }
      groups.get(mealNum)!.push(entry);
    });

    const result: MealGroup[] = [];
    const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
      if (a === null) return 1;
      if (b === null) return -1;
      return a - b;
    });

    sortedKeys.forEach(key => {
      const groupEntries = groups.get(key)!;
      const totals = groupEntries.reduce(
        (acc, e) => ({
          calories: acc.calories + e.calories,
          protein: acc.protein + e.protein,
          carbs: acc.carbs + e.carbs,
          fat: acc.fat + e.fat,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );
      result.push({ mealNumber: key, entries: groupEntries, totals });
    });

    return result;
  }, [entries]);

  const toggleMealCollapse = (mealNumber: number | null) => {
    setCollapsedMeals(prev => {
      const next = new Set(prev);
      if (next.has(mealNumber)) {
        next.delete(mealNumber);
      } else {
        next.add(mealNumber);
      }
      return next;
    });
  };

  const handleEditClick = (entry: FoodEntry) => {
    setEditingEntry(entry);
    setEditServingSize(entry.servingSize.toString());
    setEditServingUnit(entry.servingUnit || 'g');
  };

  const handleSaveEdit = () => {
    if (!editingEntry?.id) return;

    const newServingSize = parseFloat(editServingSize) || editingEntry.servingSize;
    const ratio = newServingSize / editingEntry.servingSize;

    onUpdateEntry(editingEntry.id, {
      servingSize: newServingSize,
      servingUnit: editServingUnit || editingEntry.servingUnit,
      calories: Math.round(editingEntry.calories * ratio),
      protein: Math.round(editingEntry.protein * ratio * 10) / 10,
      carbs: Math.round(editingEntry.carbs * ratio * 10) / 10,
      fat: Math.round(editingEntry.fat * ratio * 10) / 10,
      fiber: Math.round((editingEntry.fiber || 0) * ratio * 10) / 10,
      sugar: Math.round((editingEntry.sugar || 0) * ratio * 10) / 10,
      salt: Math.round((editingEntry.salt || 0) * ratio * 100) / 100,
    });
    setEditingEntry(null);
  };

  const handleDeleteClick = (id: number | undefined) => {
    if (id === undefined) return;
    onDeleteEntry(id);
  };


  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
        <h3 className="font-medium text-lg mb-1">No food logged</h3>
        <p className="text-muted-foreground mb-4">Start tracking by adding your first meal.</p>
        {onAddFood && (
          <Button onClick={onAddFood}>
            Add Food
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {mealGroups.map((group) => {
          const isCollapsed = collapsedMeals.has(group.mealNumber);

          return (
            <div key={group.mealNumber ?? 'other'} className="space-y-2">
              {/* Meal header */}
              <button
                onClick={() => toggleMealCollapse(group.mealNumber)}
                className="w-full flex items-center justify-between py-2 px-1 hover:bg-accent/50 rounded-lg transition-colors group"
                aria-expanded={!isCollapsed}
                aria-label={`${getMealLabel(group.mealNumber)}: ${group.entries.length} items, ${Math.round(group.totals.calories)} calories. Click to ${isCollapsed ? 'expand' : 'collapse'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    group.mealNumber ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  }`}>
                    <span className="text-sm font-semibold">{group.mealNumber ?? '?'}</span>
                  </div>
                  <div className="text-left">
                    <h3 className="font-medium">{getMealLabel(group.mealNumber)}</h3>
                    <p className="text-xs text-muted-foreground">{group.entries.length} item{group.entries.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {onSaveMealAsTemplate && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground h-8 px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSaveMealAsTemplate(group.mealNumber, group.entries);
                      }}
                      aria-label={`Save ${getMealLabel(group.mealNumber)} as template`}
                    >
                      <svg className="w-4 h-4 sm:mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                      <span className="hidden sm:inline text-xs">Save</span>
                    </Button>
                  )}
                  <div className="text-right">
                    <span className="font-semibold tabular-nums">{Math.round(group.totals.calories)}</span>
                    <span className="text-sm text-muted-foreground ml-1">kcal</span>
                  </div>
                  <svg
                    className={`w-5 h-5 text-muted-foreground transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Meal entries */}
              {!isCollapsed && (
                <div className="space-y-2 pl-11">
                  {group.entries.map((entry) => (
                    <Card key={entry.id} className="group hover:shadow-sm transition-shadow">
                      <CardContent className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{entry.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {entry.servingSize} {entry.servingUnit}
                            </p>
                          </div>
                          <div className="flex gap-1.5 flex-wrap justify-end">
                            <Badge variant="secondary" className="tabular-nums" style={{ backgroundColor: 'var(--macro-calories)', color: '#fff' }}>{entry.calories} kcal</Badge>
                            <Badge variant="outline" className="tabular-nums hidden sm:inline-flex" style={{ borderColor: 'var(--macro-protein)', color: 'var(--macro-protein)' }}>P: {entry.protein}g</Badge>
                            <Badge variant="outline" className="tabular-nums hidden sm:inline-flex" style={{ borderColor: 'var(--macro-carbs)', color: 'var(--macro-carbs)' }}>C: {entry.carbs}g</Badge>
                            <Badge variant="outline" className="tabular-nums hidden sm:inline-flex" style={{ borderColor: 'var(--macro-fat)', color: 'var(--macro-fat)' }}>F: {entry.fat}g</Badge>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="sm" variant="ghost" onClick={() => handleEditClick(entry)} aria-label={`Edit ${entry.name}`}>
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteClick(entry.id)}
                              aria-label={`Delete ${entry.name}`}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={editingEntry !== null} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Entry</DialogTitle>
          </DialogHeader>
          {editingEntry && (
            <div className="space-y-4">
              <p className="font-medium">{editingEntry.name}</p>
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <div className="space-y-2">
                  <Label htmlFor="servingSize">Amount</Label>
                  <Input
                    id="servingSize"
                    type="number"
                    value={editServingSize}
                    onChange={(e) => setEditServingSize(e.target.value)}
                    min="0.1"
                    step="any"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="servingUnit">Unit</Label>
                  <Input
                    id="servingUnit"
                    value={editServingUnit}
                    onChange={(e) => setEditServingUnit(e.target.value)}
                    className="w-24"
                    placeholder="g"
                  />
                </div>
              </div>
              {editServingSize && (
                <div className="flex gap-2 flex-wrap">
                  <Badge style={{ backgroundColor: 'var(--macro-calories)', color: '#fff' }}>
                    {Math.round(
                      editingEntry.calories *
                        ((parseFloat(editServingSize) || editingEntry.servingSize) /
                          editingEntry.servingSize)
                    )} kcal
                  </Badge>
                  <Badge variant="outline" style={{ borderColor: 'var(--macro-protein)', color: 'var(--macro-protein)' }}>
                    P: {Math.round(
                      editingEntry.protein *
                        ((parseFloat(editServingSize) || editingEntry.servingSize) /
                          editingEntry.servingSize) * 10
                    ) / 10}g
                  </Badge>
                  <Badge variant="outline" style={{ borderColor: 'var(--macro-carbs)', color: 'var(--macro-carbs)' }}>
                    C: {Math.round(
                      editingEntry.carbs *
                        ((parseFloat(editServingSize) || editingEntry.servingSize) /
                          editingEntry.servingSize) * 10
                    ) / 10}g
                  </Badge>
                  <Badge variant="outline" style={{ borderColor: 'var(--macro-fat)', color: 'var(--macro-fat)' }}>
                    F: {Math.round(
                      editingEntry.fat *
                        ((parseFloat(editServingSize) || editingEntry.servingSize) /
                          editingEntry.servingSize) * 10
                    ) / 10}g
                  </Badge>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEntry(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
