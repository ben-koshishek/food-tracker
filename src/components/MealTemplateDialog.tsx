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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    getSavedFoods,
    searchSavedFoods,
    addMealTemplate,
    addMealTemplateItem,
    deleteMealTemplateItem,
} from '@/lib/db';
import type { SavedFood, MealTemplate, MealTemplateItem } from '@/types';

interface TemplateItem {
    id?: number;
    savedFoodId: number;
    savedFood: SavedFood;
    servingSize: number;
}

interface MealTemplateDialogProps {
    open: boolean;
    onClose: () => void;
    editingTemplate: {
        template: MealTemplate;
        items: (MealTemplateItem & { savedFood: SavedFood })[];
    } | null;
}

export function MealTemplateDialog({ open, onClose, editingTemplate }: MealTemplateDialogProps) {
    const [step, setStep] = useState<'name' | 'foods' | 'edit'>('name');
    const [templateName, setTemplateName] = useState('');
    const [items, setItems] = useState<TemplateItem[]>([]);
    const [savedFoods, setSavedFoods] = useState<SavedFood[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [saving, setSaving] = useState(false);

    // Reset state when dialog opens/closes
    useEffect(() => {
        if (open) {
            if (editingTemplate) {
                setTemplateName(editingTemplate.template.name);
                setItems(
                    editingTemplate.items.map((item) => ({
                        id: item.id,
                        savedFoodId: item.savedFoodId,
                        savedFood: item.savedFood,
                        servingSize: item.servingSize,
                    })),
                );
                setStep('edit');
            } else {
                setTemplateName('');
                setItems([]);
                setStep('name');
            }
            setSearchQuery('');
        }
    }, [open, editingTemplate]);

    const loadFoods = useCallback(async () => {
        const foods = searchQuery ? await searchSavedFoods(searchQuery) : await getSavedFoods();
        setSavedFoods(foods);
    }, [searchQuery]);

    useEffect(() => {
        if (open && (step === 'foods' || step === 'edit')) {
            loadFoods();
        }
    }, [open, step, loadFoods]);

    const totals = useMemo(() => {
        return items.reduce(
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
    }, [items]);

    const handleAddFood = (food: SavedFood) => {
        // Check if already added
        if (items.some((item) => item.savedFoodId === food.id)) {
            return;
        }

        setItems([
            ...items,
            {
                savedFoodId: food.id!,
                savedFood: food,
                servingSize: food.defaultServingSize,
            },
        ]);
    };

    const handleRemoveFood = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleServingSizeChange = (index: number, size: number) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], servingSize: size };
        setItems(newItems);
    };

    const handleSave = async () => {
        if (!templateName.trim() || items.length === 0) return;

        setSaving(true);

        try {
            if (editingTemplate) {
                // Delete removed items
                const existingIds = new Set(items.filter((i) => i.id).map((i) => i.id));
                for (const item of editingTemplate.items) {
                    if (!existingIds.has(item.id)) {
                        await deleteMealTemplateItem(item.id!);
                    }
                }

                // Add new items
                for (const item of items) {
                    if (!item.id) {
                        await addMealTemplateItem({
                            mealTemplateId: editingTemplate.template.id!,
                            savedFoodId: item.savedFoodId,
                            servingSize: item.servingSize,
                        });
                    }
                }

                // Note: We don't update existing item serving sizes in this simple implementation
                // A more complete implementation would handle that case
            } else {
                // Create new template
                const templateId = await addMealTemplate({
                    name: templateName.trim(),
                    createdAt: new Date(),
                });

                // Add items
                for (const item of items) {
                    await addMealTemplateItem({
                        mealTemplateId: templateId,
                        savedFoodId: item.savedFoodId,
                        servingSize: item.servingSize,
                    });
                }
            }

            onClose();
        } finally {
            setSaving(false);
        }
    };

    const handleContinue = () => {
        if (templateName.trim()) {
            setStep('foods');
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {editingTemplate
                            ? 'Edit Meal Template'
                            : step === 'name'
                              ? 'New Meal Template'
                              : 'Add Foods'}
                    </DialogTitle>
                </DialogHeader>

                {step === 'name' && (
                    <>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="templateName">Template Name</Label>
                                <Input
                                    id="templateName"
                                    placeholder="e.g., Breakfast, Post-workout meal"
                                    value={templateName}
                                    onChange={(e) => setTemplateName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
                                    autoFocus
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button onClick={handleContinue} disabled={!templateName.trim()}>
                                Continue
                            </Button>
                        </DialogFooter>
                    </>
                )}

                {(step === 'foods' || step === 'edit') && (
                    <>
                        <div className="space-y-4">
                            {/* Template name (editable in edit mode) */}
                            {step === 'edit' && (
                                <div className="space-y-2">
                                    <Label htmlFor="editName">Template Name</Label>
                                    <Input
                                        id="editName"
                                        value={templateName}
                                        onChange={(e) => setTemplateName(e.target.value)}
                                    />
                                </div>
                            )}

                            {/* Selected foods */}
                            {items.length > 0 && (
                                <div className="space-y-2">
                                    <Label>Selected Foods ({items.length})</Label>
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {items.map((item, index) => (
                                            <div
                                                key={`${item.savedFoodId}-${index}`}
                                                className="flex items-center gap-2 p-2 bg-muted rounded-lg"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-sm truncate">
                                                        {item.savedFood.name}
                                                    </p>
                                                </div>
                                                <Input
                                                    type="number"
                                                    value={item.servingSize}
                                                    onChange={(e) =>
                                                        handleServingSizeChange(
                                                            index,
                                                            parseFloat(e.target.value) || 0,
                                                        )
                                                    }
                                                    className="w-20 h-8 text-sm"
                                                    min="1"
                                                />
                                                <span className="text-sm text-muted-foreground">
                                                    g
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                                    onClick={() => handleRemoveFood(index)}
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
                                                            d="M6 18L18 6M6 6l12 12"
                                                        />
                                                    </svg>
                                                </Button>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Totals */}
                                    <div className="flex flex-wrap gap-1.5 pt-2">
                                        <Badge
                                            className="border-0"
                                            style={{
                                                backgroundColor: 'var(--macro-calories)',
                                                color: '#fff',
                                            }}
                                        >
                                            {Math.round(totals.calories)} kcal
                                        </Badge>
                                        <Badge
                                            variant="outline"
                                            style={{
                                                borderColor: 'var(--macro-protein)',
                                                color: 'var(--macro-protein)',
                                            }}
                                        >
                                            P: {Math.round(totals.protein)}g
                                        </Badge>
                                        <Badge
                                            variant="outline"
                                            style={{
                                                borderColor: 'var(--macro-carbs)',
                                                color: 'var(--macro-carbs)',
                                            }}
                                        >
                                            C: {Math.round(totals.carbs)}g
                                        </Badge>
                                        <Badge
                                            variant="outline"
                                            style={{
                                                borderColor: 'var(--macro-fat)',
                                                color: 'var(--macro-fat)',
                                            }}
                                        >
                                            F: {Math.round(totals.fat)}g
                                        </Badge>
                                    </div>
                                </div>
                            )}

                            {/* Food search */}
                            <div className="space-y-2">
                                <Label>Add Foods</Label>
                                <Input
                                    placeholder="Search foods..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                <ScrollArea className="h-48">
                                    {savedFoods.length === 0 ? (
                                        <div className="text-center py-4 text-muted-foreground">
                                            <p className="text-sm">No foods found.</p>
                                            <p className="text-xs">
                                                Add foods from the "My Foods" page first.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-1 pr-4">
                                            {savedFoods.map((food) => {
                                                const isAdded = items.some(
                                                    (i) => i.savedFoodId === food.id,
                                                );
                                                return (
                                                    <Card
                                                        key={food.id}
                                                        className={`cursor-pointer transition-colors ${
                                                            isAdded
                                                                ? 'bg-primary/5 border-primary/20'
                                                                : 'hover:bg-accent'
                                                        }`}
                                                        onClick={() =>
                                                            !isAdded && handleAddFood(food)
                                                        }
                                                    >
                                                        <CardContent className="py-2 px-3">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-medium text-sm truncate">
                                                                        {food.name}
                                                                    </p>
                                                                    {food.brand && (
                                                                        <p className="text-xs text-muted-foreground truncate">
                                                                            {food.brand}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <Badge
                                                                        variant="secondary"
                                                                        className="text-xs"
                                                                    >
                                                                        {Math.round(
                                                                            food.caloriesPer100g,
                                                                        )}{' '}
                                                                        kcal
                                                                    </Badge>
                                                                    {isAdded && (
                                                                        <svg
                                                                            className="w-4 h-4 text-primary"
                                                                            fill="none"
                                                                            viewBox="0 0 24 24"
                                                                            stroke="currentColor"
                                                                        >
                                                                            <path
                                                                                strokeLinecap="round"
                                                                                strokeLinejoin="round"
                                                                                strokeWidth={2}
                                                                                d="M5 13l4 4L19 7"
                                                                            />
                                                                        </svg>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                );
                                            })}
                                        </div>
                                    )}
                                </ScrollArea>
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            {step === 'foods' && (
                                <Button variant="outline" onClick={() => setStep('name')}>
                                    Back
                                </Button>
                            )}
                            <Button variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={saving || !templateName.trim() || items.length === 0}
                            >
                                {saving
                                    ? 'Saving...'
                                    : editingTemplate
                                      ? 'Save Changes'
                                      : 'Create Template'}
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
