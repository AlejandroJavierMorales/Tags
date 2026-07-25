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

export async function POST(req) {

    try {

        const {
            storeId
        } = await req.json();

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