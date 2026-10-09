import Link from "next/link";
import { footerColumns } from "@/data/navigation";
import type { SiteSettings } from "@/types";
import { FacebookIcon, FooterCurve, InstagramIcon, LinkedinIcon, YoutubeIcon } from "@/components/icons";
import { Img } from "@/components/ui/Img";
import { NewsletterForm } from "./NewsletterForm";
import { BranchList } from "./BranchList";

/** Splits the CMS "footerText" ("Branch 1: …\n\nBranch 2: …") into entries. */
function parseBranches(text: string) {
  return text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = l.match(/^Branch\s*(\d+)\s*:\s*(.*)$/i);
      return m ? { n: m[1], text: m[2] } : { n: "", text: l };
    });
}

const glyph = (d: string) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d={d} />
  </svg>
);
const TiktokIcon = () => glyph("M16.6 5.8A4.3 4.3 0 0 1 15.5 3h-3.1v12.4a2.6 2.6 0 1 1-2.6-2.6c.3 0 .5 0 .8.1V9.7a5.8 5.8 0 1 0 5 5.7V9.1a7.4 7.4 0 0 0 4.3 1.4V7.4a4.3 4.3 0 0 1-3.3-1.6Z");
const XIcon = () => glyph("M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z");
const MessengerIcon = () => glyph("M12 2C6.4 2 2 6.1 2 11.7c0 2.9 1.2 5.5 3.2 7.3V22l3-1.6c.9.2 1.8.4 2.8.4 5.6 0 10-4.1 10-9.7S17.6 2 12 2Zm1 12.9-2.6-2.7-5 2.7 5.5-5.8 2.6 2.7 4.9-2.7-5.4 5.8Z");

export function Footer({ site, extraLinks = [] }: { site: SiteSettings; extraLinks?: { label: string; href: string }[] }) {
  const branches = parseBranches(site.branchesText);
  const intro = "Tech that fits your day. Explore phones, laptops and everyday gadgets, compare your shortlist and find a setup that works for you.";
  const social = [
    { href: site.social.facebook, label: "Facebook", icon: <FacebookIcon /> },
    { href: site.social.instagram, label: "Instagram", icon: <InstagramIcon /> },
    { href: site.social.linkedin, label: "LinkedIn", icon: <LinkedinIcon /> },
    { href: site.social.youtube, label: "YouTube", icon: <YoutubeIcon /> },
    { href: site.social.tiktok, label: "TikTok", icon: <TiktokIcon /> },
    { href: site.social.twitter, label: "X", icon: <XIcon /> },
    { href: site.social.messenger, label: "Messenger", icon: <MessengerIcon /> },
  ].filter((s) => s.href);
  // Pages published from the dashboard with "show in footer" join the Company column.
  const columns = footerColumns.map((col, i) =>
    i === 0 ? { ...col, links: [...col.links, ...extraLinks.filter((l) => !col.links.some((c) => c.href === l.href))] } : col,
  );

  return (
    <div className="overflow-hidden bg-[#fffbf6] dark:bg-[#2e2b28]">
      <footer className="relative mt-10! max-w-355 mx-auto">
        <div className="mx-3.75">
          <div className="relative z-10 mx-auto max-w-4xl rounded-[28px] bg-background px-4 py-6 sm:px-6 sm:py-8 shadow-lg md:px-10">
            <div className="text-center">
              <h2 className="text-sm sm:text-lg lg:text-2xl font-semibold tracking-wide text-primary">Keep a little tech inspiration in your inbox</h2>
              <p className="mt-2 text-sm text-gray-500">Sign up for buying ideas, catalogue updates and news from dazzle.bd.</p>
            </div>
            <NewsletterForm />
          </div>
        </div>
        <div className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[950px] rounded-full bg-[#E9CCAE5C] opacity-40 blur-[500px] pointer-events-none lg:hidden block" />
        <Img asset={site.assets.footerShadow} alt="" aria-hidden className="absolute bottom-0 lg:block hidden pointer-events-none" sizes="1440px" />
        <div className="-mt-20 sm:-mt-30 rounded-t-4xl bg-[#101518] px-4 pb-8 pt-28 sm:pt-40 text-white sm:px-6 md:px-10 lg:px-16">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 sm:gap-10 lg:gap-15 relative z-10">
            <div className="md:col-span-4 lg:col-span-3">
              <Link href="/" aria-label={`${site.name} home`}>
                <Img asset={site.assets.logo} alt="Footer Logo" width={150} height={31} className="h-auto" />
              </Link>
              <p className="mt-6 text-sm leading-7 text-gray-300">{intro}</p>
              <div className="mt-4 sm:mt-6 flex flex-wrap gap-2 sm:gap-3">
                {social.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${site.name} on ${s.label}`}
                    className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-[#222222DB] text-sm cursor-pointer hover:bg-[#2f2f2f]"
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
              <Link href="/support" className="mt-6 inline-block text-sm text-[#e9b865] underline underline-offset-4">Talk to us about your next device</Link>
            </div>
            <div className="md:col-span-8 lg:col-span-9">
              <div className="grid gap-6 sm:gap-8 lg:gap-10 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {columns.map((col) => (
                  <div key={col.title} className="relative z-10">
                    <h3 className="mb-5 border-b border-gray-800 pb-3 text-base font-medium">{col.title}</h3>
                    <ul className="space-y-4 text-sm text-gray-300">
                      {col.links.map((l) => (
                        <li key={l.href} className="transition hover:text-[#ba975f]">
                          <Link href={l.href} className="transition hover:text-[#ba975f]">
                            {l.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                <div className="relative z-10">
                  <h3 className="mb-5 border-b border-gray-800 pb-3 text-base font-medium">Let’s find your next device</h3>
                  <p className="text-sm leading-7 text-gray-300">Have a model in mind? Send its name and the configuration you need.</p>
                  {site.email && <a className="mt-4 block text-sm text-[#e9b865]" href={`mailto:${site.email}`}>{site.email}</a>}
                  {site.phone && <a className="mt-3 block text-sm text-[#e9b865]" href={`tel:${site.phone}`}>{site.phone}</a>}
                  {site.address && <p className="mt-4 text-sm leading-7 text-gray-300">{site.address}</p>}
                  {branches.length > 0 && <BranchList branches={branches} />}
                </div>
              </div>
            </div>
          </div>
          <div className="md:mt-12 pt-6 text-center text-sm text-gray-400 relative z-10">
            <div className="hidden md:block">
              <FooterCurve />
            </div>
            <span className="p-5 block lg:w-[50%] m-auto md:-mt-7.5 pb-18 md:pb-0 text-[#C6C6C6]">{site.copyright}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
