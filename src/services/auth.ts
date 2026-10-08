import { API_BASE_URL, USE_MOCK_DATA } from "./config";

// Authentication is handled by the reference backend (session cookie + tokenized APIs).
// Nothing auth-related was captured in the snapshot, so in mock mode every call resolves to
// a clear "not configured" result instead of pretending a user signed in.

export interface AuthResult {
  ok: boolean;
  message: string;
  /** Account role returned by the login API ("customer", "staff", or "admin"). */
  role?: string;
}

const NOT_CONFIGURED: AuthResult = {
  ok: false,
  message: "Sign-in requires the store's account API, which isn't configured in this build.",
};

async function post(path: string, body: unknown): Promise<AuthResult> {
  if (USE_MOCK_DATA) return NOT_CONFIGURED;
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as { message?: string; role?: string };
    return { ok: res.ok, message: data.message ?? (res.ok ? "Success" : "Request failed"), role: data.role };
  } catch {
    return { ok: false, message: "Network error, please try again." };
  }
}

export const login = (username: string, password: string) => post("/auth/login", { username, password });
export const requestOtp = (phone: string) => post("/auth/otp", { phone });
export const register = (data: { name: string; email: string; phone: string; password: string }) => post("/auth/register", data);
export const requestPasswordReset = (username: string) => post("/auth/forget-password", { username });

export const isValidBdPhone = (v: string) => /^01[3-9]\d{8}$/.test(v.replace(/\s|-/g, ""));
export const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
