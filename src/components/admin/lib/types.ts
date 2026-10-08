import type { Banner, ImageAsset, MarqueeItem, Product, ProductTab, VariantGroup } from "@/types";
import type { HomeSection } from "@/lib/home-sections";

export interface AdminProduct extends Product {
  _id: string;
  stock: number;
  active: boolean;
  costPrice?: number;
  description?: string;
  shortDescription?: string;
  variants?: VariantGroup[];
  specs?: { label: string; value: string }[];
  seo?: { title: string; description: string; keywords: string };
  barcode?: string;
  lowStockThreshold?: number | null;
  freeShipping?: boolean;
  trackVariants?: boolean;
  variantStock?: VariantRow[];
  childCategorySlugs?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface VariantRow {
  key: string;
  stock: number;
  price: number | null;
  cost?: number | null;
  sku?: string;
  barcode?: string;
}

export interface Payment {
  amount: number;
  method: string;
  reference: string;
  at: string;
  gateway?: string;
}

export interface Order {
  _id: string;
  orderNo: string;
  delivery?: string;
  note?: string;
  coupon?: string;
  shipment?: { courier: string; trackingNumber: string; trackingUrl: string; note: string; consignmentId?: string; status?: string; syncedAt?: string };
  channel?: "web" | "landing" | "pos" | "admin";
  payments?: Payment[];
  paidAmount?: number;
  dueAmount?: number;
  advanceRequired?: number;
  assignedTo?: { id: string; name: string };
  zone?: string | null;
  ip?: string;
  landingPage?: string;
  refund?: { amount: number; reference: string; at: string };
  customer: { name: string; email: string; phone: string; address: string; city: string };
  items: { slug: string; name: string; qty: number; unitPrice: number; price?: number; variant: string; sku?: string; image?: ImageAsset | null; cost?: number | null }[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
  updatedAt?: string;
  timeline: { status: string; at: string }[];
}

export interface Customer {
  _id: string;
  name: string;
  email: string;
  phone: string;
  active: boolean;
  createdAt: string;
  notes?: string;
  tags?: string[];
}

export interface Coupon {
  _id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  minOrder: number;
  expiresAt: string;
  active: boolean;
  usageLimit?: number;
  usedCount?: number;
  freeShipping?: boolean;
  createdAt?: string;
}

export interface Message {
  _id: string;
  kind: string;
  data: Record<string, string>;
  status: string;
  createdAt: string;
}

export interface Subscriber {
  _id: string;
  email: string;
  active: boolean;
  createdAt: string;
}

export interface Audit {
  _id: string;
  action: string;
  detail: string;
  actorId: string;
  entityId: string;
  createdAt: string;
}

export interface Settings {
  name: string;
  email: string;
  phone: string;
  address: string;
  shippingFee: number;
  outsideDhakaFee?: number;
  pickupEnabled?: boolean;
  freeShippingAbove: number;
  lowStockThreshold: number;
  currency: "BDT";
  social?: Record<string, string>;
  shippingZones?: { id: string; name: string; fee: number }[];
  partialPayment?: { enabled: boolean; type: "shipping" | "fixed" | "percent"; value: number };
  tracking?: { pixelId: string; gtmId: string };
  stockAlert?: { smsEnabled: boolean; phone: string };
}

export interface SubCategoryRow {
  id?: string;
  name: string;
  slug: string;
  image: ImageAsset | null;
  children?: { id?: string; name: string; slug: string }[];
}

export interface CategoryRow {
  _id: string;
  id: string;
  name: string;
  slug: string;
  image: ImageAsset | null;
  tradeIn: boolean;
  active: boolean;
  brands: string[];
  subCategories: SubCategoryRow[];
  sortOrder: number;
  productCount: number;
  activeCount: number;
  inStockCount: number;
}

export interface BrandRow {
  _id: string;
  name: string;
  slug: string;
  logo: ImageAsset | null;
  featured: boolean;
  active: boolean;
  productCount: number;
  activeCount: number;
  inStockCount: number;
}

export interface Taxonomy {
  categories: { _id: string; slug: string; name: string; image: ImageAsset | null; active?: boolean; subCategories: { slug: string; name: string; children?: { slug: string; name: string }[] }[] }[];
  brands: { _id: string; slug: string; name: string; logo: ImageAsset | null; active?: boolean }[];
}

export interface MediaItem {
  _id: string;
  src: string;
  mime: string;
  name?: string;
  size?: number;
  width?: number | null;
  height?: number | null;
  createdAt: string;
}

export interface HomeDoc {
  sections: HomeSection[];
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
  updatedAt: string | null;
}

export interface Badges {
  pendingOrders: number;
  newMessages: number;
  openTickets: number;
  pendingReviews: number;
  lowStock: number;
  outOfStock: number;
  archived: number;
  activeProducts: number;
  incompleteOrders: number;
}

export interface Overview {
  days: number;
  revenue: number;
  orders: number;
  customers: number;
  products: number;
  newCustomers: number;
  averageOrderValue: number;
  previous: { revenue: number; orders: number; newCustomers: number; averageOrderValue: number };
  pendingOrders: number;
  lowStock: { _id: string; name: string; code: string; slug: string; stock: number; image: ImageAsset | null }[];
  recentOrders: Order[];
  series: { _id: string; revenue: number; orders: number }[];
  orderSeries: { _id: string; orders: number; value: number }[];
  statuses: { _id: string; count: number }[];
  topProducts: { _id: string; name: string; qty: number; revenue: number; image?: ImageAsset | null }[];
  categoryRevenue: { _id: string; name: string; revenue: number; qty: number }[];
  recentActivity: Audit[];
  health: {
    total: number;
    archived: number;
    outOfStock: number;
    lowStock: number;
    noImage: number;
    noCategory: number;
    noPrice: number;
    units: number;
    stockValue: number;
    stockCost: number;
  } | null;
  inbox: { messages: number; tickets: number; reviews: number };
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
  counts?: Record<string, number>;
}
