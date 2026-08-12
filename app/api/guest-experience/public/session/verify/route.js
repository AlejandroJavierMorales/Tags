export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { db } from "@/app/lib/tags-db";
import {
    createGuestToken,
    hashGuestToken,
    parseGuestJson,
    guestError
} from "@/app/modules/guest-experience/lib/guestExperienceService";

function getPublicOrigin() {

    const base =
        process.env.NODE_ENV === "production"
            ? (
                process.env.NEXT_PUBLIC_BASE_URL_PROD ||
                process.env.BASE_URL_PROD
            )
            : (
                process.env.NEXT_PUBLIC_BASE_URL_DEV ||
                process.env.BASE_URL_DEV ||
                "http://localhost:3000"
            );

    return base.replace(/\/+$/, "");

}

export async function GET(req) {

    const params =
        new URL(req.url).searchParams;

    const slug =
        String(params.get("slug") || "");

    const token =
        String(params.get("token") || "");

    if (!slug) {

        return guestError(
            "Enlace inválido",
            400
        );

    }

    const origin =
        getPublicOrigin();

    if (!token) {

        return Response.redirect(
            `${origin}/p/${slug}/mi-estadia?access=invalid`
        );

    }

    const connection =
        await db.getConnection();

    try {

        await connection.beginTransaction();

        const [apps] =
            await connection.query(
                `
                SELECT
                    id,
                    status
                FROM tags_guest_apps
                WHERE slug=?
                LIMIT 1
                `,
                [slug]
            );

        if (!apps[0]) {

            await connection.rollback();

            return guestError(
                "La página de Mi Estadía no existe",
                404
            );

        }

        if (apps[0].status !== "published") {

            await connection.rollback();

            return guestError(
                "La página de Mi Estadía todavía no está publicada",
                403
            );

        }

        const [rows] =
            await connection.query(
                `
                SELECT
                    t.*,
                    a.settings_json,
                    s.ends_at,
                    g.document_number
                FROM tags_guest_access_tokens t

                INNER JOIN tags_guest_apps a
                    ON a.id=t.guest_app_id
                    AND a.id=?

                INNER JOIN tags_guest_stays s
                    ON s.id=t.stay_id

                INNER JOIN tags_guest_people g
                    ON g.id=t.guest_id

                WHERE
                    t.token_hash=?
                    AND t.revoked_at IS NULL
                    AND t.expires_at>NOW()

                LIMIT 1
                FOR UPDATE
                `,
                [
                    apps[0].id,
                    hashGuestToken(token)
                ]
            );

        const invitation =
            rows[0];

        if (!invitation) {

            await connection.rollback();

            return Response.redirect(
                `${origin}/p/${slug}/mi-estadia?access=expired`
            );

        }

        const settings =
            parseGuestJson(
                invitation.settings_json
            );

        const graceDays =
            Math.max(
                1,
                Math.min(
                    60,
                    Number(
                        settings.sessionGraceDays || 7
                    )
                )
            );

        const minimumExpiry =
            Date.now() +
            24 * 60 * 60 * 1000;

        const stayExpiry =
            new Date(
                invitation.ends_at
            ).getTime() +
            graceDays * 86400000;

        const expiresAt =
            new Date(
                Math.max(
                    minimumExpiry,
                    stayExpiry
                )
            );

        const sessionToken =
            createGuestToken();

        await connection.query(
            `
            UPDATE tags_guest_access_tokens
            SET
                used_at=COALESCE(used_at,NOW()),
                last_used_at=NOW(),
                use_count=use_count+1
            WHERE id=?
            `,
            [
                invitation.id
            ]
        );

        await connection.query(
            `
            INSERT INTO tags_guest_sessions
            (
                guest_app_id,
                stay_id,
                guest_id,
                session_hash,
                expires_at,
                last_seen_at
            )
            VALUES
            (
                ?,
                ?,
                ?,
                ?,
                ?,
                NOW()
            )
            `,
            [
                invitation.guest_app_id,
                invitation.stay_id,
                invitation.guest_id,
                hashGuestToken(sessionToken),
                expiresAt
            ]
        );

        await connection.query(
            `
            INSERT INTO tags_guest_communications
            (
                guest_app_id,
                stay_id,
                guest_id,
                access_token_id,
                event_code,
                direction,
                channel,
                status,
                sent_at,
                attempts,
                created_by_type
            )
            VALUES
            (
                ?,
                ?,
                ?,
                ?,
                'access_used',
                'inbound',
                'web',
                'completed',
                NOW(),
                1,
                'guest'
            )
            `,
            [
                invitation.guest_app_id,
                invitation.stay_id,
                invitation.guest_id,
                invitation.id
            ]
        );

        await connection.commit();

        (await cookies()).set(
            "tags_guest_session",
            sessionToken,
            {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                path: "/",
                maxAge: Math.max(
                    3600,
                    Math.floor(
                        (
                            expiresAt.getTime() -
                            Date.now()
                        ) / 1000
                    )
                )
            }
        );

        return Response.redirect(
            `${origin}/p/${slug}/mi-estadia`
        );

    } catch (error) {

        await connection.rollback();

        console.error(
            "GUEST SESSION VERIFY ERROR:",
            error
        );

        return Response.json(
            {
                ok: false,
                error: "No se pudo iniciar la sesión"
            },
            {
                status: 500
            }
        );

    } finally {

        connection.release();

    }

}