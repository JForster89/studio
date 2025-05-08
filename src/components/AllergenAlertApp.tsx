"use client";

import { useState } from 'react';
import type { AnalyzeProductAllergensInput, AnalyzeProductAllergensOutput } from '@/ai/flows/analyze-product-allergens';
import { analyzeProductAllergens } from '@/ai/flows/analyze-product-allergens';
import { AllergenForm, type AllergenFormData } from '@/components/AllergenForm';
import { AllergenReport } from '@/components/AllergenReport';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export function AllergenAlertApp() {
  const [analysisResult, setAnalysisResult] = useState<AnalyzeProductAllergensOutput | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { getSerializedProfile, userAllergens, isProfileLoaded } = useUserProfile();
  const { toast } = useToast();

  const handleSubmit = async (data: AllergenFormData) => {
    if (!isProfileLoaded) {
        toast({
            title: "Profile Loading",
            description: "Please wait for your allergen profile to load before submitting.",
            variant: "destructive",
        });
        return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    const allergensProfile = getSerializedProfile();
    if (allergensProfile.trim() === "") {
        toast({
            title: "Profile Incomplete",
            description: "Please set up your allergen profile first to get personalized results.",
            variant: "destructive",
        });
        // Proceed with analysis but without personalization. Or could block.
        // For now, we'll allow it, AI might still detect common allergens.
    }

    const input: AnalyzeProductAllergensInput = {
      productName: data.productName,
      ingredients: data.ingredients,
      allergensProfile: allergensProfile, // Pass user's allergen profile
      barcode: data.barcode,
      productDescription: data.productDescription,
    };

    try {
      const result = await analyzeProductAllergens(input);
      setAnalysisResult(result);
      toast({
        title: "Analysis Complete",
        description: "Allergen report is ready.",
      });
    } catch (err) {
      console.error("Allergen analysis failed:", err);
      let errorMessage = "An unexpected error occurred during analysis.";
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      toast({
        title: "Analysis Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <AllergenForm onSubmit={handleSubmit} isLoading={isLoading} />
      {error && (
        <Alert variant="destructive" className="max-w-lg mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {analysisResult && <AllergenReport report={analysisResult} userProfileAllergenIds={userAllergens} />}
    </div>
  );
}
