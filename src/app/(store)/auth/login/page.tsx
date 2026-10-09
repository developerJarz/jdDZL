import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/AuthForms";
import { AuthShell } from "@/components/auth/AuthShell";
import { getSiteSettings } from "@/services/content";

export const metadata: Metadata = { title: "Login | dazzle.bd", robots: { index: false } };

export default async function LoginPage() {
  const site = await getSiteSettings();
  return (
    <AuthShell logo={site.assets.logo} subtitle="Welcome Back! You've Been Missed!">
      <h1 className="sr-only">Log in</h1>
      <LoginForm />
    </AuthShell>
  );
}
