import { useState, useEffect, useCallback } from 'react';

const USER_PROFILE_STORAGE_KEY = 'allergenAlertUserProfile';

export interface UserProfileHook {
  userAllergens: string[];
  addUserAllergen: (allergenId: string) => void;
  removeUserAllergen: (allergenId: string) => void;
  isUserAllergicTo: (allergenId: string) => boolean;
  getSerializedProfile: () => string;
  isProfileLoaded: boolean;
}

export function useUserProfile(): UserProfileHook {
  const [userAllergens, setUserAllergens] = useState<string[]>([]);
  const [isProfileLoaded, setIsProfileLoaded] = useState<boolean>(false);

  useEffect(() => {
    try {
      const storedProfile = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
      if (storedProfile) {
        setUserAllergens(JSON.parse(storedProfile));
      }
    } catch (error) {
      console.error("Failed to load user profile from localStorage:", error);
    }
    setIsProfileLoaded(true);
  }, []);

  const saveProfile = useCallback((allergens: string[]) => {
    try {
      localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(allergens));
    } catch (error) {
      console.error("Failed to save user profile to localStorage:", error);
    }
  }, []);

  const addUserAllergen = useCallback((allergenId: string) => {
    setUserAllergens(prev => {
      if (!prev.includes(allergenId)) {
        const newAllergens = [...prev, allergenId];
        saveProfile(newAllergens);
        return newAllergens;
      }
      return prev;
    });
  }, [saveProfile]);

  const removeUserAllergen = useCallback((allergenId: string) => {
    setUserAllergens(prev => {
      const newAllergens = prev.filter(item => item !== allergenId);
      saveProfile(newAllergens);
      return newAllergens;
    });
  }, [saveProfile]);

  const isUserAllergicTo = useCallback((allergenId: string): boolean => {
    return userAllergens.includes(allergenId);
  }, [userAllergens]);

  const getSerializedProfile = useCallback((): string => {
    return userAllergens.join(', ');
  }, [userAllergens]);

  return { 
    userAllergens, 
    addUserAllergen, 
    removeUserAllergen, 
    isUserAllergicTo, 
    getSerializedProfile,
    isProfileLoaded 
  };
}
