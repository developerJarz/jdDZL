"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, BarChart3, Eye, EyeOff, LayoutTemplate, Lock, PackagePlus } from "lucide-react";
import { api } from "./lib/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/controls";
import { ErrorNote, Spinner } from "./shared/kit";

export function AdminLogin() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState(
    params.get("error") === "database" ? "The store database is unreachable right now. Check the connection and try again." : "",
  );
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="bg-brand-gradient relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -right-24 -bottom-24 size-[420px] rounded-full bg-[#e9ccae]/15 blur-3xl" />
        <Link href="/" className="relative bg-[linear-gradient(90deg,#fff,#f3dcc0_60%,#e0a462)] bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">
          dazzle<sup className="text-sm">®</sup>
        </Link>
        <div className="relative my-auto max-w-lg">
          <p className="text-[11px] font-bold tracking-[0.22em] text-[#f3dcc0] uppercase">Commerce admin</p>
          <h1 className="mt-4 text-5xl leading-[1.05] font-extrabold tracking-tight">
            Run the whole store
            <br />
            <span className="text-[#f3dcc0]">from one place.</span>
          </h1>
          <ul className="mt-10 space-y-4 text-sm text-white/80">
            {[
              { icon: BarChart3, text: "Live revenue, orders, and inventory analytics" },
              { icon: PackagePlus, text: "Rich product uploads with galleries, variants, and specs" },
              { icon: LayoutTemplate, text: "Drag-and-drop homepage builder" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-white/10">
                  <Icon className="size-4 text-[#f3dcc0]" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/50">© {new Date().getFullYear()} Dazzle Commerce</p>
      </section>
      <section className="flex items-center justify-center px-5 py-12">
        <form
          className="grid w-full max-w-sm gap-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const form = new FormData(e.currentTarget);
            try {
              const result = await api<{ role: string }>("auth/login", {
                method: "POST",
                body: JSON.stringify({ username: form.get("email"), password: form.get("password") }),
              });
              if (result.role !== "admin" && result.role !== "staff") {
                await api("auth/logout", { method: "POST" });
                throw new Error("This account does not have administrator access.");
              }
              router.push("/admin");
              router.refresh();
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div>
            <span className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#e9ccae_0%,#cb843b_55%,#8a5214_100%)] text-xl font-black text-[#1c1309] shadow-lg lg:hidden">
              d
            </span>
            <p className="text-[11px] font-bold tracking-[0.2em] text-brand uppercase">Welcome back</p>
            <h2 className="mt-1.5 text-3xl font-extrabold tracking-tight">Sign in to your workspace</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">Use your administrator account to continue.</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email address</Label>
            <Input id="email" name="email" type="email" autoComplete="username" required placeholder="you@yourstore.com" className="h-11" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input id="password" name="password" type={show ? "text" : "password"} autoComplete="current-password" required placeholder="Enter your password" className="h-11 pr-11" />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Hide password" : "Show password"}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <ErrorNote message={error} />
          <Button variant="brand" size="lg" disabled={busy}>
            {busy ? <Spinner /> : <Lock />} {busy ? "Signing in…" : "Sign in to dashboard"}
          </Button>
          <Link href="/" className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3.5" /> Back to storefront
          </Link>
        </form>
      </section>
    </main>
  );
}
