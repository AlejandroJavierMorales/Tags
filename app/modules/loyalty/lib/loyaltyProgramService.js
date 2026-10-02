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
        `SELECT * FROM tags_loyalty_programs
          WHERE business_id=?
          ORDER BY status='active' DESC,id ASC
          LIMIT 1`,
        [businessId]
    );
    return rows[0] || null;
}

export async function getProgramsByBusinessId(businessId, connection = db) {
    await requireActiveLoyaltyAddon(businessId, connection);
    const [rows] = await connection.query(
        `SELECT * FROM tags_loyalty_programs
          WHERE business_id=?
          ORDER BY status='active' DESC,id ASC`,
        [businessId]
    );
    return rows;
}

export async function getProgramById(programId, businessId, connection = db) {
    await requireActiveLoyaltyAddon(businessId, connection);
    const [rows] = await connection.query(
        `SELECT * FROM tags_loyalty_programs WHERE id=? AND business_id=? LIMIT 1`,
        [programId, businessId]
    );
    return rows[0] || null;
}

export async function saveProgram({ programId = null, businessId, directorySiteId = null, stampAssetId = null, name, description = null, mechanic = "points", settings = null, status = "active" }, connection = db) {
    await requireActiveLoyaltyAddon(businessId, connection);

    if (!LOYALTY_MECHANICS.has(mechanic)) {
        throw new Error("La modalidad de fidelización no es válida");
    }

    if (!["active", "inactive"].includes(status)) throw new Error("El estado del programa no es valido");
    const cleanName = String(name || "").trim();
    if (!cleanName) throw new Error("El programa necesita un nombre");

    const values = [
        directorySiteId,
        stampAssetId || null,
        cleanName,
        description ? String(description).trim() : null,
        mechanic,
        status,
        JSON.stringify(settings || {})
    ];
    if (Number(programId)) {
        const [result] = await connection.query(
            `UPDATE tags_loyalty_programs
                SET directory_site_id=?,stamp_asset_id=?,name=?,description=?,mechanic=?,status=?,settings_json=?,updated_at=NOW()
              WHERE id=? AND business_id=?`,
            [...values, Number(programId), businessId]
        );
        if (!result.affectedRows) throw new Error("Programa no encontrado");
        return getProgramById(Number(programId), businessId, connection);
    }
    const [result] = await connection.query(
        `INSERT INTO tags_loyalty_programs
            (business_id,directory_site_id,stamp_asset_id,name,description,mechanic,status,settings_json)
         VALUES (?,?,?,?,?,?,?,COALESCE(?, JSON_OBJECT()))`,
        [businessId, ...values]
    );
    return getProgramById(result.insertId, businessId, connection);
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
