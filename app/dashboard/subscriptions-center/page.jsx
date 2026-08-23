import { redirect } from "next/navigation";
import HeaderSwitcher from "@/app/components/HeaderSwitcher";
import { requireSubscriptionAdmin } from "@/app/modules/subscriptions/lib/requireSubscriptionAdmin";
import SubscriptionCenterClient from "./pageClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Suscripciones y Pagos | Tags", robots: { index: false, follow: false } };

export default async function SubscriptionCenterPage() {
  const access = await requireSubscriptionAdmin();
  if (!access.ok) redirect("/login");
  return <><HeaderSwitcher/><SubscriptionCenterClient/></>;
}

