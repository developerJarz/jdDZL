// Staff permissions shared by the API guard and the dashboard navigation.
// Owners/administrators (role "admin") always have every permission.

export const PERMISSIONS = [
  { key: "overview", label: "Dashboard overview" },
  { key: "orders", label: "Orders, incomplete orders, couriers" },
  { key: "pos", label: "Point of sale" },
  { key: "customers", label: "Customers" },
  { key: "coupons", label: "Coupons" },
  { key: "products", label: "Products, categories, brands, attributes" },
  { key: "inventory", label: "Inventory and stock movements" },
  { key: "purchases", label: "Suppliers and purchases" },
  { key: "expenses", label: "Expenses" },
  { key: "reports", label: "Reports" },
  { key: "storefront", label: "Homepage, landing pages, pages, blog, media" },
  { key: "marketing", label: "SMS panel and tracking" },
  { key: "engagement", label: "Inbox, support, reviews, subscribers" },
  { key: "settings", label: "Store settings and integrations" },
  { key: "staff", label: "Staff accounts and activity log" },
] as const;

export type Permission = (typeof PERMISSIONS)[number]["key"];
export const ALL_PERMISSIONS = PERMISSIONS.map((p) => p.key) as Permission[];

export const ROLE_PRESETS: { key: string; label: string; permissions: Permission[] }[] = [
  {
    key: "manager",
    label: "Store manager",
    permissions: ALL_PERMISSIONS.filter((p) => p !== "staff" && p !== "settings"),
  },
  { key: "orders", label: "Order manager", permissions: ["overview", "orders", "pos", "customers", "coupons"] },
  { key: "sales", label: "Sales / POS cashier", permissions: ["pos", "orders", "customers"] },
  { key: "inventory", label: "Inventory manager", permissions: ["products", "inventory", "purchases"] },
  { key: "content", label: "Content & marketing", permissions: ["storefront", "marketing", "engagement", "products"] },
  { key: "accounts", label: "Accountant", permissions: ["reports", "expenses", "purchases", "overview"] },
];

export interface StaffUser {
  role: string;
  permissions?: string[];
}

export const isStaffRole = (role?: string) => role === "admin" || role === "staff";

export function can(user: StaffUser | null | undefined, permission: Permission) {
  if (!user) return false;
  if (user.role === "admin") return true;
  return user.role === "staff" && (user.permissions ?? []).includes(permission);
}

/** Any of the listed permissions grants access. */
export const canAny = (user: StaffUser | null | undefined, list: Permission[]) => list.some((p) => can(user, p));

/** Dashboard section → permissions that unlock it. */
export const SECTION_PERMISSIONS: Record<string, Permission[]> = {
  workspace: [],
  profile: [],
  overview: ["overview"],
  reports: ["reports"],
  orders: ["orders"],
  incomplete: ["orders"],
  pos: ["pos"],
  customers: ["customers"],
  coupons: ["coupons"],
  products: ["products"],
  categories: ["products"],
  brands: ["products"],
  attributes: ["products"],
  inventory: ["inventory"],
  "stock-ledger": ["inventory"],
  media: ["storefront", "products"],
  suppliers: ["purchases"],
  purchases: ["purchases"],
  expenses: ["expenses"],
  homepage: ["storefront"],
  landing: ["storefront"],
  pages: ["storefront"],
  blog: ["storefront"],
  sms: ["marketing"],
  messages: ["engagement"],
  tickets: ["engagement"],
  reviews: ["engagement"],
  subscribers: ["engagement"],
  blocklist: ["orders", "customers"],
  staff: ["staff"],
  activity: ["staff"],
  settings: ["settings"],
};

export function canAccessSection(user: StaffUser | null | undefined, name: string) {
  if (!(name in SECTION_PERMISSIONS)) return false;
  if (name === "workspace" || name === "profile") return isStaffRole(user?.role);
  return canAny(user, SECTION_PERMISSIONS[name]);
}

/**
 * API path (after `/api/commerce/admin/`) → permissions that may call it. Read-only lookups
 * that many screens need (product search, taxonomy) are open to several roles. Unknown
 * resources default to owner-only.
 */
export function apiPermissions(path: string[], method: string): Permission[] | "any-staff" {
  const [resource, sub] = path;
  const read = method === "GET";
  switch (resource) {
    case "badges":
    case "taxonomy":
    case "me":
    case "workspace":
      return "any-staff";
    case "overview":
      return ["overview"];
    case "products":
      return read ? ["products", "inventory", "orders", "pos", "storefront", "purchases", "coupons"] : ["products"];
    case "categories":
    case "brands":
    case "colors":
    case "sizes":
      return read ? ["products", "storefront", "orders", "pos", "inventory", "purchases"] : ["products"];
    case "orders":
    case "incomplete":
    case "courier":
    case "fraud":
    case "invoices":
      return ["orders"];
    case "pos":
      return ["pos"];
    case "customers":
      return read ? ["customers", "orders", "pos"] : ["customers"];
    case "coupons":
      return ["coupons"];
    case "blocklist":
      return ["orders", "customers"];
    case "sms":
      return sub === "send" ? ["marketing", "orders"] : ["marketing"];
    case "messages":
    case "subscribers":
      return ["engagement"];
    case "home":
    case "landing":
    case "pages":
    case "posts":
      return ["storefront"];
    case "media":
      return ["storefront", "products"];
    case "suppliers":
    case "purchases":
      return read ? ["purchases", "reports"] : ["purchases"];
    case "expenses":
      return read ? ["expenses", "reports"] : ["expenses"];
    case "reports":
      return ["reports"];
    case "settings":
      return read ? ["settings", "orders", "pos"] : ["settings"];
    case "integrations":
      return ["settings"];
    case "staff":
    case "audit":
      return ["staff"];
    case "operations": {
      const op = path[1];
      if (op === "stock") return ["inventory", "products", "purchases"];
      if (op === "customers") return read ? ["customers", "orders"] : ["customers"];
      if (op === "shipment") return ["orders"];
      return ["engagement"];
    }
    default:
      return [];
  }
}
