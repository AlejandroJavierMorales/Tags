import {
    getRestoAccess
} from "@/app/modules/resto/lib/staff/getRestoAccess";
import {
    db
} from "@/app/lib/tags-db";

import RestoOperationalAlerts
    from "@/app/modules/resto/components/admin/alerts/RestoOperationalAlerts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function RestoLayout({
    children,
    params
}) {
    const {
        id: businessId
    } = await params;

    const access =
        await getRestoAccess({
            businessId
        });

    let alertsEnabled =
        true;

    if (access.allowed) {
        const [
            rows
        ] =
            await db.query(
                `
                SELECT settings_json
                FROM tags_stores
                WHERE business_id = ?
                AND app_type = 'resto'
                LIMIT 1
                `,
                [
                    businessId
                ]
            );

        try {
            const settings =
                typeof rows[0]?.settings_json ===
                    "object"
                    ? rows[0].settings_json
                    : JSON.parse(
                        rows[0]?.settings_json ||
                        "{}"
                    );

            alertsEnabled =
                settings
                    ?.resto_operation
                    ?.staff_alerts_enabled !==
                false;
        } catch {
            alertsEnabled =
                true;
        }
    }

    return (
        <>
            {children}

            {
                access.allowed &&
                alertsEnabled &&
                (
                    access.permissions.includes("*") ||
                    access.permissions.includes(
                        "orders.view"
                    ) ||
                    access.permissions.includes(
                        "delivery.view"
                    )
                ) && (
                    <RestoOperationalAlerts
                        businessId={businessId}
                        permissions={
                            access.permissions
                        }
                    />
                )
            }
        </>
    );
}
