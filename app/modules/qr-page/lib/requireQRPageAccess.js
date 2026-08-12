// src/app/modules/qr-page/lib/requireQRPageAccess.js

import { db } from "@/app/lib/tags-db";
import { getTagsSession } from "./getTagsSession";

export async function requireQRPageAccess(
    businessId,
    options = {}
) {



    const session =
        getTagsSession();

    if (!session) {
        return {
            ok: false,
            status: 401,
            error: "Unauthorized"
        };
    }

    const id =
        Number(businessId);

    if (!id) {
        return {
            ok: false,
            status: 400,
            error: "businessId inválido"
        };
    }

    const [rows] =
        await db.execute(
            `
            SELECT
                id,
                name,
                email,
                phone,
                role,
                qr_page_enabled
            FROM tags_businesses
            WHERE id = ?
            LIMIT 1
            `,
            [id]
        );

    const business =
        rows[0];



    if (!business) {
        return {
            ok: false,
            status: 404,
            error: "Negocio no encontrado"
        };
    }

    const isAdmin =
        session.role === "admin";

    const isOwner =
        Number(session.businessId) === Number(business.id);

    if (!isAdmin && !isOwner) {
        return {
            ok: false,
            status: 403,
            error: "No tenés permiso para acceder a este negocio"
        };
    }

    const skipQRPageValidation =
        options.skipQRPageValidation === true;

    if (
        !isAdmin &&
        !skipQRPageValidation &&
        !business.qr_page_enabled
    ) {
        return {
            ok: false,
            status: 403,
            error: "QR-Page no está habilitado para este negocio"
        };
    }

    return {
        ok: true,
        session,
        business
    };
}
