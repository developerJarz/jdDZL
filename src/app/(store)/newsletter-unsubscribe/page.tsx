import type { Metadata } from "next";
import { NewsletterPreferences } from "@/components/auth/NewsletterPreferences";

export const metadata: Metadata = {
  title: "Newsletter Unsubscribe",
  robots: { index: false },
};

// The reference validates a token from the unsubscribe e-mail link; without one (or without
// the API) the link is reported as invalid, exactly like the live page.
export default function NewsletterUnsubscribePage() {
  return <NewsletterPreferences />;
}
