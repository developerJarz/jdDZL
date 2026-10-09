The imported product photo collection has been reduced to 383 files. The selection keeps photos for 10 sample products per category and all 183 products referenced by the seed and current database homepage, including hidden brand tabs and product carousels. Homepage preservation takes priority over the category sample limit.

The photo cleanup deleted 725 files from `public/images/products`, approximately 43.21 MiB. Brand logos, category images, banners, store photos, blog images and site artwork remain intact.

The subsequent catalogue reset deleted the corresponding 725 products from the configured database. None had order or purchase references. All 267 remaining database products were set to 10 units each, with changes recorded in the stock ledger. Availability still respects upcoming and discontinued flags. Orders, brands, categories, prices and other product fields were preserved. The seed catalogue now contains 264 products; the other three existing database records belong to the previously hidden merchant service brand.

`src/data/content/product-image-policy.json` records the retained selections, retired file paths, deleted product slugs and initial stock. Content generation reapplies this policy; extraction skips retired image files, and database setup excludes deleted products. Saved cart/order thumbnails use a placeholder for retired photos. New uploads and other external images are unaffected.

`npm run images:prune` previews the selection on an unpruned checkout; `npm run images:prune -- --apply` applies it. Once the policy exists, the command preserves that reviewed selection. Deploy these source changes and file deletions together so the hosted site uses the same policy.

`npm run db:prune-products -- --stock=10` previews a database reset; add `--apply` to execute it. The script creates an ignored `.backups/catalogue-reset-<run-id>.ejson` backup containing the original product records, seed files and policy before applying a MongoDB transaction. Products referenced by orders or purchases are archived rather than deleted. Running this command again deliberately resets stock again; normal setup uses insert-only upserts.
