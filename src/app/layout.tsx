import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SITE_URL } from "@/lib/seo";
import { BRAND_NAME, BRAND_DESCRIPTION } from "@/data/content/brand";
import "./globals.css";
const urbanist = localFont({
  src: [
    {
      path: "./fonts/urbanist-latin.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  variable: "--font-urbanist",
  display: "swap",
  fallback: ["sans-serif"],
});
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: BRAND_NAME, template: "%s" },
  description: BRAND_DESCRIPTION,
  applicationName: BRAND_NAME,
  robots:
    process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true"
      ? undefined
      : { index: false, follow: false },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1a1714",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${urbanist.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
