import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/AuthForms";
import { AuthShell } from "@/components/auth/AuthShell";
import { getSiteSettings } from "@/services/content";

export const metadata: Metadata = { title: "Forgot Password | dazzle.bd", robots: { index: false } };

export default async function ForgotPasswordPage() {
  const site = await getSiteSettings();
  return (
    <AuthShell logo={site.assets.logo} title="Recover your account" subtitle="Ask our store team to verify your account and help you reset your password">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
