import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import {
  getDayTemplates,
  getDayTemplateWithMeals,
  deleteDayTemplate,
  getMealTemplateWithItems,
} from '@/lib/db';
import type { DayTemplate, MealTemplate, DayTemplateMeal, DayTemplateWithNutrition } from '@/types';
import { DayTemplateDialog } from './DayTemplateDialog';
import { getMealLabel } from '@/lib/constants';

// Extended type with meals array for local use
interface DayTemplateWithMeals extends DayTemplateWithNutrition {
  meals: (DayTemplateMeal & { mealTemplate: MealTemplate })[];
}

export function DayTemplateList() {
  const [templates, setTemplates] = useState<DayTemplateWithMeals[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<{
    template: DayTemplate;
    meals: (DayTemplateMeal & { mealTemplate: MealTemplate })[];
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    const rawTemplates = await getDayTemplates();

    const templatesWithNutrition = await Promise.all(
      rawTemplates.map(async (template) => {
        const data = await getDayTemplateWithMeals(template.id!);
        if (!data) {
          return {
            ...template,
            mealCount: 0,
            meals: [],
            totalCalories: 0,
            totalProtein: 0,
            totalCarbs: 0,
            totalFat: 0,
          };
        }

        // Calculate totals from all meal templates
        const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

        for (const meal of data.meals) {
          const mealData = await getMealTemplateWithItems(meal.mealTemplateId);
          if (mealData) {
            for (const item of mealData.items) {
              const factor = item.servingSize / 100;
              totals.calories += item.savedFood.caloriesPer100g * factor;
              totals.protein += item.savedFood.proteinPer100g * factor;
              totals.carbs += item.savedFood.carbsPer100g * factor;
              totals.fat += item.savedFood.fatPer100g * factor;
            }
          }
        }

        return {
          ...template,
          mealCount: data.meals.length,
          meals: data.meals,
          totalCalories: Math.round(totals.calories),
          totalProtein: Math.round(totals.protein),
          totalCarbs: Math.round(totals.carbs),
          totalFat: Math.round(totals.fat),
        };
      })
    );

    setTemplates(templatesWithNutrition);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTemplates();
  }, [loadTemplates]);

  const handleCreateNew = () => {
    setEditingTemplate(null);
    setShowDialog(true);
  };

  const handleEdit = async (template: DayTemplate) => {
    const data = await getDayTemplateWithMeals(template.id!);
    if (data) {
      setEditingTemplate(data);
      setShowDialog(true);
    }
  };

  const handleDelete = async (id: number) => {
    await deleteDayTemplate(id);
    setDeleteConfirm(null);
    loadTemplates();
  };

  const handleDialogClose = () => {
    setShowDialog(false);
    setEditingTemplate(null);
    loadTemplates();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-32 bg-muted rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {templates.length} day template{templates.length !== 1 ? 's' : ''}
          </p>
          <Button onClick={handleCreateNew}>
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Template
          </Button>
        </div>

        {templates.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-medium text-lg mb-1">No day templates yet</h3>
              <p className="text-muted-foreground mb-4">
                Combine meal templates into full day plans for quick logging.
              </p>
              <Button onClick={handleCreateNew}>Create Your First Day Template</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {templates.map((template) => (
              <Card
                key={template.id}
                className="group hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleEdit(template)}
              >
                <CardContent className="py-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold">{template.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {template.mealCount} meal{template.mealCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (template.id) setDeleteConfirm(template.id);
                      }}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </Button>
                  </div>

                  {/* Meal breakdown */}
                  {template.meals.length > 0 && (
                    <div className="space-y-1 mb-3">
                      {template.meals.map((meal) => (
                        <div key={meal.id} className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">
                            {getMealLabel(meal.mealNumber)}:
                          </span>
                          <span className="truncate">{meal.mealTemplate.name}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    <Badge className="border-0" style={{ backgroundColor: 'var(--macro-calories)', color: '#fff' }}>
                      {template.totalCalories} kcal
                    </Badge>
                    <Badge variant="outline" className="text-xs" style={{ borderColor: 'var(--macro-protein)', color: 'var(--macro-protein)' }}>
                      P: {template.totalProtein}g
                    </Badge>
                    <Badge variant="outline" className="text-xs" style={{ borderColor: 'var(--macro-carbs)', color: 'var(--macro-carbs)' }}>
                      C: {template.totalCarbs}g
                    </Badge>
                    <Badge variant="outline" className="text-xs" style={{ borderColor: 'var(--macro-fat)', color: 'var(--macro-fat)' }}>
                      F: {template.totalFat}g
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <DayTemplateDialog
        open={showDialog}
        onClose={handleDialogClose}
        editingTemplate={editingTemplate}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirm !== null} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete day template?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The template will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
