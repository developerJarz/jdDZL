import { searchCatalog, getTrendingSearches } from "@/services/search";

// Suggestion endpoint for the header search box. Mirrors the reference API
// (`/product/search?keyword=` and `/trending/search`) against the mock catalogue.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const toSuggestion = (p: Awaited<ReturnType<typeof getTrendingSearches>>[number]) => ({
    slug: p.slug,
    name: p.name,
    image: p.image,
    price: p.price,
    regularPrice: p.regularPrice,
    isTba: p.isTba,
  });

  if (url.searchParams.get("trending")) {
    const products = await getTrendingSearches();
    return Response.json({ total: products.length, products: products.map(toSuggestion), categories: [], brands: [] });
  }

  const result = await searchCatalog(url.searchParams.get("q") ?? "", 20);
  return Response.json({
    total: result.total,
    products: result.products.map(toSuggestion),
    categories: result.categories,
    brands: result.brands.map((b) => ({ slug: b.slug, name: b.name, logo: b.logo })),
  });
}
