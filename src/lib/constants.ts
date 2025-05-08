import type { LucideIcon } from 'lucide-react';
import { Bean, Egg, Fish, Milk, Nut, Shell, Wheat, HelpCircle } from 'lucide-react';

export interface AllergenInfo {
  id: string;
  name: string;
  Icon: LucideIcon;
}

export const COMMON_ALLERGENS_PROFILE: AllergenInfo[] = [
  { id: 'peanuts', name: 'Peanuts', Icon: Nut },
  { id: 'treeNuts', name: 'Tree Nuts', Icon: Nut },
  { id: 'milk', name: 'Milk (Dairy)', Icon: Milk },
  { id: 'eggs', name: 'Eggs', Icon: Egg },
  { id: 'soy', name: 'Soy', Icon: Bean },
  { id: 'wheat', name: 'Wheat (Gluten)', Icon: Wheat },
  { id: 'fish', name: 'Fish', Icon: Fish },
  { id: 'shellfish', name: 'Shellfish', Icon: Shell },
];

export const allergenIcons: Record<string, LucideIcon> = {
  'peanuts': Nut,
  'peanut': Nut,
  'tree nuts': Nut,
  'nuts': Nut,
  'almond': Nut,
  'walnut': Nut,
  'cashew': Nut,
  'pecan': Nut,
  'pistachio': Nut,
  'hazelnut': Nut,
  'macadamia': Nut,
  'milk': Milk,
  'dairy': Milk,
  'lactose': Milk,
  'cheese': Milk,
  'yogurt': Milk,
  'butter': Milk,
  'eggs': Egg,
  'egg': Egg,
  'soy': Bean,
  'soybean': Bean,
  'tofu': Bean,
  'edamame': Bean,
  'wheat': Wheat,
  'gluten': Wheat,
  'barley': Wheat,
  'rye': Wheat,
  'fish': Fish,
  'salmon': Fish,
  'tuna': Fish,
  'cod': Fish,
  'shellfish': Shell,
  'shrimp': Shell,
  'crab': Shell,
  'lobster': Shell,
  'molluscs': Shell,
  'default': HelpCircle,
};

export const getAllergenIcon = (allergenName: string): LucideIcon => {
  const lowerAllergenName = allergenName.toLowerCase();
  for (const key in allergenIcons) {
    if (lowerAllergenName.includes(key)) {
      return allergenIcons[key];
    }
  }
  return allergenIcons['default'];
};
