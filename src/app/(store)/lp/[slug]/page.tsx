import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Img } from "@/components/ui/Img";
import { Countdown } from "@/components/ui/Countdown";
import { QuickOrderForm } from "@/components/landing/QuickOrderForm";
import { buildMetadata } from "@/lib/seo";
import { markdownToHtml } from "@/lib/markdown";
import { liveLanding } from "@/server/catalog";
import { getProductsBySlugs } from "@/services/products";
import { getStoreSettings } from "@/server/integrations/config";
import type { LandingBlock } from "@/server/ops-schemas";
import type { VariantGroup } from "@/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await liveLanding(slug);
  if (!page) return {};
  return buildMetadata({ title: page.seo?.title || page.title, description: page.seo?.description, path: `/lp/${slug}` });
}

const youtubeId = (url: string) => /(?:v=|youtu\.be\/|embed\/)([\w-]{11})/.exec(url)?.[1];

export default async function LandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await liveLanding(slug);
  if (!page) notFound();
  const [products, store] = await Promise.all([getProductsBySlugs(page.productSlugs ?? []), getStoreSettings()]);
  const blocks = (page.blocks ?? []) as LandingBlock[];
  const accent = page.accent || "#cb843b";
  const order = blocks.find((b) => b.type === "order");
  const formProducts = products.map((p) => ({
    slug: p.slug,
    name: p.name,
    price: p.price,
    regularPrice: p.regularPrice,
    image: p.image,
    inStock: p.inStock,
    variants: (p as typeof p & { variants?: VariantGroup[] }).variants,
  }));
  const section = "max-w-5xl mx-auto px-4 sm:px-6";
  return (
    <div className="bg-[#fffbf6] dark:bg-[#2e2b28] pb-16" style={{ ["--lp" as string]: accent }}>
      {blocks.map((block) => {
        switch (block.type) {
          case "hero":
            return (
              <section key={block.id} className="bg-[linear-gradient(135deg,#3b2209_0%,#6d3f0e_50%,var(--lp)_100%)] text-white">
                <div className={`${section} grid md:grid-cols-2 gap-8 items-center py-12 md:py-16`}>
                  <div>
                    <h1 className="text-3xl md:text-5xl font-extrabold leading-tight">{block.heading || page.title}</h1>
                    {block.subheading && <p className="mt-4 text-white/85 text-lg whitespace-pre-line">{block.subheading}</p>}
                    {order && (
                      <a href="#order" className="inline-block mt-7 rounded-full bg-white text-[#4b2c0a] font-bold px-7 py-3.5 shadow-lg hover:bg-[#fff6ea]">
                        {block.ctaLabel || "Order now"}
                      </a>
                    )}
                  </div>
                  {(block.image || products[0]?.image) && (
                    <div className="relative aspect-square rounded-3xl bg-white/10 p-6">
                      <Img asset={block.image ?? products[0].image} alt={block.heading || page.title} fill sizes="(max-width: 768px) 90vw, 45vw" className="object-contain p-4" priority />
                    </div>
                  )}
                </div>
              </section>
            );
          case "text":
            return (
              <section key={block.id} className={`${section} py-10`}>
                {block.heading && <h2 className="text-2xl md:text-3xl font-bold mb-4 text-[#222] dark:text-white">{block.heading}</h2>}
                <div className="cms-content dark-html-content text-[#333] dark:text-gray-200 leading-relaxed" dangerouslySetInnerHTML={{ __html: markdownToHtml(block.body) }} />
              </section>
            );
          case "features":
            return (
              <section key={block.id} className={`${section} py-10`}>
                {block.heading && <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center text-[#222] dark:text-white">{block.heading}</h2>}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {block.items.map((item, i) => (
                    <div key={i} className="rounded-2xl bg-white dark:bg-[#25221f] border border-[#f0e4d6] dark:border-[#3a2f28] p-5">
                      <span className="flex size-9 items-center justify-center rounded-full text-white font-bold mb-3" style={{ background: accent }}>
                        ✓
                      </span>
                      <h3 className="font-bold text-[#222] dark:text-white">{item.title}</h3>
                      {item.text && <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{item.text}</p>}
                    </div>
                  ))}
                </div>
              </section>
            );
          case "gallery":
            return (
              <section key={block.id} className={`${section} py-10`}>
                {block.heading && <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center text-[#222] dark:text-white">{block.heading}</h2>}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {block.images.map((img, i) => (
                    <div key={i} className="relative aspect-square rounded-2xl overflow-hidden bg-white">
                      <Img asset={img} alt="" fill sizes="(max-width: 768px) 50vw, 33vw" className="object-contain p-3" />
                    </div>
                  ))}
                </div>
              </section>
            );
          case "video": {
            const id = youtubeId(block.url);
            return id ? (
              <section key={block.id} className={`${section} py-10`}>
                {block.heading && <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center text-[#222] dark:text-white">{block.heading}</h2>}
                <div className="relative aspect-video rounded-2xl overflow-hidden shadow-lg">
                  <iframe className="absolute inset-0 size-full" src={`https://www.youtube-nocookie.com/embed/${id}`} title={block.heading || "Video"} allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen />
                </div>
              </section>
            ) : null;
          }
          case "testimonials":
            return (
              <section key={block.id} className={`${section} py-10`}>
                {block.heading && <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center text-[#222] dark:text-white">{block.heading}</h2>}
                <div className="grid md:grid-cols-3 gap-4">
                  {block.items.map((t, i) => (
                    <figure key={i} className="rounded-2xl bg-white dark:bg-[#25221f] border border-[#f0e4d6] dark:border-[#3a2f28] p-5">
                      <blockquote className="text-sm text-gray-700 dark:text-gray-200">“{t.text}”</blockquote>
                      <figcaption className="mt-3 text-sm font-bold" style={{ color: accent }}>
                        — {t.name}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </section>
            );
          case "faq":
            return (
              <section key={block.id} className={`${section} py-10`}>
                {block.heading && <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center text-[#222] dark:text-white">{block.heading}</h2>}
                <div className="space-y-2">
                  {block.items.map((f, i) => (
                    <details key={i} className="rounded-xl bg-white dark:bg-[#25221f] border border-[#f0e4d6] dark:border-[#3a2f28] px-5 py-4">
                      <summary className="cursor-pointer font-semibold text-[#222] dark:text-white">{f.q}</summary>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">{f.a}</p>
                    </details>
                  ))}
                </div>
              </section>
            );
          case "countdown":
            return block.endsAt && new Date(block.endsAt) > new Date() ? (
              <section key={block.id} className="py-8" style={{ background: accent }}>
                <div className={`${section} flex flex-col sm:flex-row items-center justify-center gap-4 text-white`}>
                  <p className="text-xl font-bold">{block.heading || "Offer ends in"}</p>
                  <Countdown endsAt={block.endsAt} />
                </div>
              </section>
            ) : null;
          case "products":
            return (
              <section key={block.id} className={`${section} py-10`}>
                {block.heading && <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center text-[#222] dark:text-white">{block.heading}</h2>}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {products.map((p) => (
                    <div key={p.slug} className="rounded-2xl bg-white dark:bg-[#25221f] border border-[#f0e4d6] dark:border-[#3a2f28] p-4 text-center">
                      <div className="relative aspect-square">
                        <Img asset={p.image} alt={p.name} fill sizes="(max-width: 768px) 45vw, 30vw" className="object-contain p-2" />
                      </div>
                      <p className="mt-3 text-sm font-semibold line-clamp-2 text-[#222] dark:text-white">{p.name}</p>
                      <p className="mt-1 font-extrabold" style={{ color: accent }}>
                        ৳{p.price.toLocaleString("en-BD")}
                        {p.regularPrice > p.price && <s className="ml-2 text-xs font-normal text-gray-400">৳{p.regularPrice.toLocaleString("en-BD")}</s>}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            );
          case "order":
            return (
              <section key={block.id} id="order" className={`${section} py-10 scroll-mt-24`}>
                <QuickOrderForm
                  slug={slug}
                  heading={block.heading || "Place your order"}
                  buttonLabel={block.buttonLabel || "Confirm order"}
                  note={block.note}
                  accent={accent}
                  products={formProducts}
                  zones={store.shippingZones}
                  insideFee={store.shippingFee}
                  outsideFee={store.outsideDhakaFee}
                  freeAbove={store.freeShippingAbove}
                />
              </section>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
