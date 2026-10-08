import { Breadcrumb } from "@/components/ui/Breadcrumb";

/** White page with breadcrumb + centered heading used by the contact-style forms. */
export function FormPage({ crumb, title, children }: { crumb: string; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-[#2e2b28]">
      <div className="max-w-355 mx-auto px-5 pb-16">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: crumb }]} />
        <h1 className="mt-10 mb-12 text-center text-[28px] md:text-[34px] font-medium text-[#101518] dark:text-white leading-snug max-w-2xl mx-auto">{title}</h1>
        <div className="max-w-[600px] mx-auto">{children}</div>
      </div>
    </div>
  );
}
