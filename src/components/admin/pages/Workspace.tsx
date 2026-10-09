"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, CheckCircle2, ClipboardList, RefreshCw, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { api, date, send, useApi } from "../lib/api";
import { useCan } from "../lib/me";
import { NAV_ITEMS } from "../AdminShell";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { EmptyState, ErrorNote, Field, PageHeader, Spinner, StatusBadge } from "../shared/kit";

interface WorkspaceData {
  profile: { name: string; email: string; phone: string; staffRole: string; role: string };
  queues: { id: string; label: string; count: number; href: string; description: string }[];
  assigned: { orderNo: string; status: string; createdAt: string }[];
}

export function WorkspacePage() {
  const { me, section: allowed } = useCan();
  const { data, error, loading, reload } = useApi<WorkspaceData>("admin/workspace");
  useEffect(() => {
    const refresh = () => { if (!document.hidden) reload(); };
    const interval = setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    return () => { clearInterval(interval); window.removeEventListener("focus", refresh); };
  }, [reload]);
  const areas = NAV_ITEMS.filter(item => allowed(item.name) && !["workspace", "profile"].includes(item.name));
  return <>
    <PageHeader eyebrow="Your staff workspace" title={`Welcome back, ${me?.name.split(" ")[0] || "team"}.`} description="Your work queues, assigned orders and tools in one place." actions={<Button variant="outline" onClick={reload} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} /> Refresh workspace</Button>} />
    <ErrorNote message={error} onRetry={reload} />
    <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm">
      <ShieldCheck className="size-5 text-brand" aria-hidden="true" /><strong>{data?.profile.staffRole || me?.staffRole}</strong>
      <span className="text-muted-foreground">Signed in as {me?.email}</span>
      <Button variant="ghost" size="sm" asChild className="ml-auto"><Link href="/admin/profile"><UserRound /> My profile & security</Link></Button>
    </div>
    {loading && !data && <p role="status" className="py-8 text-muted-foreground">Loading your work queues…</p>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {data?.queues.map(queue => <Link key={queue.id} href={queue.href} className="group rounded-xl border bg-card p-5 transition hover:border-brand/60 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-ring">
        <div className="flex items-center justify-between text-sm font-semibold">{queue.label}<ArrowUpRight className="size-4 text-muted-foreground group-hover:text-brand" aria-hidden="true" /></div>
        <p className="my-3 text-4xl font-bold tabular-nums">{queue.count}</p><p className="text-sm text-muted-foreground">{queue.description}</p>
      </Link>)}
    </div>
    <div className="mt-6 grid items-start gap-6 xl:grid-cols-2">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><ClipboardList className="size-5 text-brand" />Assigned orders</CardTitle></CardHeader><CardContent>
        {data?.assigned.length ? <div className="grid gap-3">{data.assigned.map(order => <Link key={order.orderNo} href={`/admin/orders?q=${encodeURIComponent(order.orderNo)}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 hover:bg-muted/40"><div><strong className="text-sm">{order.orderNo}</strong><p className="mt-1 text-xs text-muted-foreground">{date(order.createdAt)}</p></div><StatusBadge value={order.status} /></Link>)}</div>
          : <EmptyState icon={CheckCircle2} title="No assigned orders right now" description={allowed("orders") ? "Orders assigned to you by the store manager will appear here." : "Your work queues appear above for the areas you can access."} />}
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Your tools</CardTitle></CardHeader><CardContent className="grid gap-2 sm:grid-cols-2">
        {areas.map(item => <Link key={item.name} href={`/admin/${item.name}`} className="flex items-center gap-3 rounded-lg border px-3 py-3 text-sm font-semibold hover:bg-muted/40"><item.icon className="size-4 text-brand" aria-hidden="true" />{item.label}<ArrowUpRight className="ml-auto size-3.5 text-muted-foreground" aria-hidden="true" /></Link>)}
        {!areas.length && <p className="text-sm text-muted-foreground">Ask the store owner to assign the tools you need. Your profile is available below.</p>}
      </CardContent></Card>
    </div>
  </>;
}

export function StaffProfilePage() {
  const router = useRouter();
  const { me } = useCan();
  const { data, error, reload } = useApi<WorkspaceData>("admin/workspace");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const save = async (path: string, input: unknown, success: string) => {
    setBusy(true); setMessage("");
    try { await send(path, input); toast.success(success); reload(); router.refresh(); return true; }
    catch (e) { setMessage((e as Error).message); return false; }
    finally { setBusy(false); }
  };
  return <>
    <PageHeader eyebrow="Your account" title="Profile & security" description="Update your contact details and manage your password." />
    <ErrorNote message={error || message} onRetry={error ? reload : undefined} />
    {!data ? <p role="status">Loading your profile…</p> : <div className="grid items-start gap-6 lg:grid-cols-2">
      <Card><CardHeader><CardTitle>Personal information</CardTitle></CardHeader><CardContent>
        <form key={data.profile.name + data.profile.phone} className="grid gap-4" onSubmit={async event => { event.preventDefault(); await save("account/profile", Object.fromEntries(new FormData(event.currentTarget)), "Profile updated."); }}>
          <Field label="Full name"><Input name="name" defaultValue={data.profile.name} minLength={2} maxLength={180} required autoComplete="name" /></Field>
          <Field label="Mobile number" hint="Optional Bangladesh mobile number."><Input name="phone" type="tel" defaultValue={data.profile.phone} autoComplete="tel" pattern={"(\\+?88)?01[3-9][0-9]{8}"} /></Field>
          <Field label="Email address"><Input value={data.profile.email} readOnly /></Field>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"><Badge variant="brand">{data.profile.staffRole}</Badge><span>Your role and permissions are managed by the store owner.</span></div>
          <Button variant="brand" disabled={busy}>{busy && <Spinner />}Save profile</Button>
        </form>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Change password</CardTitle></CardHeader><CardContent>
        <form className="grid gap-4" onSubmit={async event => { event.preventDefault(); const form = event.currentTarget; const values = new FormData(form); if (values.get("password") !== values.get("confirm")) { setMessage("New passwords do not match."); return; } if (await save("auth/password", { currentPassword: values.get("currentPassword"), password: values.get("password") }, "Password changed. Other sessions were signed out.")) form.reset(); }}>
          <Field label="Current password"><Input name="currentPassword" type="password" required maxLength={72} autoComplete="current-password" /></Field>
          <Field label="New password" hint="Use at least 8 characters."><Input name="password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" /></Field>
          <Field label="Confirm new password"><Input name="confirm" type="password" required minLength={8} maxLength={72} autoComplete="new-password" /></Field>
          <Button variant="brand" disabled={busy}>{busy && <Spinner />}Update password</Button>
        </form>
        <p className="mt-4 text-sm text-muted-foreground">Changing your password signs out your other sessions. You will stay signed in here.</p>
      </CardContent></Card>
    </div>}
    <p className="mt-6 text-xs text-muted-foreground">Account: {me?.email}</p>
    <Button className="mt-2" variant="outline" disabled={busy} onClick={async () => {
      setBusy(true); setMessage("");
      try { await api("auth/logout", { method: "POST" }); router.replace("/admin/login"); router.refresh(); }
      catch (error) { setMessage((error as Error).message); }
      finally { setBusy(false); }
    }}>Sign out</Button>
  </>;
}
