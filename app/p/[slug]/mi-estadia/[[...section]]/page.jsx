import { headers } from "next/headers";
import GuestExperiencePublicApp from "@/app/modules/guest-experience/components/public/GuestExperiencePublicApp";
import { db } from "@/app/lib/tags-db";
import { getHeadersHost } from "@/app/lib/channelContext";
import { getPublicAiChatConfig } from "@/app/modules/ai-chat/server/getPublicAiChatConfig";
import ChatWidget from "@/app/modules/ai-chat/components/ChatWidget";
import GuestExperienceInstallPrompt from "@/app/modules/guest-experience/components/public/GuestExperienceInstallPrompt";
import { parseGuestJson } from "@/app/modules/guest-experience/lib/guestExperienceService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
    const resolved = await params;
    const requestHeaders = await headers();
    const publicHost = getHeadersHost(requestHeaders);
    const usesExternalDomain = Boolean(
        publicHost &&
        publicHost !== "tags.com.ar" &&
        publicHost !== "localhost" &&
        !publicHost.startsWith("127.")
    );

    const [rows] = await db.query(
        `SELECT
            ga.name,
            ga.logo_url,
            ga.settings_json,
            (
                SELECT d.favicon_url
                FROM tags_domains d
                WHERE d.business_id=ga.business_id
                  AND d.is_active=1
                  AND (LOWER(d.domain)=? OR LOWER(d.domain)=?)
                ORDER BY d.id DESC
                LIMIT 1
            ) AS domain_favicon_url
        FROM tags_guest_apps ga
        WHERE BINARY ga.slug=BINARY ?
          AND ga.status='published'
        LIMIT 1`,
        [publicHost, `www.${publicHost}`, resolved.slug]
    );

    const app = rows[0];
    const pwaSettings = parseGuestJson(app?.settings_json);
    const favicon = usesExternalDomain
        ? app?.domain_favicon_url || `https://${publicHost}/favicon.ico`
        : app?.logo_url || null;

    return {
        title: app?.name ? `Mi Estadía | ${app.name}` : "Mi Estadía",
        description: app?.name
            ? `Información y servicios para tu estadía en ${app.name}.`
            : "Información y servicios para tu estadía.",
        ...(favicon ? { icons: { icon: favicon, shortcut: favicon, apple: favicon } } : {}),
        ...(pwaSettings.pwaIcon192Url && pwaSettings.pwaIcon512Url
            ? { manifest: `/api/guest-experience/public/pwa/manifest?slug=${encodeURIComponent(resolved.slug)}&v=4` }
            : {})
    };
}

export default async function GuestExperiencePage({ params }) {
    const resolved = await params;
    const requestHeaders = await headers();
    const publicHost = getHeadersHost(requestHeaders);
    const [rows] = await db.query(
        `SELECT ga.id,ga.business_id,ga.name,ga.logo_url,ga.settings_json,
                (SELECT d.favicon_url FROM tags_domains d
                  WHERE d.business_id=ga.business_id AND d.is_active=1
                    AND (LOWER(d.domain)=? OR LOWER(d.domain)=?)
                  ORDER BY d.id DESC LIMIT 1) AS domain_favicon_url
           FROM tags_guest_apps ga
          WHERE BINARY ga.slug=BINARY ? AND ga.status='published' LIMIT 1`,
        [publicHost, `www.${publicHost}`, resolved.slug]
    );
    const app = rows[0];
    const pwaSettings = parseGuestJson(app?.settings_json);
    const aiChatConfig = app
        ? await getPublicAiChatConfig(app.business_id, "guest_experience", app.id)
        : null;

    return (
        <>
            <GuestExperiencePublicApp
                slug={resolved.slug}
                businessId={app?.business_id}
                initialSection={resolved.section?.[0] || "inicio"}
            />
            {app && pwaSettings.pwaIcon192Url && pwaSettings.pwaIcon512Url && <GuestExperienceInstallPrompt
                slug={resolved.slug}
                businessId={app.business_id}
                name={app.name}
                iconUrl={`/api/guest-experience/public/pwa/icon?slug=${encodeURIComponent(resolved.slug)}&size=192`}
            />}
            {aiChatConfig && <ChatWidget config={aiChatConfig} />}
        </>
    );
}
