import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MacroDisplay } from '@/components/MacroDisplay';
import { ProgressChart } from '@/components/ProgressChart';
import { getFoodEntriesByDate, getFoodEntriesForDateRange, getGoals } from '@/lib/db';
import type { FoodEntry, UserGoals, DailyTotals } from '@/types';

export function Dashboard() {
  const [todayEntries, setTodayEntries] = useState<FoodEntry[]>([]);
  const [weekEntries, setWeekEntries] = useState<FoodEntry[]>([]);
  const [goals, setGoals] = useState<UserGoals | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 6);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    try {
      const [todayData, weekData, goalsData] = await Promise.all([
        getFoodEntriesByDate(today),
        getFoodEntriesForDateRange(weekAgoStr, today),
        getGoals(),
      ]);

      setTodayEntries(todayData);
      setWeekEntries(weekData);
      setGoals(goalsData);
      setError(null);
    } catch {
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const todayTotals: DailyTotals = useMemo(
    () =>
      todayEntries.reduce(
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
    [todayEntries]
  );

  const calorieGoal = goals?.dailyCalories || 2000;
  const remainingCalories = Math.max(0, calorieGoal - todayTotals.calories);
  const isOverGoal = todayTotals.calories > calorieGoal;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="grid gap-6 md:grid-cols-2">
            <div className="h-64 bg-muted rounded-lg" />
            <div className="h-64 bg-muted rounded-lg" />
          </div>
          <div className="h-80 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-destructive/50">
          <CardContent className="py-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="font-medium mb-2">{error}</h3>
            <Button onClick={loadData} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Button asChild>
          <Link to="/log">Log Food</Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Today's Progress - Primary Card with accent border */}
        <Card className="border-l-4 border-l-primary shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-muted-foreground">Today's Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <MacroDisplay totals={todayTotals} goals={goals} />
          </CardContent>
        </Card>

        {/* Quick Stats with visual hierarchy */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-muted-foreground">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {/* Calories - Hero stat */}
              <div className="col-span-2 p-5 bg-secondary rounded-xl">
                <p className="text-sm text-muted-foreground mb-1">Today's Calories</p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-4xl font-bold tabular-nums ${isOverGoal ? 'text-destructive' : ''}`}>
                    {Math.round(todayTotals.calories)}
                  </span>
                  <span className="text-lg text-muted-foreground">/ {calorieGoal}</span>
                </div>
                <p className={`text-sm mt-1 ${isOverGoal ? 'text-destructive' : 'text-success'}`}>
                  {isOverGoal ? `${Math.round(todayTotals.calories - calorieGoal)} over` : `${Math.round(remainingCalories)} remaining`}
                </p>
              </div>

              {/* Secondary stats */}
              <div className="p-4 bg-muted/50 rounded-lg transition-colors hover:bg-muted">
                <p className="text-3xl font-bold tabular-nums">{todayEntries.length}</p>
                <p className="text-sm text-muted-foreground">Foods logged</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg transition-colors hover:bg-muted">
                <p className="text-3xl font-bold tabular-nums">{weekEntries.length}</p>
                <p className="text-sm text-muted-foreground">This week</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Chart */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium text-muted-foreground">Weekly Calories</CardTitle>
        </CardHeader>
        <CardContent>
          <ProgressChart entries={weekEntries} goals={goals} />
        </CardContent>
      </Card>

      {/* Empty state guidance */}
      {todayEntries.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="font-medium mb-1">No food logged today</h3>
            <p className="text-sm text-muted-foreground mb-4">Start tracking your meals to see your progress.</p>
            <Button asChild variant="outline">
              <Link to="/log">Add your first meal</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
