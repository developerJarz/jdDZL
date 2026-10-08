"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import {
  ArrowLeftRight,
  BarChart3,
  ClipboardList,
  FileText,
  MessageSquareText,
  Newspaper,
  Palette,
  Rocket,
  ScanBarcode,
  ShieldAlert,
  ShoppingCart,
  Truck,
  UserCog,
  Wallet,
  Award,
  Bell,
  Boxes,
  ChevronsLeft,
  Command as CommandIcon,
  ExternalLink,
  FolderTree,
  History,
  Images,
  Inbox,
  LayoutDashboard,
  LayoutTemplate,
  LifeBuoy,
  LogOut,
  Mail,
  Menu,
  Moon,
  Package,
  PackagePlus,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  Star,
  Sun,
  Tag,
  Users,
} from "lucide-react";
import { cn } from "./lib/utils";
import { api, money, useApi } from "./lib/api";
import type { AdminProduct, Badges, Order, PageResult } from "./lib/types";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTitle } from "./ui/dialog";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  TooltipProvider,
} from "./ui/menu";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { ConfirmProvider, Thumb } from "./shared/kit";
import { TaxonomyProvider } from "./shared/pickers";
import { useCan } from "./lib/me";

type BadgeKey = keyof Badges | "stock";
export interface NavItem {
  name: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: BadgeKey;
  description: string;
}
export const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Workspace",
    items: [
      { name: "overview", label: "Overview", icon: LayoutDashboard, description: "Your store's performance at a glance." },
      { name: "reports", label: "Reports", icon: BarChart3, description: "Sales, profit & loss, stock, purchase, and expense reports by date." },
    ],
  },
  {
    group: "Sales",
    items: [
      { name: "orders", label: "Orders", icon: ShoppingBag, badge: "pendingOrders", description: "Follow every order from checkout to your customer’s door." },
      { name: "incomplete", label: "Incomplete orders", icon: ShoppingCart, badge: "incompleteOrders", description: "Checkouts customers started but didn’t finish — call them and recover the sale." },
      { name: "pos", label: "POS", icon: ScanBarcode, description: "Sell at the counter with barcode scanning and instant receipts." },
      { name: "customers", label: "Customers", icon: Users, description: "The people behind your growing business." },
      { name: "coupons", label: "Coupons", icon: Tag, description: "Discount codes that give customers a reason to buy." },
    ],
  },
  {
    group: "Catalog",
    items: [
      { name: "products", label: "Products", icon: Package, description: "Build and organize a catalog your customers will love." },
      { name: "categories", label: "Categories", icon: FolderTree, description: "Categories, sub-categories, and child categories for the menu and filters." },
      { name: "brands", label: "Brands", icon: Award, description: "Manage brand pages, logos, and featured brands." },
      { name: "attributes", label: "Colors & sizes", icon: Palette, description: "Reusable colors and sizes for product variants." },
      { name: "inventory", label: "Inventory", icon: Boxes, badge: "stock", description: "Keep stock accurate and your best sellers available." },
      { name: "stock-ledger", label: "Stock movements", icon: ArrowLeftRight, description: "Every receipt, correction, sale, and order reservation." },
      { name: "media", label: "Media library", icon: Images, description: "Images uploaded for products, categories, and banners." },
    ],
  },
  {
    group: "Purchasing",
    items: [
      { name: "suppliers", label: "Suppliers", icon: Truck, description: "The companies you buy stock from, with balances due." },
      { name: "purchases", label: "Purchases", icon: ClipboardList, description: "Purchase orders and stock receipts — receiving updates stock and cost." },
      { name: "expenses", label: "Expenses", icon: Wallet, description: "Rent, salaries, marketing, and other running costs for profit reports." },
    ],
  },
  {
    group: "Storefront",
    items: [
      { name: "homepage", label: "Homepage", icon: LayoutTemplate, description: "Arrange sections, banners, and featured products." },
      { name: "landing", label: "Landing pages", icon: Rocket, description: "Campaign pages with a built-in order form — create as many as you like." },
      { name: "pages", label: "Pages", icon: FileText, description: "About, policies, FAQ, and any other page you need." },
      { name: "blog", label: "Blog", icon: Newspaper, description: "Write and publish articles for your customers." },
    ],
  },
  {
    group: "Marketing",
    items: [{ name: "sms", label: "SMS panel", icon: MessageSquareText, description: "Send SMS to customers and review delivery logs." }],
  },
  {
    group: "Engagement",
    items: [
      { name: "messages", label: "Inbox", icon: Inbox, badge: "newMessages", description: "Customer questions, feedback, and business enquiries." },
      { name: "tickets", label: "Support & returns", icon: LifeBuoy, badge: "openTickets", description: "Support, return, and warranty requests in one queue." },
      { name: "reviews", label: "Reviews", icon: Star, badge: "pendingReviews", description: "Moderate feedback from verified purchases." },
      { name: "subscribers", label: "Subscribers", icon: Mail, description: "Your newsletter audience." },
    ],
  },
  {
    group: "Administration",
    items: [
      { name: "staff", label: "Staff & roles", icon: UserCog, description: "Team accounts and what each person can access." },
      { name: "blocklist", label: "Fraud & blocking", icon: ShieldAlert, description: "Check a customer's delivery history and block spam phones or IPs." },
      { name: "activity", label: "Activity log", icon: History, description: "A record of changes made in your workspace." },
      { name: "settings", label: "Settings", icon: Settings, description: "Store, delivery, payments, couriers, SMS, tracking, and social links." },
    ],
  },
];
export const NAV_ITEMS = NAV.flatMap((g) => g.items);
const href = (name: string) => (name === "overview" ? "/admin" : `/admin/${name}`);

function badgeCount(badges: Badges | null, key?: BadgeKey) {
  if (!badges || !key) return 0;
  return key === "stock" ? badges.lowStock + badges.outOfStock : badges[key];
}

function useAdminTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync with the class set by the init script
    setDark(document.documentElement.classList.contains("dark"));
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("dz-admin-theme", next ? "dark" : "light");
    } catch {}
  };
  return { dark, toggle };
}

function Wordmark({ collapsed }: { collapsed?: boolean }) {
  return (
    <Link href="/admin" className="flex items-center gap-2.5 px-1">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#e9ccae_0%,#cb843b_55%,#8a5214_100%)] text-lg font-black text-[#1c1309] shadow-lg shadow-black/30">
        d
      </span>
      {!collapsed && (
        <span className="leading-none">
          <span className="block bg-[linear-gradient(90deg,#f3dcc0,#e0a462_60%,#cb843b)] bg-clip-text text-[22px] font-extrabold tracking-tight text-transparent">
            dazzle<sup className="text-[10px]">®</sup>
          </span>
          <span className="text-[10px] font-semibold tracking-[0.2em] text-sidebar-foreground/60 uppercase">Commerce admin</span>
        </span>
      )}
    </Link>
  );
}

function SidebarNav({
  section,
  badges,
  collapsed,
  onNavigate,
  allowed,
}: {
  allowed: (name: string) => boolean;
  section: string;
  badges: Badges | null;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Administration" className="admin-scroll flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {NAV.map((group) => ({ ...group, items: group.items.filter((i) => allowed(i.name)) }))
        .filter((group) => group.items.length)
        .map((group) => (
        <div key={group.group}>
          {!collapsed && (
            <p className="mb-1.5 px-3 text-[10px] font-bold tracking-[0.18em] text-sidebar-foreground/45 uppercase">{group.group}</p>
          )}
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active = section === item.name;
              const count = badgeCount(badges, item.badge);
              const link = (
                <Link
                  href={href(item.name)}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex h-9 items-center gap-3 rounded-lg px-3 text-[13.5px] font-medium transition-colors",
                    collapsed && "justify-center px-0",
                    active
                      ? "bg-[linear-gradient(90deg,rgba(224,164,98,0.20),rgba(224,164,98,0.05))] text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  {active && <span className="absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-r-full bg-sidebar-primary" />}
                  <item.icon className={cn("size-[18px] shrink-0", active ? "text-sidebar-primary" : "opacity-80")} />
                  {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                  {count > 0 &&
                    (collapsed ? (
                      <span className="absolute top-1 right-1.5 size-2 rounded-full bg-sidebar-primary" />
                    ) : (
                      <span className="rounded-full bg-sidebar-primary/15 px-1.5 py-px text-[10.5px] font-bold text-sidebar-primary tabular-nums">
                        {count > 99 ? "99+" : count}
                      </span>
                    ))}
                </Link>
              );
              return collapsed ? (
                <Tooltip key={item.name} content={item.label} side="right">
                  {link}
                </Tooltip>
              ) : (
                <React.Fragment key={item.name}>{link}</React.Fragment>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function CommandPalette({ open, onOpenChange, toggleTheme }: { open: boolean; onOpenChange: (open: boolean) => void; toggleTheme: () => void }) {
  const router = useRouter();
  const { section: allowed } = useCan();
  const [query, setQuery] = useState("");
  const search = open && query.trim().length >= 2 ? encodeURIComponent(query.trim()) : null;
  const products = useApi<PageResult<AdminProduct>>(search ? `admin/products?limit=6&q=${search}` : null, 220);
  const orders = useApi<PageResult<Order>>(search ? `admin/orders?limit=5&q=${search}` : null, 220);
  const go = (path: string) => {
    onOpenChange(false);
    setQuery("");
    router.push(path);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl overflow-hidden p-0" showClose={false}>
        <DialogTitle className="sr-only">Search the dashboard</DialogTitle>
        <Command>
          <CommandInput value={query} onValueChange={setQuery} placeholder="Search pages, products, orders…" />
          <CommandList className="max-h-[60vh]">
            <CommandEmpty>No results.</CommandEmpty>
            {search && (products.data?.items.length ?? 0) > 0 && (
              <CommandGroup heading="Products">
                {products.data!.items.map((p) => (
                  <CommandItem key={p._id} value={`product ${p.name} ${p.code} ${p.slug}`} onSelect={() => go(`/admin/products/${p._id}`)}>
                    <Thumb image={p.image} size={28} />
                    <span className="flex-1 truncate">{p.name}</span>
                    <span className="text-xs text-muted-foreground">{money(p.price)}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {search && (orders.data?.items.length ?? 0) > 0 && (
              <CommandGroup heading="Orders">
                {orders.data!.items.map((o) => (
                  <CommandItem key={o._id} value={`order ${o.orderNo} ${o.customer.name} ${o.customer.email}`} onSelect={() => go(`/admin/orders?q=${o.orderNo}`)}>
                    <ShoppingBag />
                    <span className="flex-1 truncate">
                      {o.orderNo} · {o.customer.name}
                    </span>
                    <span className="text-xs text-muted-foreground">{money(o.total)}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            <CommandGroup heading="Quick actions">
              <CommandItem value="new product add upload" onSelect={() => go("/admin/products/new")}>
                <PackagePlus /> Add a product
              </CommandItem>
              <CommandItem value="new category create" onSelect={() => go("/admin/categories?new=1")}>
                <FolderTree /> Create a category
              </CommandItem>
              <CommandItem value="new coupon discount" onSelect={() => go("/admin/coupons?new=1")}>
                <Plus /> Create a coupon
              </CommandItem>
              <CommandItem value="customize homepage banners" onSelect={() => go("/admin/homepage")}>
                <LayoutTemplate /> Customize homepage
              </CommandItem>
              <CommandItem
                value="toggle theme dark light mode"
                onSelect={() => {
                  toggleTheme();
                  onOpenChange(false);
                }}
              >
                <Moon /> Toggle dark mode
              </CommandItem>
              <CommandItem
                value="view storefront store"
                onSelect={() => {
                  window.open("/", "_blank");
                  onOpenChange(false);
                }}
              >
                <ExternalLink /> Open storefront
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading="Go to">
              {NAV_ITEMS.filter((item) => allowed(item.name)).map((item) => (
                <CommandItem key={item.name} value={`go ${item.label}`} onSelect={() => go(href(item.name))}>
                  <item.icon /> {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

export function AdminShell({ section, title, children }: { section: string; title: string; children: React.ReactNode }) {
  const router = useRouter();
  const theme = useAdminTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const badges = useApi<Badges>("admin/badges");
  const reloadBadges = badges.reload;

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore persisted preference after hydration
      setCollapsed(localStorage.getItem("dz-admin-sidebar") === "collapsed");
    } catch {}
    const expired = () => {
      router.replace("/admin/login");
      router.refresh();
    };
    const refresh = () => reloadBadges();
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    const timer = setInterval(refresh, 60_000);
    window.addEventListener("dazzle:session-expired", expired);
    window.addEventListener("dazzle:refresh-badges", refresh);
    window.addEventListener("keydown", key);
    return () => {
      clearInterval(timer);
      window.removeEventListener("dazzle:session-expired", expired);
      window.removeEventListener("dazzle:refresh-badges", refresh);
      window.removeEventListener("keydown", key);
    };
  }, [router, reloadBadges]);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem("dz-admin-sidebar", c ? "expanded" : "collapsed");
      } catch {}
      return !c;
    });
  };
  const signOut = async () => {
    await api("auth/logout", { method: "POST" }).catch(() => {});
    router.push("/admin/login");
    router.refresh();
  };
  const b = badges.data;
  const { me, section: allowed } = useCan();
  const initials = (me?.name ?? "Admin").split(/s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const alerts = b
    ? [
        { count: b.pendingOrders, label: "orders awaiting confirmation", href: "/admin/orders?status=pending", icon: ShoppingBag },
        { count: b.outOfStock, label: "products out of stock", href: "/admin/inventory?status=out", icon: Boxes },
        { count: b.lowStock, label: "products running low", href: "/admin/inventory?status=low", icon: Boxes },
        { count: b.newMessages, label: "new inbox messages", href: "/admin/messages", icon: Inbox },
        { count: b.openTickets, label: "open support requests", href: "/admin/tickets", icon: LifeBuoy },
        { count: b.pendingReviews, label: "reviews awaiting moderation", href: "/admin/reviews", icon: Star },
        { count: b.incompleteOrders, label: "incomplete checkouts to follow up", href: "/admin/incomplete", icon: ShoppingCart },
      ].filter((a) => a.count > 0 && allowed(a.href.split("/")[2]?.split("?")[0] || "overview"))
    : [];

  return (
    <TooltipProvider delayDuration={200}>
      <ConfirmProvider>
        <TaxonomyProvider>
          <a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-md focus:bg-card focus:px-3 focus:py-2">
            Skip to main content
          </a>
          <div className="flex min-h-screen">
            <aside
              className={cn(
                "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 lg:flex",
                collapsed ? "w-[72px]" : "w-[264px]",
              )}
            >
              <div className={cn("flex h-16 items-center border-b border-sidebar-border px-4", collapsed && "justify-center px-2")}>
                <Wordmark collapsed={collapsed} />
              </div>
              <SidebarNav section={section} badges={b} collapsed={collapsed} allowed={allowed} />
              <div className="space-y-2 border-t border-sidebar-border p-3">
                {!collapsed && (
                  <Link
                    href="/"
                    target="_blank"
                    className="flex items-center justify-between rounded-lg border border-sidebar-border px-3 py-2 text-[13px] font-medium text-sidebar-foreground transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  >
                    Visit storefront <ExternalLink className="size-3.5" />
                  </Link>
                )}
                <button
                  type="button"
                  onClick={toggleCollapsed}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-medium text-sidebar-foreground/70 transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    collapsed && "justify-center px-0",
                  )}
                  aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  <ChevronsLeft className={cn("size-4 transition", collapsed && "rotate-180")} />
                  {!collapsed && "Collapse"}
                </button>
              </div>
            </aside>

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetContent side="left" className="w-[280px] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <div className="flex h-16 items-center border-b border-sidebar-border px-4">
                  <Wordmark />
                </div>
                <SidebarNav section={section} badges={b} onNavigate={() => setMobileOpen(false)} allowed={allowed} />
              </SheetContent>
            </Sheet>

            <div className="flex min-w-0 flex-1 flex-col">
              <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-xl md:px-6">
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation" onClick={() => setMobileOpen(true)}>
                  <Menu />
                </Button>
                <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-2 text-sm sm:flex">
                  <Link href="/admin" className="text-muted-foreground hover:text-foreground">
                    Dazzle
                  </Link>
                  <span className="text-muted-foreground/50">/</span>
                  <span className="truncate font-semibold">{title}</span>
                </nav>
                <button
                  type="button"
                  onClick={() => setPaletteOpen(true)}
                  className="ml-auto flex h-9 w-full max-w-[300px] items-center gap-2 rounded-lg border bg-card px-3 text-sm text-muted-foreground shadow-xs transition hover:border-ring/50 sm:ml-4 md:ml-auto"
                >
                  <Search className="size-4" />
                  <span className="flex-1 truncate text-left">Search…</span>
                  <kbd className="hidden items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 font-sans text-[10px] font-semibold sm:flex">
                    <CommandIcon className="size-3" />K
                  </kbd>
                </button>
                <Tooltip content={theme.dark ? "Light mode" : "Dark mode"}>
                  <Button variant="ghost" size="icon" onClick={theme.toggle} aria-label="Toggle dark mode">
                    {theme.dark ? <Sun /> : <Moon />}
                  </Button>
                </Tooltip>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications${alerts.length ? ` (${alerts.length})` : ""}`}>
                      <Bell />
                      {alerts.length > 0 && <span className="absolute top-2 right-2 size-2 rounded-full bg-brand ring-2 ring-background" />}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80">
                    <DropdownMenuLabel>Needs your attention</DropdownMenuLabel>
                    {alerts.length ? (
                      alerts.map((a) => (
                        <DropdownMenuItem key={a.label} asChild>
                          <Link href={a.href} className="py-2">
                            <a.icon />
                            <span className="flex-1">
                              <strong className="font-bold">{a.count}</strong> {a.label}
                            </span>
                          </Link>
                        </DropdownMenuItem>
                      ))
                    ) : (
                      <p className="px-2 py-6 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label="Account menu"
                      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#6d3f0e,#cb843b)] text-xs font-bold text-white ring-2 ring-background outline-none focus-visible:ring-ring"
                    >
                      {initials}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="normal-case tracking-normal">
                      <span className="block text-sm font-bold text-foreground">{me?.name ?? "Administrator"}</span>
                      <span className="text-xs font-normal">{me?.staffRole || (me?.role === "admin" ? "Store owner" : "Staff")}</span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/admin/settings">
                        <Settings /> Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/" target="_blank">
                        <ExternalLink /> View storefront
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem destructive onSelect={signOut}>
                      <LogOut /> Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </header>
              <main id="admin-main" className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-6 md:px-8 md:py-8">
                {children}
              </main>
              <footer className="mx-auto flex w-full max-w-[1480px] justify-between gap-4 px-4 pb-6 text-xs text-muted-foreground md:px-8">
                <span>© {new Date().getFullYear()} Dazzle Commerce</span>
                <span>Data is live from your store database.</span>
              </footer>
            </div>
          </div>
          <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} toggleTheme={theme.toggle} />
          <Toaster
            position="bottom-right"
            richColors
            closeButton
            theme={theme.dark ? "dark" : "light"}
            toastOptions={{ style: { fontFamily: "var(--font-urbanist), sans-serif" } }}
          />
        </TaxonomyProvider>
      </ConfirmProvider>
    </TooltipProvider>
  );
}

/** Pages call this after mutations so sidebar counters stay current. */
export const refreshBadges = () => window.dispatchEvent(new Event("dazzle:refresh-badges"));
