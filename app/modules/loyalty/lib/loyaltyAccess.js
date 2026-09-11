// =====================================
// MODULE: Tags Fidelizacion
// Descripcion: Control de acceso del addon para negocios.
// =====================================

import { db } from "@/app/lib/tags-db";
import { LOYALTY_ADDON_CODE } from "./loyaltyConstants";

export async function getActiveLoyaltyAddon(businessId, connection = db) {
    const [rows] = await connection.query(
        `SELECT id,business_id,addon_code,quantity,status,started_at,expires_at
           FROM tags_business_addons
          WHERE business_id=?
            AND addon_code=?
            AND status='active'
            AND (expires_at IS NULL OR expires_at>=NOW())
          ORDER BY id DESC
          LIMIT 1`,
        [businessId, LOYALTY_ADDON_CODE]
    );

    return rows[0] || null;
}

export async function requireActiveLoyaltyAddon(businessId, connection = db) {
    const addon = await getActiveLoyaltyAddon(businessId, connection);
    if (!addon) {
        const error = new Error("El negocio no tiene Tags Fidelización activo");
        error.code = "LOYALTY_ADDON_REQUIRED";
        throw error;
    }
    return addon;
}
