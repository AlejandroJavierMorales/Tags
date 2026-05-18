// page.jsx

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/app/lib/tags-db";

import HeaderSwitcher from "@/app/components/HeaderSwitcher";
import BusinessDetailClient from "./pageClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Page({ params }) {

    const { id } = await params;

    // =====================================
    // 🔐 COOKIE SESSION
    // =====================================

    const cookieStore = await cookies();

    const cookie =
        cookieStore.get("tags_session");

    if (!cookie) {

        return redirect("/login");
    }

    let parsed;

    try {

        parsed =
            JSON.parse(cookie.value);

    } catch (err) {

        console.error(
            "INVALID SESSION:",
            err
        );

        return redirect("/login");
    }

    // =====================================
    // ✅ ADMIN ACCESS
    // =====================================

    if (parsed?.role === "admin") {

        return (
            <>
                <HeaderSwitcher />

                <BusinessDetailClient
                    session={parsed}
                    isAdmin={true}
                />
            </>
        );
    }

    // =====================================
    // 🔒 BUSINESS OWNER VALIDATION
    // =====================================

    if (
        String(parsed?.businessId)
        !== String(id)
    ) {

        return redirect("/login");
    }

    // =====================================
    // 🔥 BUSINESS REALTIME STATUS
    // =====================================

    const [rows] = await db.execute(`
        SELECT

            b.id,
            b.name,
            b.email,
            b.phone,

            b.subscription_status,
            b.plan_started_at,
            b.plan_expires_at,

            p.id AS plan_id,
            p.code AS plan_code,
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

        WHERE b.id = ?
        LIMIT 1
    `, [id]);

    const business = rows[0];

    if (!business) {

        return redirect("/login");
    }

    const businessStatus = {

        role: "client",

        businessId: business.id,

        name: business.name,

        email: business.email,

        phone: business.phone,

        subscriptionStatus:
            business.subscription_status,

        planStartedAt:
            business.plan_started_at,

        planExpiresAt:
            business.plan_expires_at,

        plan: {

            id: business.plan_id,

            code: business.plan_code,

            name: business.plan_name,

            description: business.description,

            price: business.price,

            currency: business.currency,

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

    return (
        <BusinessDetailClient
            session={businessStatus}
            isAdmin={false}
        />
    );
}