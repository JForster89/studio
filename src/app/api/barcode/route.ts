import { NextResponse, type NextRequest } from 'next/server';

interface OpenFoodFactsProduct {
  status: number;
  code: string;
  product?: {
    product_name?: string;
    product_name_en?: string;
    generic_name?: string;
    generic_name_en?: string;
    ingredients_text?: string;
    ingredients_text_en?: string;
    image_url?: string;
    image_front_url?: string;
    image_small_url?: string;
    // Add other fields you might need
  };
  status_verbose?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const barcode = searchParams.get('barcode');

  if (!barcode) {
    return NextResponse.json({ error: 'Barcode query parameter is required' }, { status: 400 });
  }

  try {
    const apiUrl = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;
    
    const response = await fetch(apiUrl, {
        headers: {
            'User-Agent': 'AllergenAlertApp/1.0 (contact@example.com) - Next.js app using OpenFoodFacts API',
        }
    });

    if (!response.ok) {
      console.error(`Open Food Facts API error for barcode ${barcode}: ${response.status} ${response.statusText}`);
      // Try to parse error from Open Food Facts if available, otherwise generic message
      let errorBody;
      try {
        errorBody = await response.json();
      } catch (e) {
        // ignore if error body is not json
      }
      const errorMessage = errorBody?.status_verbose || `Failed to fetch product data from Open Food Facts. Status: ${response.status}`;
      return NextResponse.json({ error: errorMessage }, { status: response.status });
    }

    const data: OpenFoodFactsProduct = await response.json();

    if (data.status === 0 || !data.product) {
      return NextResponse.json({ error: data.status_verbose || `Product with barcode ${barcode} not found.` }, { status: 404 });
    }

    const product = data.product;

    const productName = product.product_name_en || product.product_name || 'Unknown Product'; // Provide a default
    const ingredients = product.ingredients_text_en || product.ingredients_text || ''; // Default to empty if not found
    const productDescription = product.generic_name_en || product.generic_name || undefined;
    const imageUrl = product.image_url || product.image_front_url || product.image_small_url || undefined;

    // Even if ingredients are empty, return other found data. The frontend will handle it.
    return NextResponse.json({
      productName,
      ingredients,
      productDescription,
      imageUrl,
    });

  } catch (error) {
    console.error(`Error fetching product data for barcode ${barcode}:`, error);
    let errorMessage = 'An unexpected error occurred while fetching product data.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
