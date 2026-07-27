import {
    cookies
} from "next/headers";

import {
    db
} from "@/app/lib/tags-db";

import {
    verifyTagsSession
} from "@/app/lib/signTagsSession";

export async function getRestoSession() {
    const cookieStore =
        await cookies();

    const cookie =
        cookieStore.get(
            "tags_session"
        );

    if (!cookie) return null;

    const signature =
        cookieStore.get(
            "tags_session_sig"
        )?.value ||
        "";

    if (
        !verifyTagsSession(
            cookie.value,
            signature
        )
    ) {
        return null;
    }

    try {
        return JSON.parse(
            cookie.value
        );
    } catch {
        return null;
    }
}

export async function getRestoAccess({
    businessId,
    permission = null,
    ownerOnly = false
}) {
    const session =
        await getRestoSession();

    if (!session) {
        return {
            allowed: false,
            status: 401,
            session: null,
            permissions: []
        };
    }

    const isPlatformAdmin =
        session.role === "admin";

    const isBusinessOwner =
        session.type !== "resto_staff" &&
        String(
            session.business_id ||
            session.businessId ||
            ""
        ) === String(businessId);

    if (
        isPlatformAdmin ||
        isBusinessOwner
    ) {
        return {
            allowed: true,
            isOwner: true,
            isStaff: false,
            session,
            permissions: ["*"]
        };
    }

    if (
        ownerOnly ||
        session.type !== "resto_staff"
    ) {
        return {
            allowed: false,
            status: 403,
            session,
            permissions: []
        };
    }

    const [staffRows] =
        await db.query(
            `
            SELECT
                st.id,
                st.store_id,
                st.role_id,
                st.name,
                st.email,
                st.status,
                s.business_id,
                r.name AS role_name,
                r.code AS role_code
            FROM tags_resto_staff st
            INNER JOIN tags_stores s
                ON s.id = st.store_id
                AND s.app_type = 'resto'
            LEFT JOIN tags_resto_roles r
                ON r.id = st.role_id
                AND r.store_id = st.store_id
            WHERE st.id = ?
            AND st.store_id = ?
            AND s.business_id = ?
            AND st.status = 'active'
            LIMIT 1
            `,
            [
                session.staffId || 0,
                session.storeId || 0,
                businessId
            ]
        );

    const staff =
        staffRows[0];

    if (!staff) {
        return {
            allowed: false,
            status: 403,
            session,
            permissions: []
        };
    }

    const [permissionRows] =
        await db.query(
            `
            SELECT
                p.code,
                CASE
                    WHEN spo.effect = 'deny' THEN 0
                    WHEN spo.effect = 'allow' THEN 1
                    WHEN rp.permission_id IS NOT NULL THEN 1
                    ELSE 0
                END AS is_allowed
            FROM tags_resto_permissions p
            LEFT JOIN tags_resto_role_permissions rp
                ON rp.permission_id = p.id
                AND rp.role_id = ?
            LEFT JOIN tags_resto_staff_permission_overrides spo
                ON spo.permission_id = p.id
                AND spo.staff_id = ?
            `,
            [
                staff.role_id || 0,
                staff.id
            ]
        );

    const permissions =
        permissionRows
            .filter(
                item =>
                    Number(
                        item.is_allowed
                    ) === 1
            )
            .map(item => item.code);

    const requestedPermissions =
        Array.isArray(permission)
            ? permission
            : permission
                ? [permission]
                : [];

    const isAllowed =
        requestedPermissions.length === 0 ||
        requestedPermissions.some(
            code =>
                permissions.includes(code)
        );

    return {
        allowed:
            isAllowed,
        status:
            isAllowed
                ? 200
                : 403,
        isOwner: false,
        isStaff: true,
        session: {
            ...session,
            name: staff.name,
            email: staff.email,
            roleName:
                staff.role_name || "Personal"
        },
        staff,
        permissions
    };
}

export function restoAccessResponse(
    access
) {
    return Response.json(
        {
            error:
                access.status === 401
                    ? "No autenticado"
                    : "Sin permisos"
        },
        {
            status:
                access.status || 403
        }
    );
}
