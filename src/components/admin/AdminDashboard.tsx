"use client";
import Link from "next/link";
import { Lock } from "lucide-react";
import { AdminShell, NAV_ITEMS } from "./AdminShell";
import { MeProvider, useCan, type Me } from "./lib/me";
import { EmptyState } from "./shared/kit";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { OverviewPage } from "./pages/Overview";
import { ProductsPage } from "./pages/Products";
import { ProductEditor } from "./pages/ProductEditor";
import { CategoriesPage } from "./pages/Categories";
import { BrandsPage } from "./pages/Brands";
import { HomepageBuilder } from "./pages/Homepage";
import { OrdersPage } from "./pages/Orders";
import { InventoryPage } from "./pages/Inventory";
import { CustomersPage } from "./pages/Customers";
import { CouponsPage } from "./pages/Coupons";
import { InboxPage, ReviewsPage, StockLedgerPage, SubscribersPage, TicketsPage } from "./pages/Engagement";
import { ActivityPage, MediaPage } from "./pages/Admin";
import { SettingsPage } from "./pages/Settings";
import { ReportsPage } from "./pages/Reports";
import { IncompletePage } from "./pages/Incomplete";
import { PosPage } from "./pages/Pos";
import { AttributesPage } from "./pages/Attributes";
import { ExpensesPage, PurchasesPage, SuppliersPage } from "./pages/Purchasing";
import { LandingPagesPage } from "./pages/Landing";
import { BlogPage, PagesPage } from "./pages/Content";
import { SmsPage } from "./pages/Sms";
import { StaffPage } from "./pages/Staff";
import { BlocklistPage } from "./pages/Blocklist";
import { StaffProfilePage, WorkspacePage } from "./pages/Workspace";

function NoAccess() {
  const { section } = useCan();
  const first = NAV_ITEMS.find((n) => section(n.name));
  return (
    <Card>
      <EmptyState
        icon={Lock}
        title="You don't have access to this area"
        description="Ask the store owner to add this permission to your staff role."
        action={
          first && (
            <Button asChild>
              <Link href={first.name === "overview" ? "/admin" : `/admin/${first.name}`}>Go to {first.label}</Link>
            </Button>
          )
        }
      />
    </Card>
  );
}

function Page({ section, recordId }: { section: string; recordId?: string }) {
  const { section: allowed } = useCan();
  const item = NAV_ITEMS.find((n) => n.name === section);
  const description = item?.description ?? "";
  if (!allowed(section)) return <NoAccess />;
  const editing = section === "products" && recordId;
  const pages: Record<string, () => React.ReactNode> = {
    workspace: () => <WorkspacePage />,
    profile: () => <StaffProfilePage />,
    overview: () => <OverviewPage />,
    reports: () => <ReportsPage description={description} />,
    products: () => (editing ? <ProductEditor id={recordId === "new" ? null : recordId} /> : <ProductsPage description={description} />),
    categories: () => <CategoriesPage description={description} />,
    brands: () => <BrandsPage description={description} />,
    attributes: () => <AttributesPage description={description} />,
    homepage: () => <HomepageBuilder description={description} />,
    landing: () => <LandingPagesPage description={description} />,
    pages: () => <PagesPage description={description} />,
    blog: () => <BlogPage description={description} />,
    orders: () => <OrdersPage description={description} />,
    incomplete: () => <IncompletePage description={description} />,
    pos: () => <PosPage />,
    inventory: () => <InventoryPage description={description} />,
    customers: () => <CustomersPage description={description} />,
    coupons: () => <CouponsPage description={description} />,
    suppliers: () => <SuppliersPage description={description} />,
    purchases: () => <PurchasesPage description={description} />,
    expenses: () => <ExpensesPage description={description} />,
    sms: () => <SmsPage description={description} />,
    messages: () => <InboxPage description={description} />,
    tickets: () => <TicketsPage description={description} />,
    reviews: () => <ReviewsPage description={description} />,
    subscribers: () => <SubscribersPage description={description} />,
    "stock-ledger": () => <StockLedgerPage description={description} />,
    media: () => <MediaPage description={description} />,
    staff: () => <StaffPage description={description} />,
    blocklist: () => <BlocklistPage description={description} />,
    activity: () => <ActivityPage description={description} />,
    settings: () => <SettingsPage description={description} />,
  };
  return <>{(pages[section] ?? pages.overview)()}</>;
}

export function AdminDashboard({ section, recordId, me }: { section: string; recordId?: string; me: Me }) {
  const item = NAV_ITEMS.find((n) => n.name === section);
  const editing = section === "products" && recordId;
  const title = editing ? (recordId === "new" ? "New product" : "Edit product") : (item?.label ?? "Overview");
  return (
    <MeProvider value={me}>
      <AdminShell section={section} title={title}>
        <Page section={section} recordId={recordId} />
      </AdminShell>
    </MeProvider>
  );
}
