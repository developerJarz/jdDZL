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
    <FormPage crumb="Support Center" title="Get In Touch">
      <ContactForm
        kind="support"
        fields={[
          { name: "name", label: "Name", placeholder: "Enter your name" },
          { name: "phone", label: "Phone Number", placeholder: "Enter phone number", type: "tel" },
          { name: "email", label: "Email", placeholder: "Enter your email", type: "email" },
          { name: "product", label: "Compare Product", placeholder: "Enter product name", required: false },
          { name: "message", label: "Message", placeholder: "Enter your message", type: "textarea" },
        ]}
      />
    </FormPage>
  );
}
