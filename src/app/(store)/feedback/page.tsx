import type { Metadata } from "next";
import { ContactForm } from "@/components/forms/ContactForm";
import { FormPage } from "@/components/forms/FormPage";
import { buildMetadata } from "@/lib/seo";
import { getPageMeta } from "@/services/content";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ ...(await getPageMeta("/feedback")), path: "/feedback" });
}

export default function FeedbackPage() {
  return (
    <FormPage crumb="Feedback" title="Help us make your next visit better">
      <ContactForm
        kind="feedback"
        fields={[
          { name: "name", label: "Name", placeholder: "Enter your name" },
          { name: "phone", label: "Phone Number", placeholder: "Enter phone number", type: "tel" },
          { name: "email", label: "Email", placeholder: "Enter your email", type: "email" },
          { name: "subject", label: "Subject", placeholder: "Enter subject" },
          { name: "description", label: "Description", placeholder: "Enter description", type: "textarea" },
        ]}
      />
    </FormPage>
  );
}
