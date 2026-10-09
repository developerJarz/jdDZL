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
    <FormPage crumb="Business enquiries" title="Tell us about the tech your team needs">
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
