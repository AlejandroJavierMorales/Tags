import { db } from "@/app/lib/tags-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";



export async function POST(req) {

    try {

        const body = await req.json();

        const {
            name,
            is_digital,
            qr_type_id,
            support_id,
            url_prefix
        } = body;

        // =========================
        // VALIDATIONS
        // =========================

        if (!name?.trim()) {
            return Response.json(
                {
                    ok: false,
                    error: "Nombre requerido"
                },
                {
                    status: 400
                }
            );
        }

        if (!qr_type_id) {
            return Response.json(
                {
                    ok: false,
                    error: "Tipo de QR requerido"
                },
                {
                    status: 400
                }
            );
        }

        if (!support_id) {
            return Response.json(
                {
                    ok: false,
                    error: "Soporte requerido"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // VERIFY QR TYPE
        // =========================

        const [qrTypeRows] = await db.execute(
            `
            SELECT id, name
            FROM tags_qr_types
            WHERE id = ?
            LIMIT 1
            `,
            [qr_type_id]
        );

        if (!qrTypeRows.length) {
            return Response.json(
                {
                    ok: false,
                    error: "Tipo QR inválido"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // VERIFY SUPPORT
        // =========================

        const [supportRows] = await db.execute(
            `
            SELECT id, name, is_digital
            FROM tags_supports
            WHERE id = ?
            LIMIT 1
            `,
            [support_id]
        );

        if (!supportRows.length) {
            return Response.json(
                {
                    ok: false,
                    error: "Soporte inválido"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // DUPLICATE CHECK
        // =========================

        const [duplicateRows] = await db.execute(
            `
            SELECT id
            FROM tags_products
            WHERE name = ?
            LIMIT 1
            `,
            [name.trim()]
        );

        if (duplicateRows.length) {
            return Response.json(
                {
                    ok: false,
                    error: "Ya existe un producto con ese nombre"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // INSERT
        // =========================

        const [result] = await db.execute(
            `
            INSERT INTO tags_products
            (
                name,
                is_digital,
                qr_type_id,
                support_id,
                url_prefix
            )
            VALUES (?, ?, ?, ?, ?)
            `,
            [
                name.trim(),
                is_digital ? 1 : 0,
                qr_type_id,
                support_id,
                url_prefix
            ]
        );

        // =========================
        // RESPONSE
        // =========================

        return Response.json({
            ok: true,
            id: result.insertId,
            message: "Producto creado correctamente"
        });

    } catch (err) {

        console.error("CREATE PRODUCT ERROR:", err);

        return Response.json(
            {
                ok: false,
                error: err.message || "Internal server error"
            },
            {
                status: 500
            }
        );
    }
}