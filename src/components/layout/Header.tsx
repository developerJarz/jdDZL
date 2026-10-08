import Link from "next/link";
import { headerLinks, topBarLinks } from "@/data/navigation";
import type { NavigationData } from "@/services/navigation";
import type { SiteSettings } from "@/types";
import { PhoneIcon, StoreLocationIcon, UserIcon } from "@/components/icons";
import { Img } from "@/components/ui/Img";
import { CategoryNav } from "./CategoryNav";
import { HeaderSearch } from "./HeaderSearch";
import { CartButton, ThemeToggle } from "./HeaderActions";
import { MobileHeader } from "./MobileHeader";

export function Logo({ site, width = 130, height = 30, eager = false }: { site: SiteSettings; width?: number; height?: number; eager?: boolean }) {
  return (
    <Link href="/" className="shrink-0 mr-2" aria-label={`${site.name} home`}>
      <span className="text-3xl flex font-black text-white tracking-tighter leading-none">
        <Img asset={site.assets.logo} alt={`${site.name} logo`} width={width} height={height} priority={eager} className="h-auto" />
      </span>
    </Link>
  );
}

export function Header({ site, nav }: { site: SiteSettings; nav: NavigationData }) {
  return (
    <header
      className="w-full font-sans sticky top-0 z-[999] lg:static transition-colors duration-300 rounded-b-[20px] lg:px-4 dark:bg-[#1a1a1a] dark:text-white"
      style={{
        backgroundImage: `url(${site.assets.headerBg.src})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* top bar */}
      <div className="hidden md:block">
        <div className="max-w-355 py-2 px-12 rounded-br-[10px] rounded-bl-[10px] mx-auto flex items-center justify-between bg-background text-black transition-colors duration-300">
          <nav className="flex items-center gap-6" aria-label="Highlights">
            {topBarLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-xs font-medium transition-colors bg-linear-to-r from-primary to-[#CB843B] text-transparent bg-clip-text hover:brightness-110 dark:hover:text-white"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-6">
            <a href={`tel:${site.phone}`} className="flex items-center gap-2 text-xs text-primary hover:text-black transition-colors dark:hover:text-[#ba975f]">
              <PhoneIcon />
              <span>{site.phone}</span>
            </a>
            <Link href="/shop-location" className="flex items-center gap-2 text-xs text-primary hover:text-black transition-colors dark:hover:text-[#ba975f]">
              <StoreLocationIcon />
              <span>Store locations</span>
            </Link>
          </div>
        </div>
      </div>

      {/* main row (tablet + desktop) */}
      <div className="border-b border-white/5">
        <div className="max-w-350 mx-auto lg:px-9 px-4">
          <div className="hidden md:flex items-center gap-6 py-4">
            <Logo site={site} eager />
            <nav className="flex items-center gap-1" aria-label="Shop">
              {headerLinks.map((l) => (
                <div key={l.href} className="relative">
                  <Link
                    href={l.href}
                    className={
                      "text-sm px-3 py-1.5 rounded-lg transition-colors font-medium whitespace-nowrap " +
                      (l.highlight
                        ? "border border-[#DEB475] text-white hover:bg-[#C084FC]/10 bg-[#FFC04A4D]"
                        : "text-gray-300 hover:text-white hover:bg-white/5")
                    }
                  >
                    {l.label}
                  </Link>
                </div>
              ))}
            </nav>
            <div className="flex-1 relative">
              <HeaderSearch />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex gap-3 lg:mr-12.5">
                <Link
                  href="/account"
                  aria-label="My account"
                  className="w-13.5 h-13.5 rounded-xl bg-background flex items-center justify-center overflow-hidden hover:bg-background/95 transition-all duration-200"
                >
                  <UserIcon className="text-primary_color" />
                </Link>
                <CartButton className="relative w-13.5 h-13.5 rounded-xl bg-background flex items-center justify-center text-primary_color hover:bg-background/95 transition-all duration-200" />
              </div>
              <ThemeToggle className="w-13.5 h-13.5 rounded-xl bg-[#E9CCAE47] flex items-center justify-center transition-all duration-300" />
            </div>
          </div>
        </div>
      </div>

      {/* category bar (desktop) */}
      <div className="relative w-full hidden lg:flex">
        <div className="flex-col flex-1 items-center max-w-336 mx-auto lg:px-2 sm:px-0 hidden lg:flex">
          <CategoryNav nav={nav} />
        </div>
      </div>

      {/* phone */}
      <MobileHeader site={site} nav={nav} />
    </header>
  );
}
