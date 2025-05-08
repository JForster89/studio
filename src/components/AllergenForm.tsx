
"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Barcode, Info, ListChecks, ScanLine, FileText, ChefHat, AlertCircle } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

const allergenFormSchema = z.object({
  barcode: z.string().optional(),
  productName: z.string().min(1, { message: "Product name is required." }),
  ingredients: z.string().min(1, { message: "Ingredients list is required." }),
  productDescription: z.string().optional(),
});

export type AllergenFormData = z.infer<typeof allergenFormSchema>;

interface AllergenFormProps {
  onSubmit: (data: AllergenFormData) => void;
  isLoading: boolean; // For the main form submission loading state
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

  const [isFetchingBarcode, setIsFetchingBarcode] = useState(false);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);

  const watchedBarcode = form.watch("barcode");

  const handleBarcodeFetch = useCallback(async (barcodeToFetch: string) => {
    setIsFetchingBarcode(true);
    setBarcodeError(null);
    try {
      const response = await fetch(`/api/barcode?barcode=${barcodeToFetch}`);
      const data = await response.json();

      if (response.ok) {
        form.setValue("productName", data.productName || "", { shouldValidate: true });
        form.setValue("ingredients", data.ingredients || "", { shouldValidate: true });
        form.setValue("productDescription", data.productDescription || "", { shouldValidate: true });
      } else {
        setBarcodeError(data.error || "Failed to fetch barcode data. Please enter details manually.");
        form.setValue("productName", "", { shouldValidate: true });
        form.setValue("ingredients", "", { shouldValidate: true });
        form.setValue("productDescription", "", { shouldValidate: true });
      }
    } catch (error) {
      console.error("Error fetching barcode data:", error);
      setBarcodeError("An error occurred fetching barcode data. Please enter details manually.");
      form.setValue("productName", "", { shouldValidate: true });
      form.setValue("ingredients", "", { shouldValidate: true });
      form.setValue("productDescription", "", { shouldValidate: true });
    } finally {
      setIsFetchingBarcode(false);
    }
  }, [form]);

  useEffect(() => {
    const currentBarcode = watchedBarcode?.trim();
    if (currentBarcode && currentBarcode !== "") {
      const handler = setTimeout(() => {
        handleBarcodeFetch(currentBarcode);
      }, 500); // Debounce: wait 500ms after user stops typing

      return () => clearTimeout(handler);
    } else {
      // If barcode is empty, clear fetching state and error, but not other fields
      setIsFetchingBarcode(false);
      setBarcodeError(null);
    }
  }, [watchedBarcode, handleBarcodeFetch]);

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl">
      <CardHeader className="text-center">
        <div className="flex justify-center items-center mb-4">
           <ChefHat size={48} className="text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold">Check Product Allergens</CardTitle>
        <CardDescription>Enter barcode to auto-fill or provide product details manually.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="barcode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <ScanLine size={18}/>Barcode (Optional)
                    {isFetchingBarcode && (
                      <svg className="animate-spin ml-2 h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 1234567890123" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {barcodeError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Barcode Lookup Failed</AlertTitle>
                <AlertDescription>{barcodeError}</AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="productName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><FileText size={18}/>Product Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Crunchy Peanut Butter" {...field} disabled={isFetchingBarcode} />
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
                      disabled={isFetchingBarcode}
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
                      disabled={isFetchingBarcode}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading || isFetchingBarcode}>
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
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
