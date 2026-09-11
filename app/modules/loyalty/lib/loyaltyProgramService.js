// =====================================
// MODULE: Tags Fidelizacion
// Descripcion: Programas y cuentas locales de cada negocio.
// =====================================

import { db } from "@/app/lib/tags-db";
import { requireActiveLoyaltyAddon } from "./loyaltyAccess";
import { LOYALTY_MECHANICS } from "./loyaltyConstants";

export async function getProgramByBusinessId(businessId, connection = db) {
    await requireActiveLoyaltyAddon(businessId, connection);
    const [rows] = await connection.query(
        `SELECT * FROM tags_loyalty_programs WHERE business_id=? LIMIT 1`,
        [businessId]
    );
    return rows[0] || null;
}

export async function saveProgram({ businessId, directorySiteId = null, name, description = null, mechanic = "points", settings = null, status = "active" }, connection = db) {
    await requireActiveLoyaltyAddon(businessId, connection);

    if (!LOYALTY_MECHANICS.has(mechanic)) {
        throw new Error("La modalidad de fidelización no es válida");
    }

    if (!["active", "inactive"].includes(status)) throw new Error("El estado del programa no es valido");
    const cleanName = String(name || "").trim();
    if (!cleanName) throw new Error("El programa necesita un nombre");

    await connection.query(
        `INSERT INTO tags_loyalty_programs
            (business_id,directory_site_id,name,description,mechanic,status,settings_json)
         VALUES (?,?,?,?,?,?,COALESCE(?, JSON_OBJECT()))
         ON DUPLICATE KEY UPDATE
            directory_site_id=VALUES(directory_site_id),
            name=VALUES(name),
            description=VALUES(description),
            mechanic=VALUES(mechanic),
            status=VALUES(status),
            settings_json=VALUES(settings_json),
            updated_at=NOW()`,
        [
            businessId,
            directorySiteId,
            cleanName,
            description ? String(description).trim() : null,
            mechanic,
            status,
            JSON.stringify(settings || {})
        ]
    );

    return getProgramByBusinessId(businessId, connection);
}

export async function ensureAccount(programId, memberId, connection = db) {
    await connection.query(
        `INSERT IGNORE INTO tags_loyalty_accounts (program_id,member_id)
         VALUES (?,?)`,
        [programId, memberId]
    );

    const [rows] = await connection.query(
        `SELECT * FROM tags_loyalty_accounts
          WHERE program_id=? AND member_id=? LIMIT 1`,
        [programId, memberId]
    );

    return rows[0] || null;
}
