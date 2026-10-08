// Static navigation copied from the reference header / footer markup.

export const topBarLinks = [
  { label: "New Blogs", href: "/blogs" },
  { label: "EMI Policy", href: "/emi-policy" },
];

export const headerLinks: { label: string; href: string; highlight?: boolean }[] = [
  { label: "Brand", href: "/brands" },
  { label: "Online Exclusive", href: "/online-exclusive" },
  { label: "Offer", href: "/offer", highlight: true },
  { label: "Pre-Order", href: "/pre-order" },
];

export const footerColumns: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about-us" },
      { label: "Career", href: "/career" },
      { label: "Our Brand", href: "/brands" },
      { label: "Blogs", href: "/blogs" },
      { label: "Press Coverage", href: "/press-coverage" },
      { label: "Order Tracking", href: "/order-tracking" },
      { label: "Trade In", href: "/trade-in" },
      { label: "Product Disclaimer Policy", href: "/product-disclaimer-policy" },
      { label: "Membership Policy", href: "/membership-policy" },
      { label: "Pre-Order Policy", href: "/pre-order-policy" },
    ],
  },
  {
    title: "Help Center",
    links: [
      { label: "FAQ", href: "/faq" },
      { label: "Support System", href: "/support" },
      { label: "Announcement", href: "/announcement" },
      { label: "Corporate", href: "/corporate" },
      { label: "Feedback", href: "/feedback" },
      { label: "Sitemap", href: "/sitemap.xml" },
      { label: "Affiliate Policy", href: "/affiliate-policy" },
      { label: "Cookies Policy", href: "/cookies-policy" },
      { label: "Data Protection Policy", href: "/data-protection-policy" },
      { label: "Loyalty Program Policy", href: "/loyalty-program-policy" },
    ],
  },
  {
    title: "Terms & Conditions",
    links: [
      { label: "Terms & Conditions", href: "/terms-conditions" },
      { label: "Refund Policy", href: "/refund-policy" },
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Warranty Policy", href: "/warranty-policy" },
      { label: "Exchange Policy", href: "/exchange-policy" },
      { label: "Delivery Policy", href: "/delivery-policy" },
      { label: "EMI Policy", href: "/emi-policy" },
      { label: "Cancellation Policy", href: "/cancellation-policy" },
      { label: "Newsletter", href: "/newsletter-unsubscribe" },
    ],
  },
];

export const mobileNav = [
  { label: "Home", href: "/", icon: "home" },
  { label: "Offer", href: "/offer", icon: "offer" },
  { label: "Category", href: "/categories", icon: "category" },
  { label: "Pre-order", href: "/pre-order", icon: "preorder" },
  { label: "Profile", href: "/auth/login", icon: "profile" },
] as const;

export const appLinks = {
  googlePlay: "https://play.google.com/store/apps/details?id=com.bd.com.dazzle.app&hl=en",
};
