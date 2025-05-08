"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Barcode, Info, ListChecks, ScanLine, FileText, ChefHat } from 'lucide-react';

const allergenFormSchema = z.object({
  barcode: z.string().optional(),
  productName: z.string().min(1, { message: "Product name is required." }),
  ingredients: z.string().min(1, { message: "Ingredients list is required." }),
  productDescription: z.string().optional(),
});

export type AllergenFormData = z.infer<typeof allergenFormSchema>;

interface AllergenFormProps {
  onSubmit: (data: AllergenFormData) => void;
  isLoading: boolean;
}

export function AllergenForm({ onSubmit, isLoading }: AllergenFormProps) {
  const form = useForm<AllergenFormData>({
    resolver: zodResolver(allergenFormSchema),
    defaultValues: {
      barcode: '',
      productName: '',
      ingredients: '',
      productDescription: '',
    },
  });

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl">
      <CardHeader className="text-center">
        <div className="flex justify-center items-center mb-4">
           <ChefHat size={48} className="text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold">Check Product Allergens</CardTitle>
        <CardDescription>Enter product details to analyze for allergens.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="barcode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><ScanLine size={18}/>Barcode (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 1234567890123" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="productName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><FileText size={18}/>Product Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Crunchy Peanut Butter" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ingredients"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><ListChecks size={18}/>Ingredients List</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Peanuts, Sugar, Salt, Hydrogenated Vegetable Oil"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="productDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><Info size={18}/>Product Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., A delicious spread for sandwiches and snacks."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Barcode size={20}/> Check Allergens
                </div>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
