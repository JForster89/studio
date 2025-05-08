
import { NextResponse, type NextRequest } from 'next/server';

// Mock database - in a real application, this would query an external API or database.
const MOCK_PRODUCT_DATABASE: Record<string, { productName: string; ingredients: string; productDescription?: string }> = {
  '1234567890123': {
    productName: 'Crunchy Peanut Butter (from Barcode)',
    ingredients: 'Roasted Peanuts, Sugar, Palm Oil, Salt. (from Barcode)',
    productDescription: 'A delicious spread for your toast! (from Barcode)',
  },
  '9876543210987': {
    productName: 'Whole Wheat Bread (from Barcode)',
    ingredients: 'Whole wheat flour, Water, Yeast, Salt, Sugar. (from Barcode)',
  },
  '1112223334445': {
    productName: 'Soy Milk (from Barcode)',
    ingredients: 'Water, Organic Soybeans, Cane Sugar, Calcium Carbonate, Sea Salt, Vitamin A Palmitate, Vitamin D2, Riboflavin (B2), Vitamin B12. (from Barcode)',
    productDescription: 'A plant-based milk alternative, great for cereals or coffee. (from Barcode)',
  },
   '049000050103': {
    productName: 'Coca-Cola Classic (from Barcode)',
    ingredients: 'Carbonated Water, High Fructose Corn Syrup, Caramel Color, Phosphoric Acid, Natural Flavors, Caffeine. (from Barcode)',
    productDescription: 'The classic refreshing Coca-Cola taste. (from Barcode)',
  }
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const barcode = searchParams.get('barcode');

  if (!barcode) {
    return NextResponse.json({ error: 'Barcode query parameter is required' }, { status: 400 });
  }

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 750));

  const productInfo = MOCK_PRODUCT_DATABASE[barcode];

  if (productInfo) {
    return NextResponse.json(productInfo);
  } else {
    return NextResponse.json({ error: `Product with barcode ${barcode} not found. Please enter details manually.` }, { status: 404 });
  }
}
