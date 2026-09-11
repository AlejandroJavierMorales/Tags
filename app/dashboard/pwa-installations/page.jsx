import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import HeaderSwitcher from "@/app/components/HeaderSwitcher";
import PwaInstallationsClient from "./pageClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Instalaciones de aplicaciones | Tags", robots: { index: false, follow: false } };

export default async function PwaInstallationsPage() {
  const cookie = (await cookies()).get("tags_session");
  if (!cookie) redirect("/login");
  let session = null;
  try { session = JSON.parse(cookie.value); } catch { session = null; }
  if (session?.role !== "admin") redirect("/dashboard");
  return <><HeaderSwitcher /><PwaInstallationsClient /></>;
}
