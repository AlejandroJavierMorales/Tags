// =====================================
// Archivo:
// /app/p/[slug]/cart/page.jsx
//
// Descripción:
// Página pública de carrito de Tags Store.
//
// Contexto:
// store
// =====================================

import { notFound }
    from "next/navigation";

import { db }
    from "@/app/lib/tags-db";

import StoreCartPageClient
    from "@/app/modules/store/components/public/StoreCartPageClient";

import "@/app/modules/store/styles/store-public.css";
import { normalizeStoreReturnUrl } from "@/app/modules/store/lib/storePublicContext";
import { getDirectoryThemeStyleForBusiness } from "@/app/modules/directory/lib/getDirectoryThemeStyleForBusiness";

export const runtime =
    "nodejs";

export const dynamic =
    "force-dynamic";

function safeParse(value) {
    if (!value) return {};
    if (typeof value === "object") return value;

    try {
        return JSON.parse(value);
    } catch {
        return {};
    }
}

async function getStore(slug) {
    const [rows] =
        await db.execute(
            `
        SELECT
            s.*,
            qrp.theme_id,
            t.code AS theme_code,
            t.name AS theme_name,
            t.css_tokens AS theme_css_tokens
        FROM tags_stores s
        INNER JOIN tags_qr_pages qrp
            ON qrp.id = s.page_id
        LEFT JOIN tags_qr_page_themes t
            ON t.id = qrp.theme_id
        WHERE qrp.slug = ?
        AND qrp.page_type = 'store'
        AND (
            (qrp.status = 'published' AND s.status = 'published')
            OR (
                EXISTS (SELECT 1 FROM tags_business_addons ba_store WHERE ba_store.business_id=s.business_id AND ba_store.addon_code='store' AND ba_store.status='active' AND (ba_store.expires_at IS NULL OR ba_store.expires_at>=NOW()))
                AND EXISTS (
                    SELECT 1 FROM tags_directory_listings dl
                    INNER JOIN tags_directory_site_listings dsl ON dsl.listing_id=dl.id AND dsl.publication_status='published' AND dsl.is_free=0
                    INNER JOIN tags_qr_pages dp ON dp.id=dl.qr_page_id AND dp.page_type='directory' AND dp.status='published'
                    WHERE dl.business_id=s.business_id AND dl.status='published'
                )
            )
        )
        LIMIT 1
        `,
            [slug]
        );
    return rows?.[0] || null;
}

export default async function Page({
    params,
    searchParams
}) {
    const query = await Promise.resolve(searchParams || {});
    const returnUrl = normalizeStoreReturnUrl(query.returnTo);
    const store =
        await getStore(
            params.slug
        );

    if (!store) {
        notFound();
    }

    store.settings_json = safeParse(store.settings_json);
    store.styles_json = safeParse(store.styles_json);

    const themeTokens =
        safeParse(store.theme_css_tokens);

    const customTokens =
        safeParse(store.styles_json?.css_tokens);

    store.theme_css_vars = {
        ...themeTokens,
        ...customTokens
    };
    if (returnUrl) {
        const directoryThemeStyle =
            await getDirectoryThemeStyleForBusiness(store.business_id);
        store.embedded_mode = "directory";
        store.embedded_return_url = returnUrl;
        store.theme_css_vars = {
            ...directoryThemeStyle,
            ...(store.theme_css_vars || {})
        };
    }

    return (
        <div
            className="store_public_page"
            style={store.theme_css_vars || {}}
        >
            <StoreCartPageClient
                store={store}
                settings={
                    store.settings_json?.pageEditors?.cart || {}}
            />
        </div>
    );
}
