import crypto from "crypto";

import { db } from "@/app/lib/tags-db";

import { sendMagicLink }
    from "@/app/lib/mailgun";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {

    try {

        const body =
            await req.json();

        const {
            email
        } = body;

        if (!email) {

            return Response.json(
                {
                    error: "Email requerido"
                },
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
                [email]
            );

        const staff =
            rows[0];

        if (!staff) {

            return Response.json(
                {
                    error:
                        "Personal no encontrado"
                },
                {
                    status: 404
                }
            );
        }

        // =========================
        // TOKEN
        // =========================

        const token =
            crypto.randomUUID();

        await db.query(
            `
            INSERT INTO tags_events_staff_auth_tokens (

                email,
                token,
                expires_at

            )

            VALUES (

                ?,
                ?,
                DATE_ADD(NOW(), INTERVAL 15 MINUTE)

            )
            `,
            [
                email,
                token
            ]
        );

        // =========================
        // LINK
        // =========================

        const isDev =
            process.env.NODE_ENV === "development";

        const baseUrl =
            isDev
                ? "http://localhost:3000"
                : process.env.NEXT_PUBLIC_APP_URL;

        const link =
            `${baseUrl}/api/events/auth/verify?token=${token}`;

        // =========================
        // SEND MAIL
        // =========================

        await sendMagicLink(
            email,
            link
        );

        return Response.json({
            ok: true
        });

    } catch (err) {

        console.log(err);

        return Response.json(
            {
                error:
                    "Error interno"
            },
            {
                status: 500
            }
        );
    }
}