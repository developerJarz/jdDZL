import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MapIcon } from "@/components/icons";
import { mapsUrl } from "@/lib/maps";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Img } from "@/components/ui/Img";
import { PageSkeleton } from "@/components/ui/Skeletons";
import { buildMetadata } from "@/lib/seo";
import { getPageMeta, getStore, getStores } from "@/services/content";

export async function generateStaticParams() {
  return (await getStores()).items.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/shop-location/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [store, meta] = await Promise.all([getStore(slug), getPageMeta(`/shop-location/${slug}`)]);
  if (!store) return {};
  return buildMetadata({ title: meta?.title || `${store.name} Store`, description: meta?.description || store.address, path: `/shop-location/${slug}`, image: store.image?.src });
}

export default function StorePage({ params }: PageProps<"/shop-location/[slug]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <StoreDetail params={params} />
    </Suspense>
  );
}

async function StoreDetail({ params }: { params: PageProps<"/shop-location/[slug]">["params"] }) {
  const { slug } = await params;
  const store = await getStore(slug);
  if (!store) notFound();
  const title = store.detailName ?? store.name;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: title,
    address: store.address,
    telephone: store.phone || undefined,
    email: store.email || undefined,
    openingHours: store.openHours || undefined,
    geo: store.lat && store.lng ? { "@type": "GeoCoordinates", latitude: store.lat, longitude: store.lng } : undefined,
  };

  return (
    <div className="pb-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="max-w-355 mx-auto md:px-12.5 px-4">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Shop", href: "/shop-location" }, { label: title }]} />
      </div>
      <div className="max-w-360 mx-auto px-4 lg:px-11 grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
        <div className="relative w-full aspect-[658/384] rounded-2xl overflow-hidden bg-gray-100">
          <Img asset={store.gallery[0] ?? store.image} alt={title} fill priority sizes="(max-width: 768px) 100vw, 660px" className="object-cover" />
        </div>
        <div>
          <a
            href={mapsUrl(store)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 border border-[#6D3F0E] text-black dark:text-white font-medium px-4 py-2.5 rounded-[27px]"
          >
            <MapIcon />
            View Map
          </a>
          <h1 className="mt-4 text-xl font-semibold text-[#222] dark:text-white">{title}</h1>
          <p className="mt-3 text-[#5c3a1e] dark:text-gray-300">{store.address}</p>
          <dl className="mt-6 grid grid-cols-[auto_auto] justify-start gap-x-10 gap-y-5">
            <div>
              <dt className="text-sm uppercase text-[#5c3a1e] dark:text-gray-400">Day Off</dt>
              <dd className="mt-1 font-medium text-[#222] dark:text-white">{store.dayOff || "—"}</dd>
            </div>
            <div>
              <dt className="text-sm uppercase text-[#5c3a1e] dark:text-gray-400">Contact</dt>
              <dd className="mt-1 font-medium text-[#6D3F0E] dark:text-[#D89B5C]">{store.phone ? <a href={`tel:${store.phone}`}>{store.phone}</a> : "—"}</dd>
            </div>
            <div>
              <dt className="text-sm uppercase text-[#5c3a1e] dark:text-gray-400">Open Day</dt>
              <dd className="mt-1 font-medium text-[#222] dark:text-white">{store.openHours || "—"}</dd>
            </div>
            <div>
              <dt className="text-sm uppercase text-[#5c3a1e] dark:text-gray-400">Email</dt>
              <dd className="mt-1 text-sm text-[#6D3F0E] dark:text-[#D89B5C]">{store.email ? <a href={`mailto:${store.email}`}>{store.email}</a> : "—"}</dd>
            </div>
          </dl>
          {store.descriptionHtml && <div className="cms-content mt-6 text-sm text-[#5c3a1e] dark:text-gray-300" dangerouslySetInnerHTML={{ __html: store.descriptionHtml }} />}
        </div>
      </div>
      <section className="mt-6 mx-2.5 bg-[#5c3a1e] px-8 py-12" aria-labelledby="reviews-heading">
        <h2 id="reviews-heading" className="text-white text-xl font-bold">
          Customer Reviews
        </h2>
        <p className="text-center text-white/70 text-sm py-12">No reviews yet.</p>
      </section>
    </div>
  );
}
