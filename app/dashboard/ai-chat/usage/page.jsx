import AiChatUsagePanel from "@/app/modules/ai-chat/components/admin/AiChatUsagePanel";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import HeaderSwitcher from "@/app/components/HeaderSwitcher";
import Link from "next/link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AiChatUsagePage() {
    const cookieStore = await cookies();
    const cookie = cookieStore.get("tags_session");
    if (!cookie) return redirect("/login");
    let session;
    try { session = JSON.parse(cookie.value); } catch { return redirect("/login"); }
    if (session?.role !== "admin") return redirect("/dashboard");
    return <><HeaderSwitcher /><main className="tags_ai_usage_page"><div className="tags_ai_usage_back"><Link href="/dashboard">← Volver al panel</Link></div><AiChatUsagePanel global /></main></>;
}
