import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { OfferCountdown } from "@/components/offers/OfferCountdown";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Img } from "@/components/ui/Img";
import { buildMetadata } from "@/lib/seo";
import { getCampaigns, getPageMeta } from "@/services/content";

export async function generateMetadata(): Promise<Metadata> {
  const meta = await getPageMeta("/offer");
  return buildMetadata({ ...meta, path: "/offer" });
}

export default async function OffersPage() {
  const campaigns = (await getCampaigns()).filter((c) => c.active);
  return (
    <div className="min-h-screen py-5 px-4 bg-[#fffbf6] dark:bg-[#2e2b28]">
      <div className="max-w-355 mx-auto">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Offer" }]} />
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">Latest Offers</h1>
        {campaigns.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {campaigns.map((c) => {
              const href = `/offer/${c.slug}`;
              return (
                <article
                  key={c.id}
                  className="bg-white dark:bg-[#1c1917] shadow-[0px_0px_32px_0px_#0000001A] rounded-3xl px-[22px] py-[19px] border border-[#F2F2F2] dark:border-white/5 overflow-hidden flex flex-col"
                >
                  <Link href={href} className="block relative w-full h-44 rounded-2xl overflow-hidden bg-gray-100">
                    <Img asset={c.image} alt={c.name} fill sizes="(max-width: 640px) 100vw, 320px" className="object-cover" />
                  </Link>
                  <div className="mt-5 flex flex-col gap-4 flex-1">
                    <OfferCountdown endsAt={c.endsAt} />
                    <Link href={href} className="text-[#000000] dark:text-white font-semibold line-clamp-2">
                      {c.name}
                    </Link>
                    <Link href={href}>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">{c.description}</p>
                    </Link>
                    <Link
                      href={href}
                      className="flex items-center justify-between bg-[#222222] text-white rounded-[14px] px-[15px] py-3.5 text-sm font-semibold tracking-widest hover:bg-[#222222]/90 transition-colors uppercase mt-auto"
                    >
                      See Details
                      <span className="w-6 h-6 rounded-full border border-[#FACC15] flex items-center justify-center">
                        <ArrowRightIcon />
                      </span>
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="py-16 text-center text-gray-500">No running offers right now.</p>
        )}
      </div>
    </div>
  );
}
