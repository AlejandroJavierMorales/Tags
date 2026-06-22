export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

function cleanPostalCode(value) {
    return String(value || "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "");
}

export async function GET(req) {
    try {
        const { searchParams } =
            new URL(req.url);

        const postalCode =
            cleanPostalCode(
                searchParams.get("postalCode")
            );

        if (!postalCode) {
            return Response.json(
                { error: "Código postal requerido" },
                { status: 400 }
            );
        }

        const [rows] =
            await db.query(
                `
                SELECT
                    id,
                    postal_code,
                    city,
                    state,
                    country
                FROM tags_postal_codes
                WHERE postal_code = ?
                AND is_active = 1
                ORDER BY city ASC
                LIMIT 20
                `,
                [postalCode]
            );

        if (!rows.length) {
            return Response.json(
                {
                    error: "No encontramos ese código postal."
                },
                { status: 404 }
            );
        }

        return Response.json({
            ok: true,
            postalCode,
            results: rows
        });

    } catch (err) {
        console.error(
            "STORE POSTAL CODE LOOKUP ERROR:",
            err
        );

        return Response.json(
            { error: "Error consultando código postal" },
            { status: 500 }
        );
    }
}