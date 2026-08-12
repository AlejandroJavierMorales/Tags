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

function clean(value) {
    return String(value || "").trim();
}

async function getStoreId(
    connection,
    businessId
) {
    const [rows] =
        await connection.query(
            `
            SELECT id
            FROM tags_stores
            WHERE business_id = ?
            AND app_type = 'resto'
            LIMIT 1
            `,
            [businessId]
        );

    return rows[0]?.id || null;
}

export async function GET(req) {
    try {
        const {
            searchParams
        } =
            new URL(req.url);

        const businessId =
            searchParams.get(
                "businessId"
            );

        const auditPeriod =
            clean(
                searchParams.get(
                    "auditPeriod"
                ) ||
                "today"
            ).toLowerCase();

        const auditFrom =
            clean(
                searchParams.get(
                    "auditFrom"
                )
            );

        const auditTo =
            clean(
                searchParams.get(
                    "auditTo"
                )
            );

        const access =
            await getRestoAccess({
                businessId,
                permission: "staff.view"
            });

        if (!access.allowed) {
            return restoAccessResponse(
                access
            );
        }

        const storeId =
            await getStoreId(
                db,
                businessId
            );

        if (!storeId) {
            return Response.json(
                {
                    error:
                        "Tags Resto no encontrado"
                },
                { status: 404 }
            );
        }

        const canViewAudit =
            access.isOwner ||
            access.permissions.includes(
                "audit.view"
            );

        let auditDateClause =
            "AND al.created_at >= CURDATE() AND al.created_at < DATE_ADD(CURDATE(), INTERVAL 1 DAY)";
        let auditDateParams =
            [];

        if (
            [
                "7",
                "30",
                "90",
                "365"
            ].includes(
                auditPeriod
            )
        ) {
            auditDateClause =
                "AND al.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)";
            auditDateParams = [
                Number(auditPeriod) -
                    1
            ];
        } else if (
            auditPeriod === "all"
        ) {
            auditDateClause =
                "";
        } else if (
            auditPeriod === "custom" &&
            /^\d{4}-\d{2}-\d{2}$/.test(
                auditFrom
            ) &&
            /^\d{4}-\d{2}-\d{2}$/.test(
                auditTo
            )
        ) {
            auditDateClause =
                "AND al.created_at >= ? AND al.created_at < DATE_ADD(?, INTERVAL 1 DAY)";
            auditDateParams = [
                auditFrom,
                auditTo
            ];
        }

        const [
            [permissions],
            [roles],
            [rolePermissions],
            [staff],
            [overrides],
            [audit],
            [locations],
            [assignments],
            [notificationPreferences]
        ] = await Promise.all([
            db.query(
                `
                SELECT *
                FROM tags_resto_permissions
                ORDER BY
                    module_name,
                    description
                `
            ),
            db.query(
                `
                SELECT *
                FROM tags_resto_roles
                WHERE store_id = ?
                ORDER BY
                    is_system DESC,
                    name
                `,
                [storeId]
            ),
            db.query(
                `
                SELECT
                    rp.role_id,
                    p.code
                FROM tags_resto_role_permissions rp
                INNER JOIN tags_resto_permissions p
                    ON p.id = rp.permission_id
                INNER JOIN tags_resto_roles r
                    ON r.id = rp.role_id
                WHERE r.store_id = ?
                `,
                [storeId]
            ),
            db.query(
                `
                SELECT
                    st.*,
                    r.name AS role_name
                FROM tags_resto_staff st
                LEFT JOIN tags_resto_roles r
                    ON r.id = st.role_id
                WHERE st.store_id = ?
                ORDER BY
                    st.status = 'active' DESC,
                    st.name
                `,
                [storeId]
            ),
            db.query(
                `
                SELECT
                    spo.staff_id,
                    p.code,
                    spo.effect
                FROM tags_resto_staff_permission_overrides spo
                INNER JOIN tags_resto_permissions p
                    ON p.id = spo.permission_id
                INNER JOIN tags_resto_staff st
                    ON st.id = spo.staff_id
                WHERE st.store_id = ?
                `,
                [storeId]
            ),
            canViewAudit
                ? db.query(
                    `
                    SELECT
                        al.*,
                        st.email AS staff_email
                    FROM tags_resto_audit_log al
                    LEFT JOIN tags_resto_staff st
                        ON st.id = al.staff_id
                        AND st.store_id = al.store_id
                    WHERE al.store_id = ?
                    ${auditDateClause}
                    ORDER BY
                        al.created_at DESC,
                        al.id DESC
                    LIMIT 1000
                    `,
                    [
                        storeId,
                        ...auditDateParams
                    ]
                )
                : Promise.resolve(
                    [
                        []
                    ]
                ),
            db.query(
                `
                SELECT id, name, location_code, parent_id
                FROM tags_resto_locations
                WHERE store_id = ?
                AND location_type = 'table'
                AND is_active = 1
                ORDER BY sort_order, name
                `,
                [storeId]
            ),
            db.query(
                `
                SELECT staff_id, location_id
                FROM tags_resto_staff_location_assignments
                WHERE store_id = ?
                AND is_active = 1
                `,
                [storeId]
            ),
            db.query(
                `
                SELECT staff_id, notification_code, scope
                FROM tags_resto_staff_notification_preferences
                WHERE store_id = ?
                `,
                [storeId]
            )
        ]);

        return Response.json({
            ok: true,
            canManage:
                access.isOwner ||
                access.permissions.includes(
                    "staff.manage"
                ),
            canViewAudit,
            permissions,
            locations,
            assignments,
            notificationPreferences,
            roles: roles.map(role => ({
                ...role,
                permissions:
                    rolePermissions
                        .filter(
                            item =>
                                Number(
                                    item.role_id
                                ) ===
                                Number(
                                    role.id
                                )
                        )
                        .map(item => item.code)
            })),
            staff: staff.map(item => ({
                ...item,
                overrides:
                    overrides
                        .filter(
                            override =>
                                Number(
                                    override.staff_id
                                ) ===
                                Number(
                                    item.id
                                )
                        )
                        .reduce(
                            (
                                result,
                                override
                            ) => ({
                                ...result,
                                [override.code]:
                                    override.effect
                            }),
                            {}
                        ),
                assignedLocationIds: assignments
                    .filter(assignment => Number(assignment.staff_id) === Number(item.id))
                    .map(assignment => Number(assignment.location_id)),
                notificationPreferences: notificationPreferences
                    .filter(preference => Number(preference.staff_id) === Number(item.id))
                    .reduce((result, preference) => ({
                        ...result,
                        [preference.notification_code]: preference.scope
                    }), {})
            })),
            audit
        });
    } catch (error) {
        console.error(
            "RESTO STAFF GET ERROR:",
            error
        );
        return Response.json(
            {
                error:
                    "No se pudo cargar Personal"
            },
            { status: 500 }
        );
    }
}

export async function POST(req) {
    let connection;

    try {
        const body =
            await req.json();

        const businessId =
            clean(body?.businessId);

        const access =
            await getRestoAccess({
                businessId,
                permission: "staff.manage"
            });

        if (!access.allowed) {
            return restoAccessResponse(
                access
            );
        }

        connection =
            await db.getConnection();
        await connection.beginTransaction();

        const storeId =
            await getStoreId(
                connection,
                businessId
            );

        if (!storeId) {
            throw Object.assign(
                new Error(
                    "Tags Resto no encontrado"
                ),
                { status: 404 }
            );
        }

        if (body.action === "save_staff") {
            const id =
                Number(body.staff?.id || 0);
            const name =
                clean(body.staff?.name);
            const email =
                clean(
                    body.staff?.email
                ).toLowerCase();
            const roleId =
                Number(
                    body.staff?.role_id || 0
                ) || null;
            const status =
                body.staff?.status === "inactive"
                    ? "inactive"
                    : "active";

            if (!name || !email) {
                throw Object.assign(
                    new Error(
                        "Nombre y email son requeridos"
                    ),
                    { status: 400 }
                );
            }

            if (roleId) {
                const [roleRows] =
                    await connection.query(
                        `
                        SELECT id
                        FROM tags_resto_roles
                        WHERE id = ?
                        AND store_id = ?
                        LIMIT 1
                        `,
                        [roleId, storeId]
                    );

                if (!roleRows.length) {
                    throw Object.assign(
                        new Error(
                            "Rol inválido"
                        ),
                        { status: 400 }
                    );
                }
            }

            let staffId = id;

            if (id) {
                const [result] =
                    await connection.query(
                        `
                        UPDATE tags_resto_staff
                        SET
                            role_id = ?,
                            name = ?,
                            email = ?,
                            phone = ?,
                            notes = ?,
                            status = ?
                        WHERE id = ?
                        AND store_id = ?
                        `,
                        [
                            roleId,
                            name,
                            email,
                            clean(
                                body.staff?.phone
                            ) || null,
                            clean(
                                body.staff?.notes
                            ) || null,
                            status,
                            id,
                            storeId
                        ]
                    );

                if (!result.affectedRows) {
                    throw Object.assign(
                        new Error(
                            "Empleado inexistente"
                        ),
                        { status: 404 }
                    );
                }
            } else {
                const [result] =
                    await connection.query(
                        `
                        INSERT INTO tags_resto_staff
                        (
                            store_id,
                            role_id,
                            name,
                            email,
                            phone,
                            notes,
                            status
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        `,
                        [
                            storeId,
                            roleId,
                            name,
                            email,
                            clean(
                                body.staff?.phone
                            ) || null,
                            clean(
                                body.staff?.notes
                            ) || null,
                            status
                        ]
                    );
                staffId =
                    result.insertId;
            }

            const overrides =
                body.staff?.overrides &&
                typeof body.staff
                    .overrides === "object"
                    ? body.staff.overrides
                    : {};

            await connection.query(
                `
                DELETE FROM
                    tags_resto_staff_permission_overrides
                WHERE staff_id = ?
                `,
                [staffId]
            );

            for (
                const [
                    code,
                    effect
                ] of Object.entries(overrides)
            ) {
                if (
                    ![
                        "allow",
                        "deny"
                    ].includes(effect)
                ) {
                    continue;
                }

                await connection.query(
                    `
                    INSERT INTO
                        tags_resto_staff_permission_overrides
                    (
                        staff_id,
                        permission_id,
                        effect
                    )
                    SELECT
                        ?,
                        id,
                        ?
                    FROM tags_resto_permissions
                    WHERE code = ?
                    `,
                    [
                        staffId,
                        effect,
                        code
                    ]
                );
            }

            const assignedLocationIds = Array.isArray(body.staff?.assignedLocationIds)
                ? [...new Set(body.staff.assignedLocationIds.map(value => Number(value)).filter(Boolean))]
                : [];

            if (assignedLocationIds.length) {
                const placeholders = assignedLocationIds.map(() => "?").join(",");
                const [validLocations] = await connection.query(
                    `
                    SELECT id
                    FROM tags_resto_locations
                    WHERE store_id = ?
                    AND location_type = 'table'
                    AND is_active = 1
                    AND id IN (${placeholders})
                    `,
                    [storeId, ...assignedLocationIds]
                );

                if (validLocations.length !== assignedLocationIds.length) {
                    throw Object.assign(new Error("Una o más mesas no son válidas"), { status: 400 });
                }
            }

            await connection.query(
                `DELETE FROM tags_resto_staff_location_assignments WHERE store_id = ? AND staff_id = ?`,
                [storeId, staffId]
            );

            for (const locationId of assignedLocationIds) {
                await connection.query(
                    `
                    INSERT INTO tags_resto_staff_location_assignments
                        (store_id, staff_id, location_id, assignment_type, is_active)
                    VALUES (?, ?, ?, 'permanent', 1)
                    `,
                    [storeId, staffId, locationId]
                );
            }

            const notificationPreferences = body.staff?.notificationPreferences && typeof body.staff.notificationPreferences === "object"
                ? body.staff.notificationPreferences
                : {};

            await connection.query(
                `DELETE FROM tags_resto_staff_notification_preferences WHERE store_id = ? AND staff_id = ?`,
                [storeId, staffId]
            );

            for (const [notificationCode, scope] of Object.entries(notificationPreferences)) {
                if (!["none", "assigned", "all", "unassigned"].includes(scope)) {
                    continue;
                }

                await connection.query(
                    `
                    INSERT INTO tags_resto_staff_notification_preferences
                        (store_id, staff_id, notification_code, scope)
                    VALUES (?, ?, ?, ?)
                    `,
                    [storeId, staffId, clean(notificationCode), scope]
                );
            }

            await logRestoAudit(
                connection,
                {
                    storeId,
                    access,
                    actionCode:
                        id
                            ? "staff.updated"
                            : "staff.created",
                    entityType: "staff",
                    entityId: staffId,
                    description: name,
                    req
                }
            );
        } else if (
            body.action === "save_role"
        ) {
            const id =
                Number(body.role?.id || 0);
            const name =
                clean(body.role?.name);
            const code =
                clean(body.role?.code)
                    .toLowerCase()
                    .replace(
                        /[^a-z0-9_-]+/g,
                        "-"
                    )
                    .replace(
                        /^-+|-+$/g,
                        ""
                    );

            if (!name || (!id && !code)) {
                throw Object.assign(
                    new Error(
                        "Nombre y código son requeridos"
                    ),
                    { status: 400 }
                );
            }

            let roleId = id;

            if (id) {
                const [result] =
                    await connection.query(
                        `
                        UPDATE tags_resto_roles
                        SET
                            name = ?,
                            description = ?,
                            is_active = ?
                        WHERE id = ?
                        AND store_id = ?
                        `,
                        [
                            name,
                            clean(
                                body.role
                                    ?.description
                            ) || null,
                            body.role
                                ?.is_active === false
                                ? 0
                                : 1,
                            id,
                            storeId
                        ]
                    );

                if (!result.affectedRows) {
                    throw Object.assign(
                        new Error(
                            "Rol inexistente"
                        ),
                        { status: 404 }
                    );
                }
            } else {
                const [result] =
                    await connection.query(
                        `
                        INSERT INTO tags_resto_roles
                        (
                            store_id,
                            code,
                            name,
                            description,
                            is_system,
                            is_active
                        )
                        VALUES (?, ?, ?, ?, 0, 1)
                        `,
                        [
                            storeId,
                            code,
                            name,
                            clean(
                                body.role
                                    ?.description
                            ) || null
                        ]
                    );
                roleId =
                    result.insertId;
            }

            await logRestoAudit(
                connection,
                {
                    storeId,
                    access,
                    actionCode:
                        id
                            ? "role.updated"
                            : "role.created",
                    entityType: "role",
                    entityId: roleId,
                    description: name,
                    req
                }
            );
        } else if (
            body.action ===
            "save_role_permissions"
        ) {
            const roleId =
                Number(body.roleId || 0);

            const [roleRows] =
                await connection.query(
                    `
                    SELECT id
                    FROM tags_resto_roles
                    WHERE id = ?
                    AND store_id = ?
                    LIMIT 1
                    `,
                    [roleId, storeId]
                );

            if (!roleRows.length) {
                throw Object.assign(
                    new Error(
                        "Rol inexistente"
                    ),
                    { status: 404 }
                );
            }

            await connection.query(
                `
                DELETE FROM
                    tags_resto_role_permissions
                WHERE role_id = ?
                `,
                [roleId]
            );

            for (
                const code of
                    Array.isArray(
                        body.permissions
                    )
                        ? body.permissions
                        : []
            ) {
                await connection.query(
                    `
                    INSERT INTO
                        tags_resto_role_permissions
                    (
                        role_id,
                        permission_id
                    )
                    SELECT
                        ?,
                        id
                    FROM tags_resto_permissions
                    WHERE code = ?
                    `,
                    [roleId, code]
                );
            }

            await logRestoAudit(
                connection,
                {
                    storeId,
                    access,
                    actionCode:
                        "role.permissions.updated",
                    entityType: "role",
                    entityId: roleId,
                    req
                }
            );
        } else {
            throw Object.assign(
                new Error(
                    "Acción inválida"
                ),
                { status: 400 }
            );
        }

        await connection.commit();

        return Response.json({
            ok: true
        });
    } catch (error) {
        if (connection) {
            await connection
                .rollback()
                .catch(() => {});
        }

        const duplicate =
            error.code ===
            "ER_DUP_ENTRY";

        return Response.json(
            {
                error:
                    duplicate
                        ? "Ese email ya pertenece a otro empleado del restaurante"
                        : error.message ||
                        "No se pudo guardar"
            },
            {
                status:
                    duplicate
                        ? 409
                        : error.status || 500
            }
        );
    } finally {
        connection?.release();
    }
}
