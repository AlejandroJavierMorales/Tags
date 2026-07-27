import { cookies } from "next/headers";

import { db } from "@/app/lib/tags-db";

export async function getStoreAdminSession() {
    const cookie =
        (await cookies()).get("tags_session");

    if (!cookie) return null;

    try {
        return JSON.parse(cookie.value);
    } catch {
        return null;
    }
}

export async function requireStoreBusinessAccess(
    businessId
) {
    const session =
        await getStoreAdminSession();

    if (!session) {
        return {
            allowed: false,
            status: 401,
            store: null
        };
    }

    const isPlatformAdmin =
        session.role === "admin";

    const sessionBusinessId =
        String(
            session.businessId ||
            session.business_id ||
            ""
        );

    if (
        !isPlatformAdmin &&
        sessionBusinessId !== String(businessId)
    ) {
        return {
            allowed: false,
            status: 403,
            store: null
        };
    }

    const [rows] =
        await db.query(
            `
            SELECT id, business_id, name, slug, status
            FROM tags_stores
            WHERE business_id = ?
            AND app_type = 'store'
            LIMIT 1
            `,
            [businessId]
        );

    return {
        allowed: true,
        status: 200,
        session,
        store: rows[0] || null
    };
}

export async function requireStoreResourceAccess({
    storeId = null,
    sectionId = null
}) {
    const session =
        await getStoreAdminSession();

    if (!session) {
        return {
            allowed: false,
            status: 401
        };
    }

    const [rows] =
        await db.query(
            `
            SELECT
                s.id,
                s.business_id
            FROM tags_stores s
            LEFT JOIN tags_store_sections ss
                ON ss.store_id = s.id
            WHERE s.app_type = 'store'
            AND (
                (? IS NOT NULL AND s.id = ?)
                OR
                (? IS NOT NULL AND ss.id = ?)
            )
            LIMIT 1
            `,
            [
                storeId,
                storeId,
                sectionId,
                sectionId
            ]
        );

    const store = rows[0];

    const allowed =
        Boolean(store) &&
        (
            session.role === "admin" ||
            String(store.business_id) ===
                String(
                    session.businessId ||
                    session.business_id ||
                    ""
                )
        );

    return {
        allowed,
        status:
            allowed
                ? 200
                : store
                    ? 403
                    : 404,
        session,
        store: store || null
    };
}

export function storeAccessResponse(access) {
    return Response.json(
        {
            error:
                access.status === 401
                    ? "No autenticado"
                    : "Sin permisos"
        },
        {
            status: access.status || 403
        }
    );
}
