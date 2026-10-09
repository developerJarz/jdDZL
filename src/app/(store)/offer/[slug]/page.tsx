import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ShowcaseGrid } from "@/components/listing/ShowcaseGrid";
import { CampaignProducts } from "@/components/offers/CampaignProducts";
import { OfferCountdown } from "@/components/offers/OfferCountdown";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Countdown } from "@/components/ui/Countdown";
import { PageSkeleton } from "@/components/ui/Skeletons";
import { buildMetadata } from "@/lib/seo";
import { getShowcase } from "@/services/catalog";
import { getCampaign, getCampaigns, getPageMeta } from "@/services/content";
import { getProductsBySlugs } from "@/services/products";

const FLASH_SALE = "limited-time-offer";

export async function generateStaticParams() {
  const campaigns = await getCampaigns();
  return [{ slug: FLASH_SALE }, { slug: "latest-apple-release-pre-order-campaign" }, ...campaigns.map((c) => ({ slug: c.slug }))].filter(
    (v, i, a) => a.findIndex((x) => x.slug === v.slug) === i,
  );
}

export async function generateMetadata({ params }: PageProps<"/offer/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const meta = await getPageMeta(`/offer/${slug}`);
  const campaign = slug === FLASH_SALE ? null : await getCampaign(slug);
  const title = meta?.title && meta.title !== "dazzle.bd" ? meta.title : campaign?.name ?? "Flash Sale | dazzle.bd";
  return buildMetadata({ title, description: meta?.description || campaign?.description, path: `/offer/${slug}`, image: campaign?.image?.src });
}

export default function OfferDetailPage({ params }: PageProps<"/offer/[slug]">) {
  return (
    <div className="bg-[#fffbf6] dark:bg-[#2e2b28]">
      <Suspense fallback={<PageSkeleton />}>
        <OfferContent params={params} />
      </Suspense>
    </div>
  );
}

async function OfferContent({ params }: { params: PageProps<"/offer/[slug]">["params"] }) {
  const { slug } = await params;

  if (slug === FLASH_SALE) {
    const sale = await getShowcase(slug);
    if (!sale) notFound();
    return (
      <div className="flex flex-col flex-1 max-w-355 mx-auto pb-10">
        <div className="md:px-12.5 px-4">
          <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Offer Products" }]} />
          <div className="bg-[#6d3f0e] px-4 rounded-sm mb-6">
            <div className="w-full flex md:flex-row gap-4 lg:py-6 py-4 justify-between items-center">
              <div className="flex md:flex-row gap-4 items-center flex-wrap">
                <h1 className="md:text-[32px] text-[18px] font-bold text-white hover:text-[#CB843B]">Compare current price reductions</h1>
                {sale.endsAt && <Countdown endsAt={sale.endsAt} />}
              </div>
            </div>
          </div>
          <ShowcaseGrid products={sale.products} />
        </div>
      </div>
    );
  }

  const campaign = await getCampaign(slug);
  if (!campaign) notFound();
  const products = await getProductsBySlugs(campaign.productSlugs);
  return (
    <div className="min-h-screen max-w-355 mx-auto md:px-12.5 px-4 pb-12">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Offer", href: "/offer" }, { label: campaign.name }]} />
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 mt-2">{campaign.name}</h1>
      {campaign.description && <p className="text-sm text-gray-500 dark:text-gray-300 -mt-3 mb-6">{campaign.description}</p>}
      <CampaignProducts products={products} countdown={campaign.endsAt ? <OfferCountdown endsAt={campaign.endsAt} /> : undefined} />
    </div>
  );
}
