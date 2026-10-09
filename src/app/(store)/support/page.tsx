import type { Metadata } from "next";
import { ContactForm } from "@/components/forms/ContactForm";
import { FormPage } from "@/components/forms/FormPage";
import { buildMetadata } from "@/lib/seo";
import { getPageMeta } from "@/services/content";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ ...(await getPageMeta("/support")), path: "/support" });
}

export default function SupportPage() {
  return (
    <FormPage crumb="Support" title="Let’s answer your product or order question">
      <ContactForm
        kind="support"
        fields={[
          { name: "name", label: "Name", placeholder: "Enter your name" },
          { name: "phone", label: "Phone Number", placeholder: "Enter phone number", type: "tel" },
          { name: "email", label: "Email", placeholder: "Enter your email", type: "email" },
          { name: "product", label: "Product or order number", placeholder: "The model or order you need help with", required: false },
          { name: "message", label: "How can we help?", placeholder: "Tell us what you would like to know", type: "textarea" },
        ]}
      />
    </FormPage>
  );
}
