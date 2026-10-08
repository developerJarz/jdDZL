"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { mobileNav } from "@/data/navigation";
import { NavCategoryIcon, NavHomeIcon, NavOfferIcon, NavPreorderIcon, NavProfileIcon } from "@/components/icons";

const icons = {
  home: NavHomeIcon,
  offer: NavOfferIcon,
  category: NavCategoryIcon,
  preorder: NavPreorderIcon,
  profile: NavProfileIcon,
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/categories") return pathname.startsWith("/categories");
  if (href === "/auth/login") return pathname.startsWith("/auth");
  return pathname.startsWith(href);
}

/** Floating bottom tab bar shown below lg. */
export function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <div className="lg:hidden block">
      <div className="fixed bottom-2 z-[998] w-full flex justify-center px-3 pt-3">
        <nav
          aria-label="Primary"
          className="grid grid-cols-5 gap-1 px-2 rounded-[28px] transition-all duration-500 ease-in-out py-2 w-full max-w-xl"
          style={{
            background: "linear-gradient(90deg, rgba(0, 0, 0, 0.84) 0%, #43372A 100%)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >
          {mobileNav.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = icons[item.icon];
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={
                  "w-full flex flex-col items-center justify-center rounded-[18px] transition-all duration-500 ease-in-out gap-1 py-2 " +
                  (active ? "bg-[#2a2520]" : "hover:bg-[#232018]")
                }
                style={active ? { boxShadow: "0 2px 16px rgba(201,169,110,0.08), inset 0 1px 0 rgba(255,255,255,0.04)" } : undefined}
              >
                <span
                  className={"transition-all duration-500 ease-in-out flex items-center justify-center " + (active ? "[&_path]:stroke-[#E9CCAE]" : "")}
                  style={{ transform: active ? "scale(1.15)" : "scale(1)" }}
                >
                  <Icon />
                </span>
                <span
                  className="text-[10px] font-medium tracking-wide whitespace-nowrap overflow-hidden transition-all duration-500 ease-in-out"
                  style={{ color: active ? "#c9a96e" : "#6b7280" }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
