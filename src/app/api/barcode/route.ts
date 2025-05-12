
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
    // API endpoint for Open Food Facts
    const apiUrl = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;
    
    const response = await fetch(apiUrl, {
        headers: {
            // Open Food Facts API is open, but good practice to set a User-Agent
            'User-Agent': 'AllergenAlertApp/1.0 (contact@example.com) - Next.js app using OpenFoodFacts API',
        }
    });

    if (!response.ok) {
      // Handle non-2xx responses from Open Food Facts
      console.error(`Open Food Facts API error for barcode ${barcode}: ${response.status} ${response.statusText}`);
      return NextResponse.json({ error: `Failed to fetch product data from Open Food Facts. Status: ${response.status}` }, { status: response.status });
    }

    const data: OpenFoodFactsProduct = await response.json();

    if (data.status === 0 || !data.product) {
      return NextResponse.json({ error: `Product with barcode ${barcode} not found in Open Food Facts. ${data.status_verbose || 'Please enter details manually.'}` }, { status: 404 });
    }

    const product = data.product;

    // Prefer English names if available, otherwise use the default
    const productName = product.product_name_en || product.product_name || 'N/A';
    const ingredients = product.ingredients_text_en || product.ingredients_text || '';
    const productDescription = product.generic_name_en || product.generic_name || undefined;

    if (ingredients === '' && productName !== 'N/A') {
        // If ingredients are empty but product name is found, it might be a partial entry
        return NextResponse.json({
            productName,
            ingredients: '', // Keep it empty for the form
            productDescription,
            warning: 'Product found, but ingredients list is missing from the database. Please enter ingredients manually.',
        });
    }


    return NextResponse.json({
      productName,
      ingredients,
      productDescription,
    });

  } catch (error) {
    console.error(`Error fetching product data for barcode ${barcode}:`, error);
    let errorMessage = 'An unexpected error occurred while fetching product data.';
    if (error instanceof Error) {
        errorMessage = `Error: ${error.message}. Please try again or enter details manually.`;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
