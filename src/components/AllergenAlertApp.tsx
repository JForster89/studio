"use client";

import { AllergenForm } from '@/components/AllergenForm';
// Removed imports for AnalyzeProductAllergensOutput, analyzeProductAllergens, AllergenReport, useUserProfile, useToast, Alert related items
// as these are handled on the new product page or not needed here anymore.

export function AllergenAlertApp() {
  // States for analysisResult, isLoading, error, and userProfile hooks are removed.
  // The AllergenForm will handle its own UI loading states (e.g. for camera)
  // and navigation.

  // The handleSubmit logic is now simplified or removed as AllergenForm handles navigation.
  // If AllergenForm needed to pass data up for navigation, this is where it would go.
  // But since useRouter is used within AllergenForm, this component becomes very simple.

  return (
    <div className="space-y-8">
      <AllergenForm />
      {/* Error display and AllergenReport are removed as they will be on the product detail page */}
    </div>
  );
}
