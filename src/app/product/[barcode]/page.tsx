"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import type { AnalyzeProductAllergensInput, AnalyzeProductAllergensOutput } from '@/ai/flows/analyze-product-allergens';
import { analyzeProductAllergens } from '@/ai/flows/analyze-product-allergens';
import { AllergenReport } from '@/components/AllergenReport';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ShoppingBag, ListChecks, Info, Loader2 } from "lucide-react";
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface ProductInfo {
  productName: string;
  ingredients: string;
  productDescription?: string;
  imageUrl?: string;
  barcode: string;
}

export default function ProductDetailPage() {
  const params = useParams();
  const barcode = typeof params.barcode === 'string' ? params.barcode : '';
  
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeProductAllergensOutput | null>(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState<boolean>(true);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState<boolean>(false);
  const [errorProduct, setErrorProduct] = useState<string | null>(null);
  const [errorAnalysis, setErrorAnalysis] = useState<string | null>(null);

  const { getSerializedProfile, userAllergens, isProfileLoaded } = useUserProfile();
  const { toast } = useToast();

  useEffect(() => {
    if (!barcode) {
      setErrorProduct("No barcode provided.");
      setIsLoadingProduct(false);
      return;
    }

    const fetchProductData = async () => {
      setIsLoadingProduct(true);
      setErrorProduct(null);
      try {
        const response = await fetch(`/api/barcode?barcode=${barcode}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to fetch product data. Status: ${response.status}`);
        }
        const data = await response.json();
        setProductInfo({ ...data, barcode });
      } catch (err) {
        console.error("Error fetching product data:", err);
        setErrorProduct(err instanceof Error ? err.message : "An unknown error occurred while fetching product details.");
      } finally {
        setIsLoadingProduct(false);
      }
    };

    fetchProductData();
  }, [barcode]);

  useEffect(() => {
    if (productInfo && isProfileLoaded) {
      if (!productInfo.productName || !productInfo.ingredients) {
        setErrorAnalysis("Product name or ingredients are missing. Cannot perform allergen analysis.");
        if (productInfo.productName && !productInfo.ingredients) {
             toast({
                title: "Missing Ingredients",
                description: "The ingredients for this product could not be found in the database. Allergen analysis cannot be performed.",
                variant: "destructive",
             });
        }
        return;
      }

      const allergensProfile = getSerializedProfile();
      if (allergensProfile.trim() === "" && userAllergens.length === 0) { // Check if profile is truly empty
        toast({
            title: "Allergen Profile Not Set",
            description: "Your allergen profile is empty. Analysis will check for common allergens but may not be personalized. Please set your profile for better results.",
            variant: "default",
        });
      }

      const input: AnalyzeProductAllergensInput = {
        productName: productInfo.productName,
        ingredients: productInfo.ingredients,
        allergensProfile: allergensProfile,
        barcode: productInfo.barcode,
        productDescription: productInfo.productDescription,
      };

      const runAnalysis = async () => {
        setIsLoadingAnalysis(true);
        setErrorAnalysis(null);
        setAnalysisResult(null);
        try {
          const result = await analyzeProductAllergens(input);
          setAnalysisResult(result);
          toast({
            title: "Analysis Complete",
            description: "Allergen report is ready.",
          });
        } catch (err) {
          console.error("Allergen analysis failed:", err);
          const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred during analysis.";
          setErrorAnalysis(errorMessage);
          toast({
            title: "Analysis Failed",
            description: errorMessage,
            variant: "destructive",
          });
        } finally {
          setIsLoadingAnalysis(false);
        }
      };
      runAnalysis();
    }
  }, [productInfo, isProfileLoaded, getSerializedProfile, toast, userAllergens]);

  if (isLoadingProduct) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading product information for barcode: {barcode}...</p>
        <div className="w-full max-w-lg mt-8 space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (errorProduct) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Fetching Product</AlertTitle>
          <AlertDescription>{errorProduct}</AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="mt-6">
            <Link href="/">Try another scan/search</Link>
        </Button>
      </div>
    );
  }

  if (!productInfo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center">
        <Alert variant="default" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Product Not Found</AlertTitle>
          <AlertDescription>No product information could be loaded for barcode: {barcode}.</AlertDescription>
        </Alert>
         <Button asChild variant="outline" className="mt-6">
            <Link href="/">Try another scan/search</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="w-full max-w-2xl mx-auto shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <ShoppingBag size={32} className="text-primary" />
            <CardTitle className="text-3xl">{productInfo.productName || "Product Details"}</CardTitle>
          </div>
          {productInfo.barcode && <CardDescription>Barcode: {productInfo.barcode}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-6">
          {productInfo.imageUrl ? (
            <div className="relative w-full h-64 md:h-80 rounded-md overflow-hidden border bg-muted">
              <Image 
                src={productInfo.imageUrl} 
                alt={productInfo.productName || "Product Image"} 
                layout="fill" 
                objectFit="contain" 
                data-ai-hint="product image"
              />
            </div>
          ) : (
            <div className="w-full h-48 bg-muted rounded-md flex items-center justify-center border" data-ai-hint="food product">
                <ShoppingBag size={48} className="text-muted-foreground" />
            </div>
          )}

          {productInfo.productDescription && (
            <div>
              <h3 className="text-lg font-semibold mb-1 flex items-center gap-2"><Info size={20} />Description:</h3>
              <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">{productInfo.productDescription}</p>
            </div>
          )}
          
          <div>
            <h3 className="text-lg font-semibold mb-1 flex items-center gap-2"><ListChecks size={20} />Ingredients:</h3>
            {productInfo.ingredients ? (
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md whitespace-pre-wrap">{productInfo.ingredients}</p>
            ): (
                <p className="text-sm text-destructive-foreground bg-destructive/80 p-3 rounded-md">Ingredients list not available for this product.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoadingAnalysis && (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
          <p className="text-muted-foreground">Analyzing for allergens...</p>
        </div>
      )}

      {errorAnalysis && (
        <Alert variant="destructive" className="max-w-2xl mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Allergen Analysis Error</AlertTitle>
          <AlertDescription>{errorAnalysis}</AlertDescription>
        </Alert>
      )}

      {!isLoadingAnalysis && analysisResult && (
        <AllergenReport report={analysisResult} userProfileAllergenIds={userAllergens} />
      )}
       {!isLoadingAnalysis && !analysisResult && !errorAnalysis && productInfo && (!productInfo.ingredients || !productInfo.productName) && (
         <Alert variant="default" className="max-w-2xl mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Analysis Not Performed</AlertTitle>
          <AlertDescription>Allergen analysis could not be performed because essential product information (like ingredients) is missing.</AlertDescription>
        </Alert>
       )}

        <div className="text-center mt-8">
             <Button asChild variant="outline">
                <Link href="/">Scan/Search Another Product</Link>
            </Button>
        </div>
    </div>
  );
}
