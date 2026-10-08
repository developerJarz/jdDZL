import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/AuthForms";
import { AuthShell } from "@/components/auth/AuthShell";
import { getSiteSettings } from "@/services/content";

export const metadata: Metadata = { title: "Create Account | Dazzle", robots: { index: false } };

export default async function RegistrationPage() {
  const site = await getSiteSettings();
  return (
    <AuthShell logo={site.assets.logo} title="Create Your Account" subtitle="Create an Account to Continue">
      <RegisterForm />
    </AuthShell>
  );
}
