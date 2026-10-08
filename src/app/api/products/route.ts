import { getProductsBySlugs } from "@/services/products";

// GET /api/products?slugs=a,b,c — product summaries for client widgets (compare page).
export async function GET(request: Request) {
  const slugs = (new URL(request.url).searchParams.get("slugs") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);
  return Response.json({ products: await getProductsBySlugs(slugs) });
}
