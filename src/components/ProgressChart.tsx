import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    Cell,
} from 'recharts';
import type { FoodEntry, UserGoals } from '@/types';

interface ProgressChartProps {
    entries: FoodEntry[];
    goals?: UserGoals;
}

export function ProgressChart({ entries, goals }: ProgressChartProps) {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const calorieGoal = goals?.dailyCalories || 2000;

    const days: {
        date: string;
        label: string;
        calories: number;
        isToday: boolean;
        status: 'under' | 'close' | 'over';
    }[] = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const dayEntries = entries.filter((e) => e.date === dateStr);
        const totalCalories = dayEntries.reduce((sum, e) => sum + e.calories, 0);

        const ratio = totalCalories / calorieGoal;
        let status: 'under' | 'close' | 'over' = 'under';
        if (ratio > 1) status = 'over';
        else if (ratio >= 0.85) status = 'close';

        days.push({
            date: dateStr,
            label: date.toLocaleDateString('de-DE', { weekday: 'short' }),
            calories: totalCalories,
            isToday: dateStr === todayStr,
            status,
        });
    }

    const getBarColor = (status: 'under' | 'close' | 'over', isToday: boolean) => {
        // Using palette 8 colors directly for SVG compatibility
        const colors = {
            primary: '#078080',
            primaryMuted: '#5ab5b5',
            success: '#078080',
            destructive: '#f45d48',
        };
        if (status === 'over') return colors.destructive;
        if (status === 'close') return colors.success;
        return isToday ? colors.primary : colors.primaryMuted;
    };

    return (
        <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={days} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ddd8d3" />
                    <XAxis
                        dataKey="label"
                        tick={{ fontSize: 12, fill: '#5f5f5f' }}
                        axisLine={{ stroke: '#ddd8d3' }}
                        tickLine={false}
                    />
                    <YAxis
                        tick={{ fontSize: 12, fill: '#5f5f5f' }}
                        axisLine={false}
                        tickLine={false}
                        width={45}
                    />
                    <Tooltip
                        cursor={{ fill: '#efe9e4' }}
                        contentStyle={{
                            backgroundColor: '#fffffe',
                            border: '1px solid #ddd8d3',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        }}
                        labelStyle={{ color: '#232323', fontWeight: 500, marginBottom: 4 }}
                        formatter={(value) => [`${value} kcal`, 'Calories']}
                    />
                    <ReferenceLine
                        y={calorieGoal}
                        stroke="#078080"
                        strokeDasharray="5 5"
                        strokeWidth={2}
                        label={{
                            value: `Goal: ${calorieGoal}`,
                            position: 'insideTopRight',
                            fill: '#5f5f5f',
                            fontSize: 11,
                        }}
                    />
                    <Bar dataKey="calories" radius={[6, 6, 0, 0]} maxBarSize={50}>
                        {days.map((day, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={getBarColor(day.status, day.isToday)}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
