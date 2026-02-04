import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MealTemplateList } from '@/components/MealTemplateList';
import { DayTemplateList } from '@/components/DayTemplateList';

export function Templates() {
  const [activeTab, setActiveTab] = useState('meals');

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Templates</h1>
          <p className="text-muted-foreground">Create reusable meal and day templates for quick logging</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="meals" className="relative">
            Meal Templates
          </TabsTrigger>
          <TabsTrigger value="days">
            Day Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="meals" className="mt-6">
          <MealTemplateList />
        </TabsContent>

        <TabsContent value="days" className="mt-6">
          <DayTemplateList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
