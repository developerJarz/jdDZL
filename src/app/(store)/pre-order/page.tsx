import type { Metadata } from "next";
import { PreOrderForm } from "@/components/forms/ContactForm";
import { buildMetadata } from "@/lib/seo";
import { getPageMeta } from "@/services/content";

export async function generateMetadata(): Promise<Metadata> {
  const meta = await getPageMeta("/pre-order");
  return buildMetadata({ title: meta?.title && meta.title !== "dazzle.bd" ? meta.title : "Pre-Order | dazzle.bd", description: meta?.description, path: "/pre-order" });
}

export default function PreOrderPage() {
  return (
    <div className="bg-[#fffbf6] dark:bg-[#2e2b28] px-4 pt-12 pb-16">
      <div className="max-w-[500px] mx-auto">
        <h1 className="text-center text-2xl font-bold text-[#101518] dark:text-white">Have a particular device in mind?</h1>
        <p className="text-center text-sm text-[#B57908] mt-2 mb-8">Share the model and configuration you need. This enquiry does not reserve stock or confirm a price.</p>
        <PreOrderForm />
      </div>
    </div>
  );
}
