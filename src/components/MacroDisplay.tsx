import { Progress } from '@/components/ui/progress';
import type { DailyTotals, UserGoals } from '@/types';

interface MacroDisplayProps {
    totals: DailyTotals;
    goals?: UserGoals;
    compact?: boolean;
}

export function MacroDisplay({ totals, goals, compact = false }: MacroDisplayProps) {
    const defaultGoals: UserGoals = {
        dailyCalories: 2000,
        dailyProtein: 50,
        dailyCarbs: 250,
        dailyFat: 65,
        dailyFiber: 30,
        dailySugar: 50,
        dailySalt: 6,
    };

    const activeGoals = goals || defaultGoals;

    const calculateProgress = (current: number, target: number) => {
        return Math.min((current / target) * 100, 100);
    };

    const macros = [
        {
            label: 'Calories',
            current: totals.calories,
            target: activeGoals.dailyCalories,
            unit: 'kcal',
            warnOver: true,
            primary: true,
            color: 'var(--macro-calories)',
        },
        {
            label: 'Protein',
            current: totals.protein,
            target: activeGoals.dailyProtein,
            unit: 'g',
            warnOver: false,
            primary: true,
            color: 'var(--macro-protein)',
        },
        {
            label: 'Carbs',
            current: totals.carbs,
            target: activeGoals.dailyCarbs,
            unit: 'g',
            warnOver: true,
            primary: true,
            color: 'var(--macro-carbs)',
        },
        {
            label: 'Fat',
            current: totals.fat,
            target: activeGoals.dailyFat,
            unit: 'g',
            warnOver: true,
            primary: true,
            color: 'var(--macro-fat)',
        },
        {
            label: 'Fiber',
            current: totals.fiber,
            target: activeGoals.dailyFiber,
            unit: 'g',
            warnOver: false,
            primary: false,
            color: 'var(--macro-fiber)',
        },
        {
            label: 'Sugar',
            current: totals.sugar,
            target: activeGoals.dailySugar,
            unit: 'g',
            warnOver: true,
            primary: false,
            color: 'var(--macro-sugar)',
        },
        {
            label: 'Salt',
            current: totals.salt,
            target: activeGoals.dailySalt,
            unit: 'g',
            warnOver: true,
            primary: false,
            color: 'var(--macro-salt)',
        },
    ];

    const displayMacros = compact ? macros.filter((m) => m.primary) : macros;

    return (
        <div className="space-y-4">
            {displayMacros.map((macro) => {
                const progress = calculateProgress(macro.current, macro.target);
                const isOver = macro.current > macro.target;
                const showWarning = isOver && macro.warnOver;

                return (
                    <div key={macro.label} className="space-y-1.5">
                        <div className="flex justify-between items-baseline">
                            <span className="text-sm font-medium" style={{ color: macro.color }}>
                                {macro.label}
                            </span>
                            <div className="text-right">
                                <span
                                    className={`text-lg font-semibold tabular-nums ${showWarning ? 'text-destructive' : ''}`}
                                    style={!showWarning ? { color: macro.color } : undefined}
                                >
                                    {Math.round(macro.current * 10) / 10}
                                </span>
                                <span className="text-sm text-muted-foreground ml-1">
                                    / {macro.target} {macro.unit}
                                </span>
                            </div>
                        </div>
                        <Progress
                            value={progress}
                            className="h-2"
                            style={
                                {
                                    '--progress-color': showWarning
                                        ? 'var(--destructive)'
                                        : macro.color,
                                } as React.CSSProperties
                            }
                        />
                    </div>
                );
            })}
        </div>
    );
}
