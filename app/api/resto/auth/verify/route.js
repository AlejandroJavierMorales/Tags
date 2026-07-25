export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import crypto from "crypto";

import {
    NextResponse
} from "next/server";

import {
    db
} from "@/app/lib/tags-db";

export async function GET(req) {
    let connection;

    try {
        const token =
            new URL(req.url)
                .searchParams
                .get("token");

        if (!token) {
            return new Response(
                "Token requerido",
                { status: 400 }
            );
        }

        const tokenHash =
            crypto
                .createHash("sha256")
                .update(token)
                .digest("hex");

        connection =
            await db.getConnection();
        await connection.beginTransaction();

        const [rows] =
            await connection.query(
                `
                SELECT
                    at.id AS token_id,
                    st.id AS staff_id,
                    st.store_id,
                    st.name,
                    st.email,
                    st.status,
                    s.business_id,
                    r.code AS role_code,
                    r.name AS role_name
                FROM tags_resto_staff_auth_tokens at
                INNER JOIN tags_resto_staff st
                    ON st.id = at.staff_id
                    AND st.store_id = at.store_id
                INNER JOIN tags_stores s
                    ON s.id = st.store_id
                    AND s.app_type = 'resto'
                LEFT JOIN tags_resto_roles r
                    ON r.id = st.role_id
                WHERE at.token_hash = ?
                AND at.used_at IS NULL
                AND at.expires_at > NOW()
                LIMIT 1
                FOR UPDATE
                `,
                [tokenHash]
            );

        const staff =
            rows[0];

        if (
            !staff ||
            staff.status !== "active"
        ) {
            await connection.rollback();
            return new Response(
                "El enlace es inválido o venció",
                { status: 400 }
            );
        }

        await connection.query(
            `
            UPDATE tags_resto_staff_auth_tokens
            SET used_at = NOW()
            WHERE id = ?
            `,
            [staff.token_id]
        );

        await connection.query(
            `
            UPDATE tags_resto_staff
            SET last_access_at = NOW()
            WHERE id = ?
            AND store_id = ?
            `,
            [
                staff.staff_id,
                staff.store_id
            ]
        );

        await connection.commit();

        const baseUrl =
            process.env.NODE_ENV ===
            "development"
                ? "http://localhost:3000"
                : process.env
                    .NEXT_PUBLIC_APP_URL;

        const response =
            NextResponse.redirect(
                `${baseUrl}/dashboard/businesses/${staff.business_id}/resto`
            );

        response.cookies.set(
            "tags_session",
            JSON.stringify({
                type: "resto_staff",
                staffId: staff.staff_id,
                storeId: staff.store_id,
                businessId:
                    staff.business_id,
                role:
                    staff.role_code ||
                    "resto_staff",
                roleName:
                    staff.role_name ||
                    "Personal",
                name: staff.name,
                email: staff.email
            }),
            {
                httpOnly: true,
                sameSite: "lax",
                secure:
                    process.env.NODE_ENV ===
                    "production",
                path: "/",
                maxAge:
                    60 * 60 * 12
            }
        );

        return response;
    } catch (error) {
        if (connection) {
            await connection
                .rollback()
                .catch(() => {});
        }

        console.error(
            "RESTO STAFF VERIFY ERROR:",
            error
        );

        return new Response(
            "No se pudo iniciar sesión",
            { status: 500 }
        );
    } finally {
        connection?.release();
    }
}
