import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { Toaster } from "@/components/layout/Toaster";
import { StoreProvider } from "@/context/store";
import { ThemeProvider, themeInitScript } from "@/context/theme";
import { getSiteSettings } from "@/services/content";
import { getNavigationData } from "@/services/navigation";
import { TrackingScripts, WhatsAppButton } from "@/components/layout/Marketing";
import { liveMarketing } from "@/server/catalog";
import { getCmsPages } from "@/services/content";

export const dynamic = "force-dynamic";
export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [site, nav, marketing, pages] = await Promise.all([
    getSiteSettings(),
    getNavigationData(),
    liveMarketing(),
    getCmsPages(),
  ]);
  const footerPages = pages.filter((p) => p.showInFooter).map((p) => ({ label: p.title, href: `/${p.slug}` }));
  return (
    <ThemeProvider>
      <StoreProvider>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <TrackingScripts gtmId={marketing.tracking.gtmId} pixelId={marketing.tracking.pixelId} />
        <a href="#main-content" className="sr-only focus:not-sr-only">
          Skip to content
        </a>
        <Toaster />
        <Header site={site} nav={nav} />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Footer site={site} extraLinks={footerPages} />
        <WhatsAppButton phone={marketing.social.whatsapp ?? ""} />
        <MobileBottomNav />
      </StoreProvider>
    </ThemeProvider>
  );
}
