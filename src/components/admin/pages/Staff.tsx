"use client";
import * as React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { Crown, KeyRound, Plus, ShieldCheck, UserCog } from "lucide-react";
import { PERMISSIONS, ROLE_PRESETS, type Permission } from "@/lib/permissions";
import { cn } from "../lib/utils";
import { date, send, useApi } from "../lib/api";
import { useMe } from "../lib/me";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Checkbox, Switch } from "../ui/controls";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "../ui/dialog";
import { EmptyState, ErrorNote, Field, PageHeader, Spinner } from "../shared/kit";

interface StaffRow {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: "admin" | "staff";
  staffRole?: string;
  permissions?: Permission[];
  active: boolean;
  createdAt: string;
}

function StaffEditor({ member, onClose, onSaved }: { member: StaffRow | null; onClose: () => void; onSaved: () => void }) {
  const me = useMe();
  const [draft, setDraft] = useState({
    name: member?.name ?? "",
    email: member?.email ?? "",
    phone: member?.phone ?? "",
    role: member?.role ?? ("staff" as "admin" | "staff"),
    staffRole: member?.staffRole ?? "",
    permissions: member?.permissions ?? ([] as Permission[]),
    active: member?.active ?? true,
    password: "",
  });
  const [busy, setBusy] = useState(false);
  const self = member?._id === me?.id;
  const toggle = (p: Permission, on: boolean) => setDraft((d) => ({ ...d, permissions: on ? [...d.permissions, p] : d.permissions.filter((x) => x !== p) }));
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-xl">
        <form
          className="flex h-full flex-col"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              const { password, ...rest } = draft;
              await send(`admin/staff${member ? `/${member._id}` : ""}`, { ...rest, ...(password ? { password } : {}) }, member ? "PATCH" : "POST");
              toast.success(member ? "Staff account updated" : "Staff account created", { description: member ? undefined : "Share the email and password with them privately." });
              onSaved();
            } catch (err) {
              toast.error((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <SheetHeader>
            <SheetTitle>{member ? member.name : "Add staff member"}</SheetTitle>
            <SheetDescription>Staff sign in at /admin/login and only see the areas you allow.</SheetDescription>
          </SheetHeader>
          <SheetBody className="grid content-start gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name">
                <Input required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </Field>
              <Field label="Job title">
                <Input value={draft.staffRole} onChange={(e) => setDraft({ ...draft, staffRole: e.target.value })} placeholder="Order manager" />
              </Field>
              <Field label="Email (login)">
                <Input required type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
              </Field>
              <Field label="Mobile (optional)">
                <Input type="tel" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
              </Field>
              <Field label={member ? "New password (optional)" : "Password"} hint="At least 8 characters. Changing it signs them out everywhere." className="sm:col-span-2">
                <Input type="password" autoComplete="new-password" minLength={8} required={!member} value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(["staff", "admin"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  disabled={self}
                  onClick={() => setDraft({ ...draft, role: r })}
                  className={cn("rounded-xl border-2 px-3 py-3 text-left transition disabled:opacity-60", draft.role === r ? "border-brand bg-brand-soft/60" : "border-input hover:bg-muted/50")}
                >
                  <span className="flex items-center gap-2 text-sm font-bold">{r === "admin" ? <Crown className="size-4 text-brand" /> : <UserCog className="size-4 text-brand" />} {r === "admin" ? "Owner / admin" : "Staff"}</span>
                  <span className="text-xs text-muted-foreground">{r === "admin" ? "Full access, including staff and settings." : "Only the permissions you choose."}</span>
                </button>
              ))}
            </div>
            {draft.role === "staff" && (
              <div className="grid gap-3">
                <div>
                  <p className="mb-2 text-sm font-bold">Start from a role</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ROLE_PRESETS.map((p) => (
                      <Button key={p.key} type="button" size="sm" variant="outline" onClick={() => setDraft({ ...draft, permissions: [...p.permissions], staffRole: draft.staffRole || p.label })}>
                        {p.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {PERMISSIONS.map((p) => (
                    <label key={p.key} className="flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm">
                      <Checkbox checked={draft.permissions.includes(p.key)} onCheckedChange={(v) => toggle(p.key, v === true)} />
                      {p.label}
                    </label>
                  ))}
                </div>
              </div>
            )}
            {!self && (
              <label className="flex items-center justify-between rounded-xl border px-3.5 py-3 text-sm font-semibold">
                Account active
                <Switch checked={draft.active} onCheckedChange={(active) => setDraft({ ...draft, active })} />
              </label>
            )}
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="brand" disabled={busy || (draft.role === "staff" && !draft.permissions.length)}>
              {busy && <Spinner />} {member ? "Save" : "Create account"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export function StaffPage({ description }: { description: string }) {
  const me = useMe();
  const { data, error, reload } = useApi<{ items: StaffRow[] }>(me?.role === "admin" ? "admin/staff" : null);
  const [editing, setEditing] = useState<StaffRow | "new" | null>(null);
  if (me?.role !== "admin")
    return (
      <Card>
        <EmptyState icon={ShieldCheck} title="Only store owners can manage staff" />
      </Card>
    );
  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Staff & roles"
        description={description}
        actions={
          <Button variant="brand" onClick={() => setEditing("new")}>
            <Plus /> Add staff
          </Button>
        }
      />
      {error && <ErrorNote message={error} onRetry={reload} />}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data?.items.map((m) => (
          <Card key={m._id} className={cn("cursor-pointer gap-3 transition hover:border-ring/40 hover:shadow-md", !m.active && "opacity-60")} onClick={() => setEditing(m)}>
            <div className="flex items-start gap-3 px-5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f3dcc0,#cb843b)] text-sm font-bold text-[#3b2209]">
                {m.name
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">
                  {m.name} {m._id === me.id && <span className="text-xs font-normal text-muted-foreground">(you)</span>}
                </p>
                <p className="truncate text-xs text-muted-foreground">{m.email}</p>
              </div>
              {m.role === "admin" ? (
                <Badge variant="brand">
                  <Crown /> Owner
                </Badge>
              ) : (
                <Badge variant="secondary">{m.staffRole || "Staff"}</Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-1 px-5">
              {m.role === "admin" ? (
                <span className="text-xs text-muted-foreground">Full access</span>
              ) : (
                (m.permissions ?? []).map((p) => (
                  <Badge key={p} variant="muted" className="font-medium">
                    {p}
                  </Badge>
                ))
              )}
            </div>
            <p className="flex items-center gap-1.5 px-5 text-xs text-muted-foreground">
              <KeyRound className="size-3" /> Since {date(m.createdAt)} {!m.active && "· disabled"}
            </p>
          </Card>
        ))}
      </div>
      {data && !data.items.length && <EmptyState icon={UserCog} title="No staff yet" />}
      {editing && (
        <StaffEditor
          member={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </>
  );
}
