// Domain types. The generated JSON in src/data/generated follows these shapes; a real API
// adapter in src/services should map its responses onto them too.

export interface ImageAsset {
  src: string;
  width: number | null;
  height: number | null;
}

export interface Product {
  carePlans?: { id: string; title: string; coverage: string; price: number }[];
  id: string;
  slug: string;
  code: string;
  name: string;
  /** marketing ribbon, e.g. "🔥 Hot Product" */
  badge: string;
  /** status pill, e.g. "Coming Soon", "Official", "Offer Running" */
  recognitionBadge: string;
  price: number;
  regularPrice: number;
  /** percent off; may carry decimals (listing pages show them, home cards round) */
  discount: number;
  inStock: boolean;
  isTba: boolean;
  endOfLife: boolean;
  allowPreOrder: boolean;
  isBestDeal: boolean;
  image: ImageAsset | null;
  images: ImageAsset[];
  brandSlug: string | null;
  brandName: string | null;
  categorySlugs: string[];
  subCategorySlugs: string[];
  /** true when the snapshot contained the full product page */
  hasDetail: boolean;
  /** category assigned by title/brand heuristics (snapshot lacked it) */
  categoryInferred?: boolean;
  /** dashboard: stock (and optional price) tracked per variant combination */
  trackVariants?: boolean;
  variantStock?: { key: string; stock: number; price: number | null; sku?: string }[];
  childCategorySlugs?: string[];
  freeShipping?: boolean;
}

export interface VariantGroup {
  name: string;
  options: { value: string; imageIndex: number; hex?: string }[];
}

export interface ProductDetail {
  slug: string;
  shortDescriptionHtml: string;
  descriptionHtml: string;
  minBookingPrice: number;
  purchasePoints: number;
  isFreeShipping: boolean;
  profitRatio: number;
  soldCount: number;
  totalReviews: number;
  reviewPoints: number;
  seo: { title: string; description: string; keywords: string };
  variants: VariantGroup[];
}

export interface SubCategory {
  id: string;
  slug: string;
  name: string;
  image: ImageAsset | null;
  /** third level, managed in the dashboard */
  children?: { id?: string; slug: string; name: string }[];
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  image: ImageAsset | null;
  tradeIn: boolean;
  subCategories: SubCategory[];
  brands: string[];
  /** dashboard-managed fields */
  active?: boolean;
  sortOrder?: number;
}

export interface ExploreCategory {
  slug: string;
  name: string;
  image: ImageAsset | null;
  brands: string[];
}

export interface Brand {
  id: string;
  slug: string;
  name: string;
  logo: ImageAsset | null;
  featured: boolean;
  active?: boolean;
}

export interface Banner {
  image: ImageAsset;
  href: string;
  newTab?: boolean;
  headline?: string;
  text?: string;
  eyebrow?: string;
}

export interface FilterAttribute {
  name: string;
  values: string[];
}

export interface PriceRange {
  min: number;
  max: number;
}

export interface ListingMeta {
  productSlugs: string[];
  /** CMS description shown under the product grid */
  descriptionHtml?: string;
  totalCount: number;
  totalPages: number;
  brandSlugs?: string[];
  attributes: FilterAttribute[];
  price: PriceRange | null;
}

export interface SubCategoryListing extends ListingMeta {
  categorySlug: string;
  subCategorySlug: string;
  title: string;
  banners: Banner[];
}

export interface BrandListing extends ListingMeta {
  categories: { slug: string; name: string; image: ImageAsset | null }[];
}

export interface ProductTab {
  label: string;
  productSlugs: string[];
}

export interface Showcase {
  slug: string;
  cols: number;
  productSlugs: string[];
  endsAt: string | null;
  totalCount?: number;
}

export interface Campaign {
  id: string;
  slug: string;
  name: string;
  description: string;
  image: ImageAsset | null;
  startsAt: string;
  endsAt: string;
  active: boolean;
}

export interface CampaignDetail {
  slug: string;
  name: string;
  description: string;
  image: ImageAsset | null;
  endsAt: string | null;
  productSlugs: string[];
}

export interface Store {
  id: string;
  slug: string;
  name: string;
  detailName?: string;
  address: string;
  lat: number | null;
  lng: number | null;
  dayOff: string;
  openHours: string;
  phone: string;
  email: string;
  storePickup?: boolean;
  abroad?: boolean;
  image: ImageAsset | null;
  descriptionHtml: string;
  gallery: ImageAsset[];
}

export interface StoreDistrict {
  label: string;
  districtId: string | null;
  storeSlugs: string[];
}

export interface BlogPost {
  slug: string;
  title: string;
  category: string;
  date: string;
  excerpt: string;
  image: ImageAsset | null;
  contentHtml?: string;
  seoTitle?: string;
}

export interface MarqueeItem {
  label: string;
  href: string;
}

export interface SiteSettings {
  name: string;
  phone: string;
  email: string;
  address: string;
  branchesText: string;
  copyright: string;
  social: { facebook?: string; instagram?: string; linkedin?: string; youtube?: string; tiktok?: string; twitter?: string; messenger?: string; whatsapp?: string };
  marquee: { home: MarqueeItem[]; product: MarqueeItem[] };
  assets: {
    logo: ImageAsset;
    headerBg: ImageAsset;
    footerShadow: ImageAsset;
    noImage: ImageAsset;
    productPlaceholder: ImageAsset;
    deliveryIcon: ImageAsset;
    pointsIcon: ImageAsset;
    bookingIcon: ImageAsset;
    about: ImageAsset[];
  };
}

export interface HomeContent {
  marquee: MarqueeItem[];
  heroSlides: Banner[];
  categorySlugs: string[];
  flashSale: { title: string; endsAt: string | null; href: string; tabs: ProductTab[] };
  offerBanners: {
    afterFlashSale: Banner[];
    afterClipToCart: Banner[];
    afterNewArrivals: Banner[];
    mostPopular: Banner[];
    afterFeatured: Banner[];
  };
  shopByBrandSlugs: string[];
  newArrivals: { tabs: ProductTab[] };
  mostPopularSlugs: string[];
  hotDealSlugs: string[];
  featuredSlugs: string[];
  latestBlogs: string[];
  seoCards: { title: string; html: string }[];
}

export type SortKey = "" | "price-asc" | "price-desc" | "newest" | "discount";

export interface ProductQuery {
  category?: string;
  subCategory?: string;
  brand?: string;
  brands?: string[];
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  stock?: ("in" | "out")[];
  attributes?: Record<string, string[]>;
  sort?: SortKey;
  page?: number;
  pageSize?: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
