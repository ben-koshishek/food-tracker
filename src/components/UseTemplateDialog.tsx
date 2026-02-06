import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
    getMealTemplates,
    getDayTemplates,
    getMealTemplateWithItems,
    getDayTemplateWithMeals,
    applyMealTemplateToLog,
    applyDayTemplateToLog,
} from '@/lib/db';
import type { MealTemplateWithNutrition, DayTemplateWithNutrition } from '@/types';
import { MEAL_OPTIONS } from '@/lib/constants';

interface UseTemplateDialogProps {
    open: boolean;
    onClose: () => void;
    date: string;
    onApplied: () => void;
}

export function UseTemplateDialog({ open, onClose, date, onApplied }: UseTemplateDialogProps) {
    const [activeTab, setActiveTab] = useState<'meal' | 'day'>('meal');
    const [mealTemplates, setMealTemplates] = useState<MealTemplateWithNutrition[]>([]);
    const [dayTemplates, setDayTemplates] = useState<DayTemplateWithNutrition[]>([]);
    const [selectedMealTemplate, setSelectedMealTemplate] =
        useState<MealTemplateWithNutrition | null>(null);
    const [selectedDayTemplate, setSelectedDayTemplate] = useState<DayTemplateWithNutrition | null>(
        null,
    );
    const [mealNumber, setMealNumber] = useState(1);
    const [applying, setApplying] = useState(false);
    const [loading, setLoading] = useState(true);

    const loadTemplates = useCallback(async () => {
        setLoading(true);

        // Load meal templates with nutrition
        const rawMealTemplates = await getMealTemplates();
        const mealsWithNutrition = await Promise.all(
            rawMealTemplates.map(async (template) => {
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
        setMealTemplates(mealsWithNutrition);

        // Load day templates with nutrition
        const rawDayTemplates = await getDayTemplates();
        const daysWithNutrition = await Promise.all(
            rawDayTemplates.map(async (template) => {
                const data = await getDayTemplateWithMeals(template.id!);
                if (!data) {
                    return {
                        ...template,
                        mealCount: 0,
                        totalCalories: 0,
                        totalProtein: 0,
                        totalCarbs: 0,
                        totalFat: 0,
                    };
                }

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
                    totalCalories: Math.round(totals.calories),
                    totalProtein: Math.round(totals.protein),
                    totalCarbs: Math.round(totals.carbs),
                    totalFat: Math.round(totals.fat),
                };
            }),
        );
        setDayTemplates(daysWithNutrition);

        setLoading(false);
    }, []);

    useEffect(() => {
        if (open) {
            loadTemplates();
            setSelectedMealTemplate(null);
            setSelectedDayTemplate(null);
            setMealNumber(1);
        }
    }, [open, loadTemplates]);

    const handleApply = async () => {
        setApplying(true);

        try {
            if (activeTab === 'meal' && selectedMealTemplate) {
                await applyMealTemplateToLog(selectedMealTemplate.id!, date, mealNumber);
            } else if (activeTab === 'day' && selectedDayTemplate) {
                await applyDayTemplateToLog(selectedDayTemplate.id!, date);
            }

            onApplied();
            onClose();
        } finally {
            setApplying(false);
        }
    };

    const formattedDate = useMemo(() => {
        return new Date(date).toLocaleDateString('de-DE', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
        });
    }, [date]);

    const canApply =
        (activeTab === 'meal' && selectedMealTemplate !== null) ||
        (activeTab === 'day' && selectedDayTemplate !== null);

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Use Template</DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'meal' | 'day')}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="meal">Meal Template</TabsTrigger>
                        <TabsTrigger value="day">Day Template</TabsTrigger>
                    </TabsList>

                    <TabsContent value="meal" className="mt-4 space-y-4">
                        {loading ? (
                            <div className="space-y-2">
                                {[1, 2, 3].map((i) => (
                                    <div
                                        key={i}
                                        className="h-16 bg-muted rounded-lg animate-pulse"
                                    />
                                ))}
                            </div>
                        ) : mealTemplates.length === 0 ? (
                            <Card className="border-dashed">
                                <CardContent className="py-6 text-center text-muted-foreground">
                                    <p>No meal templates available.</p>
                                    <p className="text-sm">
                                        Create templates from the Templates page.
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {mealTemplates.map((template) => (
                                        <Card
                                            key={template.id}
                                            className={`cursor-pointer transition-colors ${
                                                selectedMealTemplate?.id === template.id
                                                    ? 'border-primary bg-primary/5'
                                                    : 'hover:bg-accent'
                                            }`}
                                            onClick={() => setSelectedMealTemplate(template)}
                                        >
                                            <CardContent className="py-3">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-medium">
                                                            {template.name}
                                                        </h4>
                                                        <p className="text-sm text-muted-foreground">
                                                            {template.itemCount} food
                                                            {template.itemCount !== 1 ? 's' : ''}
                                                        </p>
                                                    </div>
                                                    <Badge
                                                        className="border-0"
                                                        style={{
                                                            backgroundColor:
                                                                'var(--macro-calories)',
                                                            color: '#fff',
                                                        }}
                                                    >
                                                        {template.totalCalories} kcal
                                                    </Badge>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>

                                {selectedMealTemplate && (
                                    <div className="space-y-2">
                                        <Label>Assign to Meal</Label>
                                        <Select
                                            value={mealNumber.toString()}
                                            onValueChange={(v) => setMealNumber(parseInt(v))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {MEAL_OPTIONS.map((option) => (
                                                    <SelectItem
                                                        key={option.number}
                                                        value={option.number.toString()}
                                                    >
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </>
                        )}
                    </TabsContent>

                    <TabsContent value="day" className="mt-4 space-y-4">
                        {loading ? (
                            <div className="space-y-2">
                                {[1, 2].map((i) => (
                                    <div
                                        key={i}
                                        className="h-20 bg-muted rounded-lg animate-pulse"
                                    />
                                ))}
                            </div>
                        ) : dayTemplates.length === 0 ? (
                            <Card className="border-dashed">
                                <CardContent className="py-6 text-center text-muted-foreground">
                                    <p>No day templates available.</p>
                                    <p className="text-sm">
                                        Create templates from the Templates page.
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {dayTemplates.map((template) => (
                                    <Card
                                        key={template.id}
                                        className={`cursor-pointer transition-colors ${
                                            selectedDayTemplate?.id === template.id
                                                ? 'border-primary bg-primary/5'
                                                : 'hover:bg-accent'
                                        }`}
                                        onClick={() => setSelectedDayTemplate(template)}
                                    >
                                        <CardContent className="py-3">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h4 className="font-medium">{template.name}</h4>
                                                    <p className="text-sm text-muted-foreground">
                                                        {template.mealCount} meal
                                                        {template.mealCount !== 1 ? 's' : ''}
                                                    </p>
                                                </div>
                                                <Badge
                                                    className="border-0"
                                                    style={{
                                                        backgroundColor: 'var(--macro-calories)',
                                                        color: '#fff',
                                                    }}
                                                >
                                                    {template.totalCalories} kcal
                                                </Badge>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
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
                    </TabsContent>
                </Tabs>

                {canApply && (
                    <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm">
                            This will add{' '}
                            {activeTab === 'meal' ? (
                                <>
                                    <strong>{selectedMealTemplate?.itemCount}</strong> food
                                    {selectedMealTemplate?.itemCount !== 1 ? 's' : ''} to{' '}
                                    <strong>
                                        {MEAL_OPTIONS.find((o) => o.number === mealNumber)?.label}
                                    </strong>
                                </>
                            ) : (
                                <>
                                    <strong>{selectedDayTemplate?.mealCount}</strong> meal
                                    {selectedDayTemplate?.mealCount !== 1 ? 's' : ''}
                                </>
                            )}{' '}
                            for <strong>{formattedDate}</strong>.
                        </p>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleApply} disabled={!canApply || applying}>
                        {applying ? 'Applying...' : 'Apply Template'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
