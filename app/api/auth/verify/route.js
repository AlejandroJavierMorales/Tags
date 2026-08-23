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


        const redirectUrl =
            session.role === "admin"
                ? `/dashboard`
                :  session.role === "event_client"
                ? `/dashboard/events/${business.id}`
                :`/dashboard/businesses/${business.id}`;


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
