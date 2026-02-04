import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getMealTemplates,
  getMealTemplateWithItems,
  addDayTemplate,
  addDayTemplateMeal,
  deleteDayTemplateMeal,
} from '@/lib/db';
import type { MealTemplate, DayTemplate, DayTemplateMeal } from '@/types';

const MEAL_SLOTS = [
  { number: 1, label: 'Breakfast' },
  { number: 2, label: 'Lunch' },
  { number: 3, label: 'Dinner' },
  { number: 4, label: 'Snacks' },
];

interface MealSlot {
  mealNumber: number;
  mealTemplateId: number | null;
  mealTemplate: MealTemplate | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface DayTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  editingTemplate: {
    template: DayTemplate;
    meals: (DayTemplateMeal & { mealTemplate: MealTemplate })[];
  } | null;
}

export function DayTemplateDialog({ open, onClose, editingTemplate }: DayTemplateDialogProps) {
  const [templateName, setTemplateName] = useState('');
  const [mealSlots, setMealSlots] = useState<MealSlot[]>([]);
  const [mealTemplates, setMealTemplates] = useState<MealTemplate[]>([]);
  const [mealNutrition, setMealNutrition] = useState<Map<number, { calories: number; protein: number; carbs: number; fat: number }>>(new Map());
  const [saving, setSaving] = useState(false);

  // Load meal templates
  const loadMealTemplates = useCallback(async () => {
    const templates = await getMealTemplates();
    setMealTemplates(templates);

    // Load nutrition for each template
    const nutritionMap = new Map();
    for (const template of templates) {
      const data = await getMealTemplateWithItems(template.id!);
      if (data) {
        const totals = data.items.reduce(
          (acc, item) => {
            const factor = item.servingSize / 100;
            return {
              calories: acc.calories + item.savedFood.caloriesPer100g * factor,
              protein: acc.protein + item.savedFood.proteinPer100g * factor,
              carbs: acc.carbs + item.savedFood.carbsPer100g * factor,
              fat: acc.fat + item.savedFood.fatPer100g * factor,
            };
          },
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );
        nutritionMap.set(template.id, {
          calories: Math.round(totals.calories),
          protein: Math.round(totals.protein),
          carbs: Math.round(totals.carbs),
          fat: Math.round(totals.fat),
        });
      }
    }
    setMealNutrition(nutritionMap);
  }, []);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      loadMealTemplates();

      if (editingTemplate) {
        setTemplateName(editingTemplate.template.name);

        // Initialize slots from existing meals
        const slots: MealSlot[] = MEAL_SLOTS.map((slot) => {
          const existing = editingTemplate.meals.find((m) => m.mealNumber === slot.number);
          return {
            mealNumber: slot.number,
            mealTemplateId: existing?.mealTemplateId ?? null,
            mealTemplate: existing?.mealTemplate ?? null,
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
          };
        });
        setMealSlots(slots);
      } else {
        setTemplateName('');
        setMealSlots(
          MEAL_SLOTS.map((slot) => ({
            mealNumber: slot.number,
            mealTemplateId: null,
            mealTemplate: null,
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
          }))
        );
      }
    }
  }, [open, editingTemplate, loadMealTemplates]);

  // Update slot nutrition when meal nutrition is loaded
  useEffect(() => {
    if (mealNutrition.size > 0) {
      setMealSlots((slots) =>
        slots.map((slot) => {
          if (slot.mealTemplateId) {
            const nutrition = mealNutrition.get(slot.mealTemplateId);
            if (nutrition) {
              return { ...slot, ...nutrition };
            }
          }
          return slot;
        })
      );
    }
  }, [mealNutrition]);

  const handleSlotChange = (mealNumber: number, templateId: string) => {
    const numericId = templateId === 'none' ? null : parseInt(templateId);
    const template = numericId ? mealTemplates.find((t) => t.id === numericId) : null;
    const nutrition = numericId ? mealNutrition.get(numericId) : null;

    setMealSlots((slots) =>
      slots.map((slot) =>
        slot.mealNumber === mealNumber
          ? {
              ...slot,
              mealTemplateId: numericId,
              mealTemplate: template ?? null,
              calories: nutrition?.calories ?? 0,
              protein: nutrition?.protein ?? 0,
              carbs: nutrition?.carbs ?? 0,
              fat: nutrition?.fat ?? 0,
            }
          : slot
      )
    );
  };

  const totals = useMemo(() => {
    return mealSlots.reduce(
      (acc, slot) => ({
        calories: acc.calories + slot.calories,
        protein: acc.protein + slot.protein,
        carbs: acc.carbs + slot.carbs,
        fat: acc.fat + slot.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [mealSlots]);

  const hasAnyMeal = mealSlots.some((slot) => slot.mealTemplateId !== null);

  const handleSave = async () => {
    if (!templateName.trim() || !hasAnyMeal) return;

    setSaving(true);

    try {
      if (editingTemplate) {
        // Delete all existing meal assignments
        for (const meal of editingTemplate.meals) {
          await deleteDayTemplateMeal(meal.id!);
        }

        // Add new meal assignments
        for (const slot of mealSlots) {
          if (slot.mealTemplateId) {
            await addDayTemplateMeal({
              dayTemplateId: editingTemplate.template.id!,
              mealTemplateId: slot.mealTemplateId,
              mealNumber: slot.mealNumber,
            });
          }
        }
      } else {
        // Create new template
        const templateId = await addDayTemplate({
          name: templateName.trim(),
          createdAt: new Date(),
        });

        // Add meal assignments
        for (const slot of mealSlots) {
          if (slot.mealTemplateId) {
            await addDayTemplateMeal({
              dayTemplateId: templateId,
              mealTemplateId: slot.mealTemplateId,
              mealNumber: slot.mealNumber,
            });
          }
        }
      }

      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editingTemplate ? 'Edit Day Template' : 'New Day Template'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dayName">Template Name</Label>
            <Input
              id="dayName"
              placeholder="e.g., Workout Day, Rest Day"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Meal Assignments</Label>
            {mealTemplates.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    No meal templates available. Create meal templates first.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {MEAL_SLOTS.map((slot) => {
                  const currentSlot = mealSlots.find((s) => s.mealNumber === slot.number);
                  return (
                    <div key={slot.number} className="flex items-center gap-3">
                      <span className="w-20 text-sm font-medium">{slot.label}</span>
                      <Select
                        value={currentSlot?.mealTemplateId?.toString() ?? 'none'}
                        onValueChange={(value) => handleSlotChange(slot.number, value)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select meal template" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-- None --</SelectItem>
                          {mealTemplates.map((template) => (
                            <SelectItem key={template.id} value={template.id!.toString()}>
                              <div className="flex items-center gap-2">
                                <span>{template.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  ({mealNutrition.get(template.id!)?.calories ?? 0} kcal)
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Daily totals */}
          {hasAnyMeal && (
            <div className="pt-2 border-t">
              <p className="text-sm font-medium mb-2">Daily Totals</p>
              <div className="flex flex-wrap gap-1.5">
                <Badge className="border-0" style={{ backgroundColor: 'var(--macro-calories)', color: '#fff' }}>
                  {totals.calories} kcal
                </Badge>
                <Badge variant="outline" style={{ borderColor: 'var(--macro-protein)', color: 'var(--macro-protein)' }}>P: {totals.protein}g</Badge>
                <Badge variant="outline" style={{ borderColor: 'var(--macro-carbs)', color: 'var(--macro-carbs)' }}>C: {totals.carbs}g</Badge>
                <Badge variant="outline" style={{ borderColor: 'var(--macro-fat)', color: 'var(--macro-fat)' }}>F: {totals.fat}g</Badge>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !templateName.trim() || !hasAnyMeal}
          >
            {saving ? 'Saving...' : editingTemplate ? 'Save Changes' : 'Create Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
