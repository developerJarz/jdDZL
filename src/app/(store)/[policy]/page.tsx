import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/Skeletons";
import { buildMetadata } from "@/lib/seo";
import { getCmsPage, getPageMeta, getPolicyContent, getPolicyPages } from "@/services/content";

// CMS policy pages (/privacy-policy, /refund-policy, …). Their text is fetched from the
// reference API at runtime and isn't in the snapshot; see getPolicyContent(). Unknown slugs
// at this level fall through to notFound().

const EXTRA: Record<string, { endpoint: string; title: string }> = {
  "emi-policy": { endpoint: "emi_policy", title: "EMI Policy" },
  "terms-conditions": { endpoint: "terms_conditions", title: "Terms & Conditions" },
};

async function allPolicies() {
  return { ...(await getPolicyPages()), ...EXTRA };
}

export async function generateStaticParams() {
  return Object.keys(await allPolicies()).map((policy) => ({ policy }));
}

export async function generateMetadata({ params }: PageProps<"/[policy]">): Promise<Metadata> {
  const { policy } = await params;
  const [page, cms] = await Promise.all([allPolicies().then((p) => p[policy]), getCmsPage(policy)]);
  if (!page && !cms) return {};
  const meta = await getPageMeta(`/${policy}`);
  return buildMetadata({
    title: cms?.seo?.title || cms?.title || meta?.title || page!.title,
    description: cms?.seo?.description || meta?.description,
    path: `/${policy}`,
  });
}

export default function PolicyPage({ params }: PageProps<"/[policy]">) {
  return (
    <div className="bg-white dark:bg-[#2e2b28]">
      <Suspense fallback={<PageSkeleton />}>
        <Policy params={params} />
      </Suspense>
    </div>
  );
}

async function Policy({ params }: { params: PageProps<"/[policy]">["params"] }) {
  const { policy } = await params;
  // Pages written in the dashboard (including policy pages with the same slug) take priority.
  const [policies, cms] = await Promise.all([allPolicies(), getCmsPage(policy)]);
  const page = cms ? { title: cms.title, endpoint: policy } : policies[policy];
  if (!page) notFound();
  const html = cms ? cms.html : await getPolicyContent(page.endpoint);
  return (
    <div className="max-w-355 mx-auto md:px-15 px-4 py-6 pb-14">
      <h1 className="text-3xl md:text-4xl font-bold text-black dark:text-white mb-8">{page.title}</h1>
      <div className="rounded-2xl bg-[#F7F7F7] dark:bg-[#1a1613] p-6 md:p-8">
        {html ? (
          <div className="cms-content dark-html-content text-[#222] dark:text-white leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-300 py-10 text-center">
            This page hasn&apos;t been written yet. Store staff can publish it from Dashboard → Pages using the slug{" "}
            <code className="text-xs">{policy}</code>.
          </p>
        )}
      </div>
    </div>
  );
}
