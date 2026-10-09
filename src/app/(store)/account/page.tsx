import { Account } from "@/components/auth/Account";
import { redirect } from "next/navigation";
import { user } from "@/server/auth";
export default async function AccountPage() {
  if (!await user()) redirect("/auth/login?redirect=%2Faccount");
  return <Account />;
}
