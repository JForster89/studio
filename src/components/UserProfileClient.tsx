
"use client";

import Link from 'next/link';
import { COMMON_ALLERGENS_PROFILE } from '@/lib/constants';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

export function UserProfileClient() {
  const { userAllergens, addUserAllergen, removeUserAllergen, isProfileLoaded } = useUserProfile();

  if (!isProfileLoaded) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-center">Your Allergen Profile</CardTitle>
          <CardDescription className="text-center">Loading your preferences...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(COMMON_ALLERGENS_PROFILE.length || 5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between space-x-4 p-3 rounded-lg border">
              <div className="flex items-center space-x-3">
                <Skeleton className="h-6 w-6 rounded-md" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-6 w-10" />
            </div>
          ))}
        </CardContent>
        <CardFooter className="flex justify-center pt-4">
          <Skeleton className="h-10 w-32" />
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold text-center">Your Allergen Profile</CardTitle>
        <CardDescription className="text-center">Select the items you are allergic to. This will help us warn you about potential risks.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {COMMON_ALLERGENS_PROFILE.map((allergen) => (
          <div
            key={allergen.id}
            className="flex items-center justify-between space-x-4 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <allergen.Icon className="h-6 w-6 text-primary" />
              <Label htmlFor={allergen.id} className="text-base cursor-pointer">
                {allergen.name}
              </Label>
            </div>
            <Switch
              id={allergen.id}
              checked={userAllergens.includes(allergen.id)}
              onCheckedChange={(checked) => {
                if (checked) {
                  addUserAllergen(allergen.id);
                } else {
                  removeUserAllergen(allergen.id);
                }
              }}
              aria-label={`Toggle allergy to ${allergen.name}`}
            />
          </div>
        ))}
      </CardContent>
      <CardFooter className="flex justify-center pt-6">
        <Button asChild size="lg">
          <Link href="/">
            <Home className="mr-2 h-5 w-5" />
            Done & Go to App
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

