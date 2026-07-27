function getRequestIp(req) {
    if (!req) {
        return null;
    }

    const forwarded =
        req.headers.get(
            "x-forwarded-for"
        );

    return String(
        forwarded?.split(",")[0] ||
        req.headers.get(
            "x-real-ip"
        ) ||
        ""
    ).trim() ||
        null;
}

export async function logRestoAudit(
    connection,
    {
        storeId,
        access = null,
        actionCode,
        entityType = null,
        entityId = null,
        description = null,
        metadata = null,
        req = null,
        staffId = null,
        actorType = null,
        actorName = null
    }
) {
    await connection.query(
        `
        INSERT INTO tags_resto_audit_log (
            store_id,
            staff_id,
            actor_type,
            actor_name,
            action_code,
            entity_type,
            entity_id,
            description,
            metadata_json,
            ip_address,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `,
        [
            storeId,
            staffId ??
                access?.staff?.id ??
                null,
            actorType ||
                (
                    access?.isStaff
                        ? "staff"
                        : "owner"
                ),
            actorName ||
                access?.session?.name ||
                access?.session?.email ||
                null,
            actionCode,
            entityType,
            entityId || null,
            description,
            metadata
                ? JSON.stringify(
                    metadata
                )
                : null,
            getRequestIp(req)
        ]
    );
}
