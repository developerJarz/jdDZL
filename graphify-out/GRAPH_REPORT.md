# Graph Report - dazzle-rebuild  (2026-10-09)

## Corpus Check
- Code-only extraction: 144 files. Documents and images were skipped.

## Summary
- 752 nodes · 2217 edges · 25 communities
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Storefront Components and Listings
- Product Actions and Icons
- Catalog Data and Services
- Navigation and Client State
- Catalog Content Extraction
- Authentication and API Configuration
- Dependencies and Build Commands
- Customer Request Forms
- Page Metadata and Content
- Product Details and Comparison
- Announcements and Careers
- Offers and Campaign Countdown
- Directories and Search Indexing
- Page Shells and Breadcrumbs
- Category and Brand Listings
- TypeScript Compiler Configuration
- Product Showcase Routes
- Image Resolution and Processing
- Internal Link Validation
- HTML Content Parsing
- Store Locations and Maps
- Flight Payload Parsing
- Policy Pages and Content
- Blog Article Rendering
- Product Normalization and Tabs

## God Nodes (most connected - your core abstractions)
1. `next` - 71 edges
2. `Img()` - 59 edges
3. `buildMetadata()` - 55 edges
4. `getPageMeta()` - 51 edges
5. `react` - 46 edges
6. `Breadcrumb()` - 37 edges
7. `cn()` - 28 edges
8. `ProductDetailView()` - 28 edges
9. `Product` - 27 edges
10. `HomePage()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `PressCoveragePage()` --calls--> `PostGridPage()`  [EXTRACTED]
  src/app/press-coverage/page.tsx → src/components/blog/PostGrid.tsx
- `generateStaticParams()` --calls--> `getBrands()`  [EXTRACTED]
  src/app/brands/[slug]/page.tsx → src/services/catalog.ts
- `generateMetadata()` --calls--> `getPageMeta()`  [EXTRACTED]
  src/app/layout.tsx → src/services/content.ts
- `Clip` --references--> `Product`  [EXTRACTED]
  src/components/home/ClipToCart.tsx → src/types/index.ts
- `ProductCardProps` --references--> `Product`  [EXTRACTED]
  src/components/product/ProductCard.tsx → src/types/index.ts

## Import Cycles
- None detected.

## Communities (25 total, 0 thin omitted)

### Community 0 - "Storefront Components and Listings"
Cohesion: 0.06
Nodes (79): react, HomePage(), metadata, Results(), SearchPage(), BlogCard(), BlogList(), CartView() (+71 more)

### Community 1 - "Product Actions and Icons"
Cohesion: 0.05
Nodes (64): metadata, OrderTrackingPage(), OrderTracking(), features, BestPriceIcon(), CallIcon(), ChevronRightBoldIcon(), ChevronRightThinIcon() (+56 more)

### Community 2 - "Catalog Data and Services"
Cohesion: 0.05
Nodes (66): ref_server_only, GET(), blogs, brandBySlug, brands, categories, categoryBySlug, exploreAll (+58 more)

### Community 3 - "Navigation and Client State"
Cohesion: 0.07
Nodes (46): src_app_globals, generateMetadata(), RootLayout(), urbanist, viewport, Item, ChevronDownBoldIcon(), ChevronDownIcon() (+38 more)

### Community 4 - "Catalog Content Extraction"
Cohesion: 0.05
Nodes (41): blogIndex, blogs, brandAliases, brandCategoryGuess, brandIndex, brandListings, brandsByLength, categoryListings (+33 more)

### Community 5 - "Authentication and API Configuration"
Cohesion: 0.10
Nodes (33): AboutPage(), ForgotPasswordPage(), metadata, LoginPage(), metadata, metadata, RegistrationPage(), ForgotPasswordForm() (+25 more)

### Community 6 - "Dependencies and Build Commands"
Cohesion: 0.06
Nodes (34): eslintConfig, dependencies, next, react, react-dom, devDependencies, eslint, eslint-config-next (+26 more)

### Community 7 - "Customer Request Forms"
Cohesion: 0.16
Nodes (13): nextConfig, next, CorporatePage(), FeedbackPage(), metadata, generateMetadata(), PreOrderPage(), SupportPage() (+5 more)

### Community 8 - "Page Metadata and Content"
Cohesion: 0.16
Nodes (18): generateMetadata(), generateMetadata(), BlogsPage(), generateMetadata(), generateMetadata(), generateMetadata(), generateMetadata(), generateMetadata() (+10 more)

### Community 9 - "Product Details and Comparison"
Cohesion: 0.17
Nodes (19): Compare(), ComparePage(), generateMetadata(), generateStaticParams(), generateMetadata(), generateStaticParams(), ProductContent(), ProductPage() (+11 more)

### Community 10 - "Announcements and Careers"
Cohesion: 0.22
Nodes (15): AnnouncementPage(), AnnouncementPostPage(), Content(), generateMetadata(), generateStaticParams(), CareerPage(), CareerPostPage(), Content() (+7 more)

### Community 11 - "Offers and Campaign Countdown"
Cohesion: 0.18
Nodes (16): GET(), generateMetadata(), generateStaticParams(), OfferContent(), OfferDetailPage(), OnlineExclusivePage(), ShowcaseGrid(), OfferCountdown() (+8 more)

### Community 12 - "Directories and Search Indexing"
Cohesion: 0.15
Nodes (14): generateStaticParams(), BrandsPage(), generateMetadata(), CategoriesPage(), generateMetadata(), generateStaticParams(), generateStaticParams(), sitemap() (+6 more)

### Community 13 - "Page Shells and Breadcrumbs"
Cohesion: 0.16
Nodes (14): CartPage(), metadata, generateMetadata(), OffersPage(), generateMetadata(), ShopLocationPage(), generateStaticParams(), ArrowRightIcon() (+6 more)

### Community 14 - "Category and Brand Listings"
Cohesion: 0.20
Nodes (15): BrandPage(), Content(), generateMetadata(), generateStaticParams(), CategoryPage(), Content(), generateMetadata(), Content() (+7 more)

### Community 15 - "TypeScript Compiler Configuration"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 16 - "Product Showcase Routes"
Cohesion: 0.22
Nodes (12): generateMetadata(), Page(), generateMetadata(), Page(), generateMetadata(), Page(), generateMetadata(), Page() (+4 more)

### Community 17 - "Image Resolution and Processing"
Cohesion: 0.18
Nodes (14): ref_fs, ref_path, createImageResolver(), directFile(), pickFile(), resolve(), fs, imageSize() (+6 more)

### Community 18 - "Internal Link Validation"
Cohesion: 0.12
Nodes (14): bad, blogs, brands, { categories }, fs, G, listings, offers (+6 more)

### Community 19 - "HTML Content Parsing"
Cohesion: 0.23
Nodes (16): addBrand(), categories, decodeEntities(), exploreAll, img(), inlineLinksOnly(), listingArticle(), mapBanners() (+8 more)

### Community 20 - "Store Locations and Maps"
Cohesion: 0.31
Nodes (10): generateMetadata(), StoreDetail(), StorePage(), MapIcon(), SearchLucideIcon(), aliases, inDistrict(), StoreList() (+2 more)

### Community 21 - "Flight Payload Parsing"
Cohesion: 0.27
Nodes (10): P(), pageProps(), fs, makeResolver(), getRow(), resolve(), parse(), parseRows() (+2 more)

### Community 22 - "Policy Pages and Content"
Cohesion: 0.39
Nodes (8): allPolicies(), EXTRA, generateMetadata(), generateStaticParams(), Policy(), PolicyPage(), getPolicyContent(), getPolicyPages()

### Community 23 - "Blog Article Rendering"
Cohesion: 0.60
Nodes (5): BlogPostPage(), generateMetadata(), Post(), CalendarSmallIcon(), getBlogPost()

### Community 24 - "Product Normalization and Tabs"
Cohesion: 0.40
Nodes (5): round2(), tabProducts(), tabsOf(), upsertAll(), upsertProduct()

## Knowledge Gaps
- **140 isolated node(s):** `Suggestion`, `CarouselProps`, `Props`, `IconProps`, `Popup` (+135 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 178 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `Customer Request Forms` to `Storefront Components and Listings`, `Product Actions and Icons`, `Navigation and Client State`, `Authentication and API Configuration`, `Dependencies and Build Commands`, `Page Metadata and Content`, `Product Details and Comparison`, `Announcements and Careers`, `Offers and Campaign Countdown`, `Directories and Search Indexing`, `Page Shells and Breadcrumbs`, `Category and Brand Listings`, `Store Locations and Maps`, `Policy Pages and Content`, `Blog Article Rendering`?**
  _High betweenness centrality (0.160) - this node is a cross-community bridge._
- **Why does `react` connect `Storefront Components and Listings` to `Product Actions and Icons`, `Navigation and Client State`, `Authentication and API Configuration`, `Dependencies and Build Commands`, `Customer Request Forms`, `Product Details and Comparison`, `Announcements and Careers`, `Offers and Campaign Countdown`, `Category and Brand Listings`, `Store Locations and Maps`, `Policy Pages and Content`, `Blog Article Rendering`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Why does `Img()` connect `Storefront Components and Listings` to `Product Actions and Icons`, `Navigation and Client State`, `Authentication and API Configuration`, `Product Details and Comparison`, `Announcements and Careers`, `Directories and Search Indexing`, `Page Shells and Breadcrumbs`, `Store Locations and Maps`, `Blog Article Rendering`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **What connects `Suggestion`, `CarouselProps`, `Props` to the rest of the system?**
  _140 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Storefront Components and Listings` be split into smaller, more focused modules?**
  _Cohesion score 0.06178608515057113 - nodes in this community are weakly interconnected._
- **Should `Product Actions and Icons` be split into smaller, more focused modules?**
  _Cohesion score 0.05134825014343087 - nodes in this community are weakly interconnected._
- **Should `Catalog Data and Services` be split into smaller, more focused modules?**
  _Cohesion score 0.052160493827160495 - nodes in this community are weakly interconnected._
## Graph Integrity
- No dangling endpoints. Three self-loops were retained from extraction.
