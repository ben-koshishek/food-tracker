import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getMealTemplates, getMealTemplateWithItems, deleteMealTemplate } from '@/lib/db';
import type { MealTemplate, SavedFood, MealTemplateItem } from '@/types';
import { MealTemplateDialog } from './MealTemplateDialog';

interface MealTemplateWithNutrition extends MealTemplate {
    itemCount: number;
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
}

export function MealTemplateList() {
    const [templates, setTemplates] = useState<MealTemplateWithNutrition[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDialog, setShowDialog] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<{
        template: MealTemplate;
        items: (MealTemplateItem & { savedFood: SavedFood })[];
    } | null>(null);

    const loadTemplates = useCallback(async () => {
        setLoading(true);
        const rawTemplates = await getMealTemplates();

        const templatesWithNutrition = await Promise.all(
            rawTemplates.map(async (template) => {
                const data = await getMealTemplateWithItems(template.id!);
                if (!data) {
                    return {
                        ...template,
                        itemCount: 0,
                        totalCalories: 0,
                        totalProtein: 0,
                        totalCarbs: 0,
                        totalFat: 0,
                    };
                }

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
                    { calories: 0, protein: 0, carbs: 0, fat: 0 },
                );

                return {
                    ...template,
                    itemCount: data.items.length,
                    totalCalories: Math.round(totals.calories),
                    totalProtein: Math.round(totals.protein),
                    totalCarbs: Math.round(totals.carbs),
                    totalFat: Math.round(totals.fat),
                };
            }),
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

    const handleEdit = async (template: MealTemplate) => {
        const data = await getMealTemplateWithItems(template.id!);
        if (data) {
            setEditingTemplate(data);
            setShowDialog(true);
        }
    };

    const handleDelete = async (id: number) => {
        if (confirm('Delete this meal template? This cannot be undone.')) {
            await deleteMealTemplate(id);
            loadTemplates();
        }
    };

    const handleDialogClose = () => {
        setShowDialog(false);
        setEditingTemplate(null);
        loadTemplates();
    };

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                        <div className="h-24 bg-muted rounded-lg" />
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
                        {templates.length} meal template{templates.length !== 1 ? 's' : ''}
                    </p>
                    <Button onClick={handleCreateNew}>
                        <svg
                            className="w-4 h-4 mr-2"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 4v16m8-8H4"
                            />
                        </svg>
                        New Template
                    </Button>
                </div>

                {templates.length === 0 ? (
                    <Card className="border-dashed">
                        <CardContent className="py-12 text-center">
                            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                <svg
                                    className="w-8 h-8 text-muted-foreground"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={1.5}
                                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                                    />
                                </svg>
                            </div>
                            <h3 className="font-medium text-lg mb-1">No meal templates yet</h3>
                            <p className="text-muted-foreground mb-4">
                                Create templates for your favorite meals to log them quickly.
                            </p>
                            <Button onClick={handleCreateNew}>Create Your First Template</Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                                                {template.itemCount} food
                                                {template.itemCount !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (template.id) handleDelete(template.id);
                                            }}
                                        >
                                            <svg
                                                className="w-4 h-4"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                />
                                            </svg>
                                        </Button>
                                    </div>

                                    <div className="flex flex-wrap gap-1.5">
                                        <Badge
                                            className="border-0"
                                            style={{
                                                backgroundColor: 'var(--macro-calories)',
                                                color: '#fff',
                                            }}
                                        >
                                            {template.totalCalories} kcal
                                        </Badge>
                                        <Badge
                                            variant="outline"
                                            className="text-xs"
                                            style={{
                                                borderColor: 'var(--macro-protein)',
                                                color: 'var(--macro-protein)',
                                            }}
                                        >
                                            P: {template.totalProtein}g
                                        </Badge>
                                        <Badge
                                            variant="outline"
                                            className="text-xs"
                                            style={{
                                                borderColor: 'var(--macro-carbs)',
                                                color: 'var(--macro-carbs)',
                                            }}
                                        >
                                            C: {template.totalCarbs}g
                                        </Badge>
                                        <Badge
                                            variant="outline"
                                            className="text-xs"
                                            style={{
                                                borderColor: 'var(--macro-fat)',
                                                color: 'var(--macro-fat)',
                                            }}
                                        >
                                            F: {template.totalFat}g
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            <MealTemplateDialog
                open={showDialog}
                onClose={handleDialogClose}
                editingTemplate={editingTemplate}
            />
        </>
    );
}
