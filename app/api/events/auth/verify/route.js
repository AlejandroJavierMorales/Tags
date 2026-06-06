import { db }
    from "@/app/lib/tags-db";

import { NextResponse }
    from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {

    try {

        const { searchParams } =
            new URL(req.url);

        const token =
            searchParams.get("token");

        if (!token) {

            return new Response(
                "Token requerido",
                {
                    status: 400
                }
            );
        }

        // =========================
        // TOKEN
        // =========================

        const [tokenRows] =
            await db.query(
                `
                SELECT *

                FROM tags_events_staff_auth_tokens

                WHERE
                    token = ?
                AND
                    expires_at > NOW()

                LIMIT 1
                `,
                [token]
            );

        const auth =
            tokenRows[0];

        if (!auth) {

            return new Response(
                "Token inválido",
                {
                    status: 400
                }
            );
        }

        // =========================
        // STAFF
        // =========================

        const [rows] =
            await db.query(
                `
                SELECT *

                FROM tags_events_staff

                WHERE
                    email = ?
                AND
                    status = 'active'

                LIMIT 1
                `,
                [auth.email]
            );

        const staff =
            rows[0];


        if (!staff) {

            return new Response(
                "Personal no encontrado",
                {
                    status: 404
                }
            );
        }

        // =========================
        // DELETE TOKEN
        // =========================

        await db.query(
            `
            DELETE FROM
                tags_events_staff_auth_tokens

            WHERE token = ?
            `,
            [token]
        );

        // =========================
        // SESSION
        // =========================

        const session = {

            type:
                "event_staff",

            staffId:
                staff.id,

            businessId:
                staff.business_id,

            role:
                staff.role,

            name:
                staff.name,

            email:
                staff.email,

            permissions: (() => {

                try {

                    if (!staff.permissions) {

                        return [];
                    }

                    // normaliza
                    const raw =
                        String(staff.permissions).trim();

                    // JSON ARRAY
                    if (raw.startsWith("[")) {

                        return JSON.parse(raw);
                    }

                    // CSV
                    return raw
                        .split(",")
                        .map(p => p.trim())
                        .filter(Boolean);

                } catch (err) {

                    console.log(
                        "Permissions parse error:",
                        err
                    );

                    return [];
                }

            })()
        };

        // =========================
        // COOKIE
        // =========================

        const isDev =
            process.env.NODE_ENV === "development";

        const baseUrl =
            isDev
                ? "http://localhost:3000"
                : process.env.NEXT_PUBLIC_APP_URL;

        const response =
            NextResponse.redirect(
                `${baseUrl}/dashboard/events/`
                /* `${baseUrl}/dashboard/events/${staff.event_id}` */
            );

        console.log('Cookie a setear desde Verify: ' + JSON.stringify(session, 2, null))

        response.cookies.set(
            "tags_session",
            JSON.stringify(session),
            {
                httpOnly: false,
                sameSite: "lax",
                secure:
                    process.env.NODE_ENV === "production",
                path: "/",
                maxAge:
                    60 * 60 * 24 * 7
            }
        );

        return response;

    } catch (err) {

        console.log(err);

        return new Response(
            "Error interno",
            {
                status: 500
            }
        );
    }
}