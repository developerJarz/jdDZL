# dazzle.bd

The storefront name is **dazzle.bd**. The central line is **Tech that fits your day.**

Write in clear English for people comparing smartphones, laptops, tablets and accessories in Bangladesh. Start with a practical use, explain what to check and give the shopper an appropriate next step. Preserve exact manufacturer names, model names and factual configurations; do not invent specs or turn every paragraph into a list of search keywords.

Use concrete descriptions such as “compare the selected variant” and “review your checkout total.” Avoid unsupported superlatives, customer counts, review scores, stock urgency, opening dates, financing partnerships or blanket delivery and warranty promises. Business contact details and social destinations must be confirmed by the owner. Support forms remain available when those details are absent.

The wordmark, favicon and catalogue illustrations under `public/images/brand` are original code-authored SVG assets. Use the existing brown/gold palette with the new dark ink background. Product photography and manufacturer logos remain catalogue assets; the new wordmark does not imply ownership of those images.

## Editing the content

- `src/data/content/brand.ts`: shared name and default description.
- `src/data/content/about.ts`: story and shopping priorities.
- `src/data/content/policies.ts`: shopping information and support instructions.
- `scripts/brand-guides.cjs`: eight original buying guides.
- `scripts/create-brand-content.cjs`: product summaries, listing descriptions, promotions and metadata.

Run `npm run content:generate` after changing the content generator. `npm run extract` also applies the new content set, so extracting catalogue facts does not restore copied marketing prose.

Existing MongoDB records are adapted at the storefront read boundary. `src/data/content/import-manifest.json` holds fingerprints of the imported content; `src/server/content-brand.ts` recognises unchanged source fields. Original new copy and real contacts entered in the dashboard continue to take priority. Imported blog posts are retired from public views and the new guides are available without a database write. Run `npm run db:setup` to add the new guides as editable database entries; its insert-only import preserves existing records. Product IDs, model names, catalogue prices, inventory, orders, customers, credentials and integrations are preserved.

The supplied contact details, branch information, mobile-app link, source-store photos, copied articles and unconfirmed service promises are removed from public pages. Three imported merchant-specific service-plan listings are also retired from public browsing; their existing database records and historical orders remain intact. Add the owner's phone, email, address and social links in Settings. Add any specific return windows, delivery commitments and warranty coverage only after confirming them for this business.

Set `NEXT_PUBLIC_SITE_URL` and `APP_ORIGIN` in the deployment environment to the actual public HTTPS origin. The name dazzle.bd can be used before its domain is connected; canonical URLs must identify the domain where the site actually runs. Keep indexing disabled until the contact details, business policies, inventory and image rights are ready for launch.

Rewriting copy is not a guarantee of search rankings or of how a search engine identifies related sites. The new content focuses on useful shopping information and avoids fabricated reviews or company history.
