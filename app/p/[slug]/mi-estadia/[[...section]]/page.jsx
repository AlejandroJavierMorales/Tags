import GuestExperiencePublicApp from "@/app/modules/guest-experience/components/public/GuestExperiencePublicApp";
import { db } from "@/app/lib/tags-db";
import { getPublicAiChatConfig } from "@/app/modules/ai-chat/server/getPublicAiChatConfig";
import ChatWidget from "@/app/modules/ai-chat/components/ChatWidget";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
    const resolved = await params;
    const [rows] = await db.query(
        "SELECT name,logo_url FROM tags_guest_apps WHERE BINARY slug=BINARY ? AND status='published' LIMIT 1",
        [resolved.slug]
    );
    const app = rows[0];
    return {
        title: app?.name ? `Mi Estadía | ${app.name}` : "Mi Estadía",
        description: app?.name ? `Información y servicios para tu estadía en ${app.name}.` : "Información y servicios para tu estadía.",
        ...(app?.logo_url ? { icons: { icon: app.logo_url, shortcut: app.logo_url, apple: app.logo_url } } : {})
    };
}

export default async function GuestExperiencePage({ params }) {
    const resolved = await params;
    const [rows] = await db.query(
        "SELECT id,business_id FROM tags_guest_apps WHERE BINARY slug=BINARY ? AND status='published' LIMIT 1",
        [resolved.slug]
    );
    const app = rows[0];
    const aiChatConfig = app
        ? await getPublicAiChatConfig(app.business_id, "guest_experience", app.id)
        : null;

    return (
        <>
            <GuestExperiencePublicApp
                slug={resolved.slug}
                initialSection={resolved.section?.[0] || "inicio"}
            />
            {aiChatConfig && <ChatWidget config={aiChatConfig} />}
        </>
    );
}
