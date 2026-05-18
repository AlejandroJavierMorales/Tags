import { db } from "@/app/lib/tags-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";



function safe(v) {
    return v === undefined || v === "" ? null : v;
}

export async function POST(req) {
    try {
        const body = await req.json();

        const {
            code,
            name,
            email,
            phone,
            business_id
        } = body;

        // -----------------------------
        // VALIDACIONES
        // -----------------------------
        if (!code) {
            return Response.json(
                { error: "Falta code" },
                { status: 400 }
            );
        }

        if (!name) {
            return Response.json(
                { error: "Nombre requerido" },
                { status: 400 }
            );
        }

        // -----------------------------
        // TRAER QR
        // -----------------------------
        const [qrRows] = await db.execute(
            `SELECT * FROM tags_qr_codes WHERE code = ?`,
            [code]
        );

        const qr = qrRows[0];

        if (!qr) {
            return Response.json(
                { error: "QR no encontrado" },
                { status: 404 }
            );
        }

        // -----------------------------
        // RESOLVER BUSINESS
        // -----------------------------
        let finalBusinessId = business_id || null;

        // 🔹 Si no viene business → buscar por email
        if (!finalBusinessId && email) {
            const [existing] = await db.execute(
                `SELECT id FROM tags_businesses WHERE email = ?`,
                [email]
            );

            if (existing.length > 0) {
                finalBusinessId = existing[0].id;
            }
        }

        // 🔹 Si no existe → crear
        if (!finalBusinessId) {
            const [result] = await db.execute(
                `
        INSERT INTO tags_businesses (name, email, phone)
        VALUES (?, ?, ?)
        `,
                [
                    safe(name),
                    safe(email),
                    safe(phone)
                ]
            );

            finalBusinessId = result.insertId;
        }

        // -----------------------------
        // UPDATE QR (VENTA)
        // -----------------------------
        await db.execute(
            `
      UPDATE tags_qr_codes
      SET
        business_id = ?,
        email = ?,
        label = ?,
        status = 'assigned'
      WHERE code = ?
      `,
            [
                finalBusinessId,
                safe(email),
                qr.label || name, // fallback útil
                code
            ]
        );

        return Response.json({
            ok: true,
            business_id: finalBusinessId,
            status: "pending"
        });

    } catch (err) {
        console.error("ASSIGN QR ERROR:", err);

        return Response.json(
            { error: "Error interno" },
            { status: 500 }
        );
    }
}