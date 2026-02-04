import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { getGoals, setGoals, exportData, importData, resetData } from '@/lib/db';
import {
  calculateBMR,
  calculateTDEE,
  calculateGoalCalories,
  calculateMacros,
  ACTIVITY_LABELS,
  GOAL_LABELS,
  type Sex,
  type ActivityLevel,
  type Goal,
} from '@/lib/tdee';
import type { UserGoals } from '@/types';

export function Settings() {
  const [goals, setGoalsState] = useState<UserGoals>({
    dailyCalories: 2000,
    dailyProtein: 50,
    dailyCarbs: 250,
    dailyFat: 65,
    dailyFiber: 30,
    dailySugar: 50,
    dailySalt: 6,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);

  // Calculator state
  const [calcSex, setCalcSex] = useState<Sex>('male');
  const [calcWeight, setCalcWeight] = useState('');
  const [calcHeight, setCalcHeight] = useState('');
  const [calcAge, setCalcAge] = useState('');
  const [calcActivity, setCalcActivity] = useState<ActivityLevel>('moderately_active');
  const [calcGoal, setCalcGoal] = useState<Goal>('maintenance');
  const goalsCardRef = useRef<HTMLDivElement>(null);

  const calcResult = useMemo(() => {
    const weight = parseFloat(calcWeight);
    const height = parseFloat(calcHeight);
    const age = parseFloat(calcAge);
    if (!weight || !height || !age || weight <= 0 || height <= 0 || age <= 0) return null;

    const bmr = calculateBMR(calcSex, weight, height, age);
    const tdee = calculateTDEE(bmr, calcActivity);
    const targetCalories = calculateGoalCalories(tdee, calcGoal);
    const macros = calculateMacros(targetCalories, weight, calcGoal);
    return { bmr, tdee, targetCalories, macros };
  }, [calcSex, calcWeight, calcHeight, calcAge, calcActivity, calcGoal]);

  const handleApplyToGoals = () => {
    if (!calcResult) return;
    setGoalsState((prev) => ({
      ...prev,
      dailyCalories: calcResult.targetCalories,
      dailyProtein: calcResult.macros.protein,
      dailyCarbs: calcResult.macros.carbs,
      dailyFat: calcResult.macros.fat,
    }));
    goalsCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    loadGoals();
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  async function loadGoals() {
    const data = await getGoals();
    if (data) {
      setGoalsState(data);
    }
    setLoading(false);
  }

  const handleSaveGoals = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await setGoals(goals);
      setMessage({ type: 'success', text: 'Goals saved successfully!' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to save goals.' });
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const data = await exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `food-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: 'Data exported successfully!' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to export data.' });
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await importData(data);
      setMessage({ type: 'success', text: 'Data imported successfully!' });
      loadGoals();
    } catch {
      setMessage({ type: 'error', text: 'Failed to import data. Make sure the file is valid.' });
    }

    event.target.value = '';
  };

  const handleInputChange = (field: keyof UserGoals, value: string) => {
    setGoalsState((prev) => ({
      ...prev,
      [field]: parseFloat(value) || 0,
    }));
  };

  const handleReset = async () => {
    try {
      await resetData();
      setMessage({ type: 'success', text: 'Data reset successfully!' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to reset data.' });
    }
    setShowResetDialog(false);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-32 bg-muted rounded" />
          <div className="h-64 bg-muted rounded-lg" />
          <div className="h-32 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Toast-like notification */}
      {message && (
        <div
          className={`fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg border transition-all animate-in slide-in-from-right ${
            message.type === 'success'
              ? 'bg-success/10 border-success/20 text-success'
              : 'bg-destructive/10 border-destructive/20 text-destructive'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className="font-medium">{message.text}</span>
          </div>
        </div>
      )}

      {/* Calorie Calculator */}
      <Card className="shadow-sm">
        <CardHeader className="border-l-4 border-l-accent rounded-tl-lg">
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Calculate Your Goals
          </CardTitle>
          <CardDescription>Estimate daily calories and macros based on your body and goals</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Sex toggle */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Sex</Label>
            <div className="flex rounded-lg border p-1 bg-muted/50 w-fit">
              {(['male', 'female'] as const).map((sex) => (
                <button
                  key={sex}
                  type="button"
                  onClick={() => setCalcSex(sex)}
                  className={`px-4 py-2 text-sm rounded-md transition-all ${
                    calcSex === sex
                      ? 'bg-primary text-primary-foreground shadow-sm font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {sex === 'male' ? 'Male' : 'Female'}
                </button>
              ))}
            </div>
          </div>

          {/* Body stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="calc-weight" className="text-muted-foreground">Weight</Label>
              <div className="relative">
                <Input
                  id="calc-weight"
                  type="number"
                  placeholder="75"
                  value={calcWeight}
                  onChange={(e) => setCalcWeight(e.target.value)}
                  min="1"
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">kg</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="calc-height" className="text-muted-foreground">Height</Label>
              <div className="relative">
                <Input
                  id="calc-height"
                  type="number"
                  placeholder="175"
                  value={calcHeight}
                  onChange={(e) => setCalcHeight(e.target.value)}
                  min="1"
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">cm</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="calc-age" className="text-muted-foreground">Age</Label>
              <div className="relative">
                <Input
                  id="calc-age"
                  type="number"
                  placeholder="30"
                  value={calcAge}
                  onChange={(e) => setCalcAge(e.target.value)}
                  min="1"
                  className="pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">yrs</span>
              </div>
            </div>
          </div>

          {/* Activity level */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Activity Level</Label>
            <Select value={calcActivity} onValueChange={(v) => setCalcActivity(v as ActivityLevel)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(ACTIVITY_LABELS) as [ActivityLevel, { label: string; description: string }][]).map(
                  ([key, { label, description }]) => (
                    <SelectItem key={key} value={key}>
                      {label} — {description}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Goal selector */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Goal</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.entries(GOAL_LABELS) as [Goal, { label: string; description: string }][]).map(
                ([key, { label, description }]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCalcGoal(key)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      calcGoal === key
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <span className={`text-sm font-medium ${calcGoal === key ? 'text-primary' : ''}`}>
                      {label}
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                  </button>
                )
              )}
            </div>
          </div>

          {/* Results */}
          {calcResult && (
            <div className="p-4 rounded-lg bg-muted/30 space-y-3">
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>BMR: {calcResult.bmr} kcal</span>
                <span>TDEE: {calcResult.tdee} kcal</span>
              </div>
              <div className="text-center">
                <span className="text-3xl font-bold" style={{ color: 'var(--macro-calories)' }}>
                  {calcResult.targetCalories}
                </span>
                <span className="text-sm text-muted-foreground ml-1">kcal / day</span>
              </div>
              <div className="flex justify-center gap-4 text-sm font-medium">
                <span style={{ color: 'var(--macro-protein)' }}>P: {calcResult.macros.protein}g</span>
                <span style={{ color: 'var(--macro-carbs)' }}>C: {calcResult.macros.carbs}g</span>
                <span style={{ color: 'var(--macro-fat)' }}>F: {calcResult.macros.fat}g</span>
              </div>
            </div>
          )}

          <Button onClick={handleApplyToGoals} disabled={!calcResult} className="w-full sm:w-auto">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            Apply to Goals
          </Button>
        </CardContent>
      </Card>

      {/* Daily Goals */}
      <Card ref={goalsCardRef} className="shadow-sm">
        <CardHeader className="border-l-4 border-l-primary rounded-tl-lg">
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Daily Goals
          </CardTitle>
          <CardDescription>Set your daily nutrition targets</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Primary goals */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Primary</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="calories" className="text-muted-foreground">Calories</Label>
                <div className="relative">
                  <Input
                    id="calories"
                    type="number"
                    value={goals.dailyCalories}
                    onChange={(e) => handleInputChange('dailyCalories', e.target.value)}
                    min="0"
                    className="pr-12 text-lg font-semibold"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">kcal</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="protein" className="text-muted-foreground">Protein</Label>
                <div className="relative">
                  <Input
                    id="protein"
                    type="number"
                    value={goals.dailyProtein}
                    onChange={(e) => handleInputChange('dailyProtein', e.target.value)}
                    min="0"
                    className="pr-8 text-lg font-semibold"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">g</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="carbs" className="text-muted-foreground">Carbs</Label>
                <div className="relative">
                  <Input
                    id="carbs"
                    type="number"
                    value={goals.dailyCarbs}
                    onChange={(e) => handleInputChange('dailyCarbs', e.target.value)}
                    min="0"
                    className="pr-8 text-lg font-semibold"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">g</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fat" className="text-muted-foreground">Fat</Label>
                <div className="relative">
                  <Input
                    id="fat"
                    type="number"
                    value={goals.dailyFat}
                    onChange={(e) => handleInputChange('dailyFat', e.target.value)}
                    min="0"
                    className="pr-8 text-lg font-semibold"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">g</span>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary goals */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Secondary</h4>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="fiber" className="text-muted-foreground">Fiber (min)</Label>
                <div className="relative">
                  <Input
                    id="fiber"
                    type="number"
                    value={goals.dailyFiber}
                    onChange={(e) => handleInputChange('dailyFiber', e.target.value)}
                    min="0"
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">g</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sugar" className="text-muted-foreground">Sugar (max)</Label>
                <div className="relative">
                  <Input
                    id="sugar"
                    type="number"
                    value={goals.dailySugar}
                    onChange={(e) => handleInputChange('dailySugar', e.target.value)}
                    min="0"
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">g</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="salt" className="text-muted-foreground">Salt (max)</Label>
                <div className="relative">
                  <Input
                    id="salt"
                    type="number"
                    value={goals.dailySalt}
                    onChange={(e) => handleInputChange('dailySalt', e.target.value)}
                    min="0"
                    step="0.1"
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">g</span>
                </div>
              </div>
            </div>
          </div>

          <Button onClick={handleSaveGoals} disabled={saving} className="w-full sm:w-auto">
            {saving ? (
              <>
                <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Goals
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card className="shadow-sm">
        <CardHeader className="border-l-4 border-l-warning rounded-tl-lg">
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
            Data Management
          </CardTitle>
          <CardDescription>Export or import your food tracking data</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Button variant="outline" onClick={handleExport} className="flex-1 sm:flex-none">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export Data
            </Button>
            <div>
              <Input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
                id="import-file"
              />
              <Button variant="outline" asChild className="flex-1 sm:flex-none">
                <label htmlFor="import-file" className="cursor-pointer flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Import Data
                </label>
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-4 max-w-prose">
            Export your data as a JSON file for backup. You can import it later to restore your data.
          </p>

          <div className="border-t pt-4 mt-4">
            <h4 className="text-sm font-medium text-destructive mb-2">Danger Zone</h4>
            <Button variant="outline" onClick={() => setShowResetDialog(true)} className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Reset Data
            </Button>
            <p className="text-xs text-muted-foreground mt-2 max-w-prose">
              Delete all food log history and templates. Your saved foods will be kept.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card className="shadow-sm bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base">About</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3 max-w-prose">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z" />
              </svg>
            </div>
            <span className="font-medium text-foreground">Food Tracker v1.0</span>
          </div>
          <p>
            A simple calorie and nutrition tracker using Open Food Facts database with focus on German/European products.
          </p>
          <div className="flex items-center gap-2 pt-2">
            <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>All data stored locally - no account required</span>
          </div>
        </CardContent>
      </Card>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset all data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all food log history and templates, but keep your saved foods. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reset Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
