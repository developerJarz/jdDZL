import type { Metadata } from "next";
import { ContactForm } from "@/components/forms/ContactForm";
import { FormPage } from "@/components/forms/FormPage";
import { buildMetadata } from "@/lib/seo";
import { getPageMeta } from "@/services/content";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ ...(await getPageMeta("/corporate")), path: "/corporate" });
}

export default function CorporatePage() {
  return (
    <FormPage crumb="Corporate" title="Integrate Smartphones & Gadgets for Corporate Connectivity">
      <ContactForm
        kind="corporate"
        fields={[
          { name: "company", label: "Company Name", placeholder: "Enter your company name" },
          { name: "meetingDate", label: "Meeting Date", placeholder: "mm/dd/yyyy", type: "date" },
          { name: "phone", label: "Phone Number", placeholder: "Enter phone number", type: "tel" },
          { name: "email", label: "Email", placeholder: "Enter your email", type: "email" },
        ]}
      />
    </FormPage>
  );
}
