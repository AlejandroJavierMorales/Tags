// =====================================
// Archivo:
// /app/p/[slug]/checkout/page.jsx
//
// Descripción:
// Página pública de checkout de Tags Store.
// Obtiene la tienda por slug y renderiza
// el checkout usando la lógica existente.
//
// Contexto:
// store
// =====================================

import { notFound }
    from "next/navigation";

import { db }
    from "@/app/lib/tags-db";

import StoreCheckoutPageClient
    from "@/app/modules/store/components/public/StoreCheckoutPageClient";

import "@/app/modules/store/styles/store-public.css";

export const runtime =
    "nodejs";

export const dynamic =
    "force-dynamic";

function safeParse(value) {

    if (!value) {
        return {};
    }

    if (typeof value === "object") {
        return value;
    }

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
            AND qrp.status = 'published'
            AND s.status = 'published'
            LIMIT 1
            `,
            [
                slug
            ]
        );

    const store =
        rows?.[0];

    if (!store) {
        return null;
    }

    store.settings_json =
        safeParse(store.settings_json);

    store.styles_json =
        safeParse(store.styles_json);

    const themeTokens =
        safeParse(store.theme_css_tokens);

    const customTokens =
        safeParse(store.styles_json?.css_tokens);

    store.theme_css_vars = {
        ...themeTokens,
        ...customTokens
    };

    return store;

}

export default async function Page({
    params
}) {

    const store =
        await getStore(
            params.slug
        );

    if (!store) {
        notFound();
    }

    return (
        <div
            className="store_public_page"
            style={store.theme_css_vars || {}}
        >
            <StoreCheckoutPageClient
                store={store}
                settings={store.settings_json?.pageEditors?.checkout || {}
                }
            />
        </div>
    );

}