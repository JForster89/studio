"use client";

import type { AnalyzeProductAllergensOutput } from '@/ai/flows/analyze-product-allergens';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, List, MessageSquareText } from 'lucide-react';
import { getAllergenIcon, COMMON_ALLERGENS_PROFILE } from '@/lib/constants';
import type { AllergenInfo } from '@/lib/constants';

interface AllergenReportProps {
  report: AnalyzeProductAllergensOutput | null;
  userProfileAllergenIds: string[];
}

export function AllergenReport({ report, userProfileAllergenIds }: AllergenReportProps) {
  if (!report) {
    return null;
  }

  const isUserAllergicToDetected = (allergenName: string): boolean => {
    const lowerAllergenName = allergenName.toLowerCase();
    // Match against user profile (which uses IDs like 'peanuts', 'milk')
    // and COMMON_ALLERGENS_PROFILE to map names to IDs.
    return COMMON_ALLERGENS_PROFILE.some(profileAllergen => 
      userProfileAllergenIds.includes(profileAllergen.id) && 
      lowerAllergenName.includes(profileAllergen.name.split(' ')[0].toLowerCase()) // Basic name matching
    );
  };
  
  return (
    <Card className="w-full max-w-lg mx-auto mt-8 shadow-xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          {report.safeToConsume ? (
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          ) : (
            <AlertCircle className="h-8 w-8 text-accent" />
          )}
          <CardTitle className="text-2xl">Allergen Analysis Report</CardTitle>
        </div>
        <CardDescription className={`text-lg font-semibold ${report.safeToConsume ? 'text-green-600' : 'text-accent'}`}>
          {report.safeToConsume
            ? "This product appears safe for you based on your profile."
            : "Warning! This product may contain allergens you are sensitive to."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><List size={20} />Detected Allergens:</h3>
          {report.allergensList && report.allergensList.length > 0 ? (
            <ul className="space-y-2">
              {report.allergensList.map((allergen, index) => {
                const Icon = getAllergenIcon(allergen);
                const isUserAllergic = isUserAllergicToDetected(allergen);
                return (
                  <li key={index} className="flex items-center gap-2 p-2 rounded-md border bg-muted/20">
                    <Icon className={`h-5 w-5 ${isUserAllergic ? 'text-accent' : 'text-primary'}`} />
                    <span className={`font-medium ${isUserAllergic ? 'text-accent font-bold' : ''}`}>
                      {allergen}
                    </span>
                    {isUserAllergic && <Badge variant="destructive">Profile Match</Badge>}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-muted-foreground">No specific allergens detected based on the provided information, or the product is considered allergen-free by the analysis relative to your profile.</p>
          )}
        </div>
        
        {report.reasoning && (
          <div>
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><MessageSquareText size={20}/>AI Reasoning:</h3>
            <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md whitespace-pre-wrap">{report.reasoning}</p>
          </div>
        )}

        {!report.containsAllergens && report.allergensList.length === 0 && (
             <p className="text-sm text-green-600 font-medium p-3 border border-green-200 bg-green-50 rounded-md">
                The analysis did not find any of the common allergens from your profile in this product.
             </p>
        )}

      </CardContent>
    </Card>
  );
}
