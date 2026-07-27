// =====================================
// API: /api/resto/admin/reinstall-template
// Descripción:
// Reinstala la plantilla pública de un
// resto (solo desarrollo).
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { installRestoTemplate }
    from "@/app/modules/resto/lib/installRestoTemplate";

import {
    db
} from "@/app/lib/tags-db";

import {
    getRestoAccess,
    restoAccessResponse
} from "@/app/modules/resto/lib/staff/getRestoAccess";

export async function POST(req) {

    try {

        if (
            process.env.NODE_ENV !==
            "development"
        ) {
            return Response.json(
                {
                    error:
                        "Endpoint no disponible"
                },
                {
                    status: 404
                }
            );
        }

        const {
            storeId
        } = await req.json();

        const [
            storeRows
        ] =
            await db.query(
                `
                SELECT business_id
                FROM tags_stores
                WHERE id = ?
                AND app_type = 'resto'
                LIMIT 1
                `,
                [
                    storeId
                ]
            );

        const businessId =
            storeRows[0]?.business_id;

        if (!businessId) {
            return Response.json(
                {
                    error:
                        "Tags Resto no encontrado"
                },
                {
                    status: 404
                }
            );
        }

        const access =
            await getRestoAccess({
                businessId,
                ownerOnly: true
            });

        if (!access.allowed) {
            return restoAccessResponse(
                access
            );
        }

        await installRestoTemplate(storeId);

        return Response.json({
            ok: true
        });

    } catch (err) {

        console.error(err);

        return Response.json(
            {
                error: err.message
            },
            {
                status: 500
            }
        );

    }

}
