import { db } from "@/app/lib/tags-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";



export async function GET(req) {

    try {

        const { searchParams } = new URL(req.url);

        const code = searchParams.get("code");
        /* console.log('Codigo QR Stopped: ' + code) */
        if (!code) {

            return Response.json(
                { error: "Code requerido" },
                { status: 400 }
            );
        }

        const [rows] = await db.execute(
            `
            SELECT stop_message
            FROM tags_qr_codes
            WHERE code = ?
            LIMIT 1
            `,
            [code]
        );

        const qr = rows[0];
        /* console.log('QR Stopped: ' + JSON.stringify(qr)) */
        return Response.json({
            stop_message:
                qr?.stop_message ||
                "QR temporalmente fuera de servicio"
        });

    } catch (err) {

        console.log(err);

        return Response.json(
            { error: "Error interno" },
            { status: 500 }
        );
    }
}