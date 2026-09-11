import { db } from "@/app/lib/tags-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { signTagsSession } from "@/app/lib/signTagsSession";
import {
    canBusinessAccessChannel,
    getChannelContextFromHost,
    getRequestBaseUrl,
    getRequestHost,
} from "@/app/lib/channelContext";


export async function GET(req) {

    try {

        const { searchParams } = new URL(req.url);

        const token = searchParams.get("token");
        const requestedReturnTo = String(searchParams.get("returnTo") || "");
        const safeReturnTo = requestedReturnTo.startsWith("/") && !requestedReturnTo.startsWith("//") ? requestedReturnTo : "";

        if (!token) {

            return new Response(
                "Token requerido",
                { status: 400 }
            );
        }

        // =====================================
        // 🔍 TOKEN
        // =====================================

        const [tokenRows] = await db.execute(`
            SELECT *
            FROM tags_auth_tokens
            WHERE token = ?
            AND expires_at > NOW()
            LIMIT 1
        `, [token]);

        const authRecord = tokenRows[0];

        if (!authRecord) {
            let userTokenRows = [];
            try {
                [userTokenRows] = await db.execute(`
                    SELECT t.*,u.email AS user_email,u.first_name,u.last_name,u.status AS user_status
                      FROM tags_user_auth_tokens t
                      INNER JOIN tags_users u ON u.id=t.user_id
                     WHERE t.token=? AND t.expires_at>NOW() AND t.used_at IS NULL
                     LIMIT 1
                `, [token]);
            } catch (error) {
                if (!String(error?.code || "").includes("NO_SUCH_TABLE")) throw error;
            }

            const userToken = userTokenRows[0];
            if (userToken && userToken.user_status === "active") {
                const channel = await getChannelContextFromHost(getRequestHost(req));
                if (channel.siteId && userToken.context_code !== channel.code) {
                    return new Response("El enlace pertenece a otro contexto", { status: 403 });
                }

                const session = {
                    role: "user",
                    userId: userToken.user_id,
                    businessId: null,
                    name: `${userToken.first_name} ${userToken.last_name}`.trim(),
                    email: userToken.user_email,
                    channelCode: channel.code,
                    channelSiteId: channel.siteId,
                };
                const baseUrl = getRequestBaseUrl(req);
                if (!baseUrl) throw new Error("AUTH_PUBLIC_URL_UNAVAILABLE");
                const response = NextResponse.redirect(`${baseUrl}${safeReturnTo || "/mi-cuenta"}`);
                const sessionValue = JSON.stringify(session);
                const sessionSignature = signTagsSession(sessionValue);

                await db.execute(`UPDATE tags_user_auth_tokens SET used_at=NOW() WHERE id=?`, [userToken.id]);
                await db.execute(`UPDATE tags_users SET email_verified_at=COALESCE(email_verified_at,NOW()),last_login_at=NOW(),updated_at=NOW() WHERE id=?`, [userToken.user_id]);
                response.cookies.set("tags_session", sessionValue, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 });
                response.cookies.set("tags_session_sig", sessionSignature, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 });
                return response;
            }
        }

        if (!authRecord) {

            return new Response(
                "Token inválido o expirado",
                { status: 400 }
            );
        }

        // =====================================
        // 🔍 BUSINESS + PLAN
        // =====================================

        const [rows] = await db.execute(`
            SELECT

                b.id,
                b.name,
                b.email,
                b.phone,
                b.panel_entry_key,
                b.role, -- 🔥 AGREGADO

                b.plan_id,
                b.subscription_status,
                b.plan_started_at,
                b.plan_expires_at,

                p.code,
                p.name AS plan_name,
                p.description,
                p.price,
                p.currency,

                p.max_qr_codes,

                p.dashboard_enabled,
                p.reports_enabled,
                p.reports_email_enabled,
                p.reports_whatsapp_enabled,

                p.analytics_enabled,
                p.analytics_plus_enabled,

                p.allow_pause_qr,
                p.allow_edit_qr,

                p.priority_support

            FROM tags_businesses b

            LEFT JOIN tags_plans p
                ON p.id = b.plan_id

            WHERE b.email = ?
            LIMIT 1
        `, [authRecord.email]);

        const business = rows[0];

        if (!business) {

            return new Response(
                "Cliente no encontrado",
                { status: 404 }
            );
        }

        const channel = await getChannelContextFromHost(getRequestHost(req));
        const allowed = business.role === "admin"
            ? channel.isTags
            : await canBusinessAccessChannel({ businessId: business.id, channel });

        if (!allowed) {
            return new Response(
                "Este cliente no está habilitado para este canal",
                { status: 403 }
            );
        }

        // =====================================
        // 🧹 DELETE TOKEN
        // =====================================

        // =====================================
        // 🍪 SESSION
        // =====================================

        const session = {

            role: business.role || "client", // 🔥 AGREGADO

            businessId: business.id,

            name: business.name,

            email: business.email,

            phone: business.phone,

            channelCode: channel.code,

            channelSiteId: channel.siteId,

            panelEntryKey: business.panel_entry_key || "panel",

            subscriptionStatus:
                business.subscription_status,

            planStartedAt:
                business.plan_started_at,

            planExpiresAt:
                business.plan_expires_at,

            plan: {

                id: business.plan_id,

                code: business.code || "basic",

                name:
                    business.plan_name || "Plan Básico",

                description:
                    business.description,

                price:
                    business.price,

                currency:
                    business.currency,

                maxQrCodes:
                    business.max_qr_codes,

                permissions: {

                    dashboard:
                        !!business.dashboard_enabled,

                    reports:
                        !!business.reports_enabled,

                    reportsEmail:
                        !!business.reports_email_enabled,

                    reportsWhatsapp:
                        !!business.reports_whatsapp_enabled,

                    analytics:
                        !!business.analytics_enabled,

                    analyticsPlus:
                        !!business.analytics_plus_enabled,

                    pauseQr:
                        !!business.allow_pause_qr,

                    editQr:
                        !!business.allow_edit_qr,

                    prioritySupport:
                        !!business.priority_support
                }
            }
        };

        // =====================================
        // 🚀 REDIRECT
        // =====================================


        const businessReturnTo = safeReturnTo.startsWith(`/dashboard/businesses/${business.id}/`)
            ? safeReturnTo
            : "";

        const redirectUrl =
            session.role === "admin"
                ? `/dashboard`
                : session.role === "event_client"
                ? `/dashboard/events/${business.id}`
                : (businessReturnTo || ({
                    guest_experience: `/dashboard/businesses/${business.id}/guest-experience`,
                    store: `/dashboard/businesses/${business.id}/store`,
                    resto: `/dashboard/businesses/${business.id}/resto`,
                    turnos: `/dashboard/businesses/${business.id}/turnos`,
                    client_reviews: `/dashboard/businesses/${business.id}/resto/reviews`,
                    qr_agency: `/dashboard/businesses/${business.id}/qr-agency`,
                    ai_chatbot: `/dashboard/businesses/${business.id}/ai-chat`,
                    google_business_profile: `/dashboard/businesses/${business.id}/google-business-profile`,
                    loyalty: `/dashboard/businesses/${business.id}/loyalty`,
                    directory: `/dashboard/businesses/${business.id}/directory`,
                    portal_public: `/dashboard/businesses/${business.id}/portal`,
                }[business.panel_entry_key] || `/dashboard/businesses/${business.id}`));


        const baseUrl = getRequestBaseUrl(req);
        if (!baseUrl) throw new Error("AUTH_PUBLIC_URL_UNAVAILABLE");

        const response = NextResponse.redirect(
            `${baseUrl}${redirectUrl}`
        );

        const sessionValue =
            JSON.stringify(session);

        const sessionSignature = signTagsSession(sessionValue);

        // El token se consume recién cuando la sesión ya pudo construirse y firmarse.
        await db.execute(`
            DELETE FROM tags_auth_tokens
            WHERE token = ?
        `, [token]);

        response.cookies.set(
            "tags_session",
            sessionValue,
            {
                httpOnly: true,
                sameSite: "lax",
                secure:
                    process.env.NODE_ENV === "production",
                path: "/",
                maxAge: 60 * 60 * 24 * 7
            }
        );

        response.cookies.set(
            "tags_session_sig",
            sessionSignature,
            {
                httpOnly: true,
                sameSite: "lax",
                secure:
                    process.env.NODE_ENV === "production",
                path: "/",
                maxAge: 60 * 60 * 24 * 7
            }
        );

        return response;

    } catch (error) {

        const diagnosticCode = error?.code || (String(error?.message || "").startsWith("AUTH_") ? error.message : "AUTH_VERIFY_FAILED");
        console.error("AUTH VERIFY ERROR", { diagnosticCode, error });

        return new Response(
            `Error interno [${diagnosticCode}]`,
            { status: 500 }
        );
    }
}
