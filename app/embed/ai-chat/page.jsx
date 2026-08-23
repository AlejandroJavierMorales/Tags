import ChatWidget from "@/app/modules/ai-chat/components/ChatWidget";
import { getPublicAiChatConfig } from "@/app/modules/ai-chat/server/getPublicAiChatConfig";
import { db } from "@/app/lib/tags-db";
import "./embed.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function EmbeddedAiChatPage({ searchParams }) {
    const params = await searchParams;
    let businessId = Number(params?.business_id || params?.businessId || 0);
    const domain = String(params?.domain || "").trim().toLowerCase().replace(/^www\./, "");
    if (!businessId && domain) {
        const [rows] = await db.query(
            "SELECT business_id FROM tags_domains WHERE LOWER(REPLACE(domain,'www.',''))=? AND is_active=1 LIMIT 1",
            [domain]
        );
        businessId = Number(rows[0]?.business_id || 0);
    }
    const surfaceType = String(params?.surface_type || params?.surfaceType || "external");
    const surfaceId = Number(params?.surface_id || params?.surfaceId || 0);
    const config = businessId
        ? await getPublicAiChatConfig(businessId, surfaceType, surfaceId)
        : null;

    if (!config) {
        return null;
    }

    return <ChatWidget config={config} />;
}
