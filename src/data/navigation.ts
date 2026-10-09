// dazzle.bd storefront navigation. Existing routes remain compatible with saved links.

export const topBarLinks = [
  { label: "Buying guides", href: "/blogs" },
  { label: "Shopping help", href: "/faq" },
];

export const headerLinks: { label: string; href: string; highlight?: boolean }[] = [
  { label: "Tech brands", href: "/brands" },
  { label: "Online picks", href: "/online-exclusive" },
  { label: "Offers", href: "/offer", highlight: true },
  { label: "Product enquiry", href: "/pre-order" },
];

export const footerColumns: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about-us" },
      { label: "Career", href: "/career" },
      { label: "Explore brands", href: "/brands" },
      { label: "Buying guides", href: "/blogs" },
      { label: "Media enquiries", href: "/press-coverage" },
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
      { label: "Ask for support", href: "/support" },
      { label: "Store updates", href: "/announcement" },
      { label: "Business enquiries", href: "/corporate" },
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
  { label: "Offers", href: "/offer", icon: "offer" },
  { label: "Browse", href: "/categories", icon: "category" },
  { label: "Enquire", href: "/pre-order", icon: "preorder" },
  { label: "Account", href: "/auth/login", icon: "profile" },
] as const;
