import { API_BASE_URL, USE_MOCK_DATA } from "./config";

// API (reference frontend): POST newsletter-subscribe { email }
export async function subscribeNewsletter(email: string): Promise<{ ok: boolean; message: string }> {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, message: "Please enter a valid email address." };
  if (USE_MOCK_DATA) {
    return { ok: false, message: "Newsletter signup needs the commerce API (not configured in this build)." };
  }
  const res = await fetch(`${API_BASE_URL}/newsletter-subscribe`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return res.ok ? { ok: true, message: "Thanks for subscribing!" } : { ok: false, message: "Subscription failed, please try again." };
}
