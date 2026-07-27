export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
    db
} from "@/app/lib/tags-db";

import {
    getRestoAccess,
    restoAccessResponse
} from "@/app/modules/resto/lib/staff/getRestoAccess";

import {
    logRestoAudit
} from "@/app/modules/resto/lib/staff/restoAudit";

import {
    getDeliveryStore,
    roundDeliveryMoney
} from "@/app/modules/resto/lib/delivery/restoDeliveryService";

const COMMISSION_TYPES = [
    "none",
    "fixed",
    "percentage",
    "fixed_percentage"
];

const EMPLOYMENT_TYPES = [
    "employee",
    "contractor",
    "external"
];

const AVAILABILITY_STATUSES = [
    "available",
    "busy",
    "unavailable"
];

export async function GET(req) {
    const businessId =
        String(
            new URL(req.url)
                .searchParams
                .get("businessId") ||
            ""
        ).trim();

    const access =
        await getRestoAccess({
            businessId,
            permission:
                "delivery.manage"
        });

    if (!access.allowed) {
        return restoAccessResponse(
            access
        );
    }

    const [storeRows] =
        await db.query(
            `
            SELECT id
            FROM tags_stores
            WHERE business_id = ?
            AND app_type = 'resto'
            LIMIT 1
            `,
            [
                businessId
            ]
        );

    const store =
        storeRows[0];

    if (!store) {
        return Response.json(
            {
                error:
                    "Tags Resto no encontrado"
            },
            {
                status:
                    404
            }
        );
    }

    const [rows] =
        await db.query(
            `
            SELECT
                st.id AS staff_id,
                st.name,
                st.email,
                st.phone,
                st.status AS staff_status,
                r.name AS role_name,
                dp.id AS profile_id,
                dp.employment_type,
                dp.commission_type,
                dp.fixed_amount,
                dp.percentage,
                dp.can_collect,
                dp.availability_status,
                dp.is_active,
                dp.notes
            FROM tags_resto_staff st
            LEFT JOIN tags_resto_roles r
                ON r.id = st.role_id
                AND r.store_id = st.store_id
            LEFT JOIN tags_resto_delivery_profiles dp
                ON dp.staff_id = st.id
                AND dp.store_id = st.store_id
            WHERE st.store_id = ?
            ORDER BY
                CASE WHEN dp.id IS NULL THEN 1 ELSE 0 END,
                st.name
            `,
            [
                store.id
            ]
        );

    return Response.json({
        ok:
            true,
        profiles:
            rows
    });
}

export async function POST(req) {
    let connection;

    try {
        const body =
            await req.json();

        const businessId =
            String(
                body?.businessId ||
                ""
            ).trim();

        const staffId =
            Number(
                body?.staffId
            );

        const employmentType =
            String(
                body?.employmentType ||
                "employee"
            ).trim().toLowerCase();

        const commissionType =
            String(
                body?.commissionType ||
                "none"
            ).trim().toLowerCase();

        const availabilityStatus =
            String(
                body?.availabilityStatus ||
                "available"
            ).trim().toLowerCase();

        const fixedAmount =
            roundDeliveryMoney(
                body?.fixedAmount
            );

        const percentage =
            Number(
                body?.percentage ||
                0
            );

        if (
            !businessId ||
            !staffId ||
            !EMPLOYMENT_TYPES.includes(
                employmentType
            ) ||
            !COMMISSION_TYPES.includes(
                commissionType
            ) ||
            !AVAILABILITY_STATUSES.includes(
                availabilityStatus
            ) ||
            fixedAmount < 0 ||
            percentage < 0 ||
            percentage > 100
        ) {
            return Response.json(
                {
                    error:
                        "Configuración de repartidor inválida"
                },
                {
                    status:
                        400
                }
            );
        }

        const access =
            await getRestoAccess({
                businessId,
                permission:
                    "delivery.manage"
            });

        if (!access.allowed) {
            return restoAccessResponse(
                access
            );
        }

        connection =
            await db.getConnection();

        await connection.beginTransaction();

        const store =
            await getDeliveryStore(
                connection,
                businessId,
                {
                    lock:
                        true
                }
            );

        const [staffRows] =
            await connection.query(
                `
                SELECT id, name
                FROM tags_resto_staff
                WHERE id = ?
                AND store_id = ?
                AND status = 'active'
                LIMIT 1
                `,
                [
                    staffId,
                    store?.id ||
                        0
                ]
            );

        const staff =
            staffRows[0];

        if (!staff) {
            throw Object.assign(
                new Error(
                    "Personal no encontrado o inactivo"
                ),
                {
                    status:
                        404
                }
            );
        }

        await connection.query(
            `
            INSERT INTO tags_resto_delivery_profiles (
                store_id,
                staff_id,
                employment_type,
                commission_type,
                fixed_amount,
                percentage,
                can_collect,
                availability_status,
                is_active,
                notes,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ON DUPLICATE KEY UPDATE
                employment_type = VALUES(employment_type),
                commission_type = VALUES(commission_type),
                fixed_amount = VALUES(fixed_amount),
                percentage = VALUES(percentage),
                can_collect = VALUES(can_collect),
                availability_status = VALUES(availability_status),
                is_active = VALUES(is_active),
                notes = VALUES(notes),
                updated_at = NOW()
            `,
            [
                store.id,
                staff.id,
                employmentType,
                commissionType,
                fixedAmount,
                percentage,
                body?.canCollect === false
                    ? 0
                    : 1,
                availabilityStatus,
                body?.isActive === false
                    ? 0
                    : 1,
                String(
                    body?.notes ||
                    ""
                ).trim() ||
                    null
            ]
        );

        await logRestoAudit(
            connection,
            {
                storeId:
                    store.id,
                access,
                actionCode:
                    "delivery.profile.saved",
                entityType:
                    "staff",
                entityId:
                    staff.id,
                description:
                    staff.name,
                metadata: {
                    employment_type:
                        employmentType,
                    commission_type:
                        commissionType,
                    fixed_amount:
                        fixedAmount,
                    percentage,
                    availability_status:
                        availabilityStatus
                },
                req
            }
        );

        await connection.commit();

        return Response.json({
            ok:
                true
        });
    } catch (error) {
        if (connection) {
            await connection
                .rollback()
                .catch(() => {});
        }

        return Response.json(
            {
                error:
                    error.message ||
                    "No se pudo guardar el repartidor"
            },
            {
                status:
                    error.status ||
                    500
            }
        );
    } finally {
        connection?.release();
    }
}
