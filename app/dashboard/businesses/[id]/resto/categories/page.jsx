// =====================================
// FILE: /dashboard/businesses/[id]/resto/categories/page.jsx
// Descripción:
// Administración de categorías de
// Tags Resto.
// =====================================

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/app/lib/tags-db";

import HeaderSwitcher
    from "@/app/components/HeaderSwitcher";

import RestoCategoriesClient
    from "./pageClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Page({
    params
}) {

    const { id } =
        await params;

    const cookieStore =
        await cookies();

    const cookie =
        cookieStore.get(
            "tags_session"
        );

    if (!cookie) {

        redirect("/login");

    }

    let session;

    try {

        session =
            JSON.parse(
                cookie.value
            );

    } catch {

        redirect("/login");

    }

    if (
        session.role === "admin"
    ) {

        return (
            <>
                <HeaderSwitcher />

                <RestoCategoriesClient
                    businessId={id}
                    session={{
                        ...session,
                        businessId:Number(id)
                    }}
                    isAdmin
                />

            </>
        );

    }

    if (
        String(session.businessId) !==
        String(id)
    ) {

        redirect("/login");

    }

    const [rows] =
        await db.execute(`
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
                ON p.id=b.plan_id

            WHERE b.id=?

            LIMIT 1

        `,[id]);

    const business =
        rows[0];

    if (!business) {

        redirect("/login");

    }

    const businessStatus={

        role:"client",

        businessId:
            business.id,

        name:
            business.name,

        email:
            business.email,

        phone:
            business.phone,

        subscriptionStatus:
            business.subscription_status,

        planStartedAt:
            business.plan_started_at,

        planExpiresAt:
            business.plan_expires_at,

        plan:{

            id:
                business.plan_id,

            code:
                business.plan_code,

            name:
                business.plan_name,

            description:
                business.description,

            price:
                business.price,

            currency:
                business.currency,

            maxQrCodes:
                business.max_qr_codes

        }

    };

    return (

        <RestoCategoriesClient
            businessId={business.id}
            session={businessStatus}
            isAdmin={false}
        />

    );

}