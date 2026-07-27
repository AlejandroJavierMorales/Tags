export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import crypto from "crypto";

import {
    db
} from "@/app/lib/tags-db";

import {
    sendMagicLink
} from "@/app/lib/mailgun";

import {
    getRestoAccess,
    restoAccessResponse
} from "@/app/modules/resto/lib/staff/getRestoAccess";

import {
    logRestoAudit
} from "@/app/modules/resto/lib/staff/restoAudit";

export async function POST(req) {
    try {
        const body =
            await req.json();

        const businessId =
            String(
                body?.businessId || ""
            ).trim();

        const staffId =
            Number(body?.staffId || 0);

        const access =
            await getRestoAccess({
                businessId,
                permission: "staff.manage"
            });

        if (!access.allowed) {
            return restoAccessResponse(
                access
            );
        }

        const [rows] =
            await db.query(
                `
                SELECT
                    st.id,
                    st.store_id,
                    st.name,
                    st.email
                FROM tags_resto_staff st
                INNER JOIN tags_stores s
                    ON s.id = st.store_id
                    AND s.app_type = 'resto'
                WHERE st.id = ?
                AND s.business_id = ?
                AND st.status = 'active'
                LIMIT 1
                `,
                [staffId, businessId]
            );

        const staff =
            rows[0];

        if (!staff) {
            return Response.json(
                {
                    error:
                        "Empleado activo no encontrado"
                },
                { status: 404 }
            );
        }

        const token =
            crypto
                .randomBytes(32)
                .toString("hex");

        const tokenHash =
            crypto
                .createHash("sha256")
                .update(token)
                .digest("hex");

        const [tokenResult] =
            await db.query(
            `
            INSERT INTO tags_resto_staff_auth_tokens
            (
                staff_id,
                store_id,
                token_hash,
                expires_at,
                requested_ip
            )
            VALUES
            (
                ?,
                ?,
                ?,
                DATE_ADD(NOW(), INTERVAL 15 MINUTE),
                ?
            )
            `,
            [
                staff.id,
                staff.store_id,
                tokenHash,
                req.headers.get(
                    "x-forwarded-for"
                ) || null
            ]
        );

        const baseUrl =
            process.env.NODE_ENV ===
            "development"
                ? new URL(req.url).origin
                : process.env
                    .NEXT_PUBLIC_APP_URL;

        const link =
            `${baseUrl}/api/resto/auth/verify?token=${encodeURIComponent(token)}`;

        await sendMagicLink(
            staff.email,
            link
        );

        await db.query(
            `
            UPDATE tags_resto_staff_auth_tokens
            SET used_at = NOW()
            WHERE staff_id = ?
            AND id <> ?
            AND used_at IS NULL
            `,
            [
                staff.id,
                tokenResult.insertId
            ]
        );

        await logRestoAudit(
            db,
            {
                storeId:
                    staff.store_id,
                access,
                actionCode:
                    "staff.access_link.sent",
                entityType:
                    "staff",
                entityId:
                    staff.id,
                description:
                    staff.email,
                req
            }
        );

        return Response.json({
            ok: true,
            email: staff.email
        });
    } catch (error) {
        console.error(
            "RESTO STAFF SEND LINK ERROR:",
            error
        );

        return Response.json(
            {
                error:
                    "No se pudo enviar el acceso"
            },
            { status: 500 }
        );
    }
}
