import { redirect } from "next/navigation";
import { user } from "@/server/auth";
import { TradeIn } from "@/components/auth/TradeIn";
export const metadata = { title: "Trade in your device | Dazzle" };
export default async function TradeInPage() {
  if (!await user()) redirect("/auth/login?redirect=%2Ftrade-in");
  return <TradeIn />;
}
