// Homepage section registry shared by the storefront renderer, the admin homepage builder,
// and the server-side schema. Order here is the default order on a fresh database.

export const HOME_SECTIONS = [
  { id: "marquee", label: "Announcement ticker", title: "" },
  { id: "hero", label: "Hero slider", title: "" },
  { id: "categories", label: "Categories", title: "Categories" },
  { id: "flashSale", label: "Flash sale", title: "" },
  { id: "offersAfterFlash", label: "Offer banners (after flash sale)", title: "" },
  { id: "trending", label: "Trending now", title: "Trending Now" },
  { id: "clipToCart", label: "Clip to cart", title: "Clip to Cart" },
  { id: "offersAfterClip", label: "Offer banners (after clip to cart)", title: "" },
  { id: "brands", label: "Shop by brand", title: "Shop by Brand" },
  { id: "newArrivals", label: "New arrivals", title: "New Arrivals" },
  { id: "offersAfterNew", label: "Offer banners (after new arrivals)", title: "" },
  { id: "mostPopular", label: "Most popular", title: "Most Popular" },
  { id: "hotDeal", label: "Hot deal of the day", title: "Hot Deal of the Day" },
  { id: "featured", label: "Feature products", title: "Feature Products" },
  { id: "blog", label: "Latest blog & trust badges", title: "Latest Blog" },
] as const;

export type HomeSectionId = (typeof HOME_SECTIONS)[number]["id"];
export const HOME_SECTION_IDS = HOME_SECTIONS.map((s) => s.id) as [HomeSectionId, ...HomeSectionId[]];

export interface HomeSection {
  id: HomeSectionId;
  visible: boolean;
  /** Optional heading override; empty uses the default title. */
  title: string;
}

export const defaultHomeSections = (): HomeSection[] =>
  HOME_SECTIONS.map((s) => ({ id: s.id, visible: true, title: "" }));

/**
 * Normalises a stored section list: unknown ids are dropped and sections added to the
 * registry after the document was saved are appended (visible) so they are never lost.
 */
export function resolveHomeSections(stored: HomeSection[] | undefined): HomeSection[] {
  const known = new Set<string>(HOME_SECTION_IDS);
  const list = (stored ?? []).filter((s) => known.has(s.id));
  const seen = new Set(list.map((s) => s.id));
  return [...list, ...defaultHomeSections().filter((s) => !seen.has(s.id))];
}

export const sectionTitle = (section: HomeSection) =>
  section.title.trim() || HOME_SECTIONS.find((s) => s.id === section.id)?.title || "";
