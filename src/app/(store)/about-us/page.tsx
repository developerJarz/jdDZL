import type { Metadata } from "next";
import { SlashBreadcrumb } from "@/components/ui/Breadcrumb";
import { Img } from "@/components/ui/Img";
import { aboutFeatures, aboutIntro, aboutStats, aboutWhy } from "@/data/content/about";
import { buildMetadata } from "@/lib/seo";
import { getPageMeta, getSiteSettings } from "@/services/content";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ ...(await getPageMeta("/about-us")), path: "/about-us" });
}

export default async function AboutPage() {
  const site = await getSiteSettings();
  const [hero, ...gallery] = site.assets.about ?? [];

  return (
    <div className="bg-white dark:bg-[#2E2B28] min-h-screen flex flex-col flex-1 max-w-355 mx-auto">
      <div className="px-4 sm:px-6 pt-5 pb-0">
        <SlashBreadcrumb label="About Us" />
      </div>
      <div className="px-4 sm:px-6 pb-14">
        <div className="w-full flex flex-col justify-center items-center">
          <p className="text-[#c9a230] dark:text-white font-semibold text-[14px] mt-5 mb-1 tracking-wide">{aboutIntro.eyebrow}</p>
          <h1 className="text-[26px] sm:text-[32px] font-extrabold text-gray-900 dark:text-white mb-4 leading-tight">{aboutIntro.title}</h1>
          <div className="text-[14px] text-gray-500 dark:text-white leading-[1.8] mb-8 max-w-full md:w-[50%] w-full flex flex-col items-center text-center">
            <p className="pb-3">{aboutIntro.paragraphs[0]}</p>
            <p>{aboutIntro.paragraphs[1]}</p>
          </div>
        </div>
        {hero && (
          <div className="w-full rounded-xl overflow-hidden mb-5 shadow-sm">
            <div className="relative w-full" style={{ paddingBottom: "52%" }}>
              <Img asset={hero} alt="dazzle.bd Store Front" fill sizes="(max-width: 768px) 100vw, 900px" className="object-cover" />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-[54px] mb-[20px]">
          {aboutStats.map((s) => (
            <div
              key={s.value}
              className={"flex flex-col items-center justify-center text-center border p-6 border-[#2222] rounded-md " + (s.wide ? "bg-gray-50 col-span-2 sm:col-span-1" : "bg-white")}
            >
              <span className="text-2xl font-semibold text-[#CB843B] leading-tight">{s.value}</span>
              <span className="mt-[14px] md:mt-[15px] mb-[6px] text-[14px] text-black md:text-[16px] font-semibold">{s.label}</span>
              {s.text && <p className="text-center text-[8px] md:text-[12px] text-black/60 md:mx-7 font-medium leading-[21.6px]">{s.text}</p>}
            </div>
          ))}
        </div>

        <div className="w-full flex flex-col justify-center items-center">
          <p className="text-[#c9a230] dark:text-white font-semibold text-[14px] mt-5 mb-1 tracking-wide">{aboutWhy.eyebrow}</p>
          <h2 className="text-[26px] sm:text-[32px] font-extrabold text-gray-900 dark:text-white mb-4 leading-tight text-center">{aboutWhy.title}</h2>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-[1.8] mb-8 max-w-full text-center">{aboutWhy.text}</p>
        </div>
        {gallery.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            {gallery.map((g, i) => (
              <div key={i} className="relative w-full rounded-xl overflow-hidden bg-gray-100 shadow-sm" style={{ paddingBottom: "110%" }}>
                <Img asset={g} alt="dazzle.bd Happy Customer" fill sizes="(max-width: 640px) 100vw, 450px" className="object-cover object-top" />
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-[54px] mb-[20px]">
          {aboutFeatures.map((f) => (
            <div key={f.title} className="flex flex-col bg-white items-center justify-center text-center border p-6 border-[#2222] rounded-md">
              <h3 className="mt-[14px] md:mt-[15px] mb-[6px] text-[14px] text-black md:text-[16px] font-semibold">{f.title}</h3>
              <p className="text-center text-[8px] md:text-[12px] text-black/60 md:mx-7 font-medium leading-[21.6px]">{f.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
