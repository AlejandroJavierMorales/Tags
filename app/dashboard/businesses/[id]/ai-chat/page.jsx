import AiChatAdminPage from "@/app/modules/ai-chat/components/admin/AiChatAdminPage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AiChatDashboardPage({ params }) {
    const { id } = await params;
    return <AiChatAdminPage businessId={id} />;
}
