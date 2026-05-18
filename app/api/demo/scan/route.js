import { db } from "@/app/lib/tags-db";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {

    try {

        const body = await req.json();

        const {
            code,
            label,
            value
        } = body;


        // =====================================
        // URL VALIDATION
        // =====================================

        const cleanUrl = value?.trim();

        if (!cleanUrl) {

            return NextResponse.json(
                {
                    error: "URL requerida"
                },
                {
                    status: 400
                }
            );
        }

        let parsedUrl;

        try {

            parsedUrl = new URL(cleanUrl);

        } catch {

            return NextResponse.json(
                {
                    error: "URL inválida"
                },
                {
                    status: 400
                }
            );
        }
        // ***********************************
        // ✅ whitelist protocolos permitidos
        // ***********************************
        const allowedProtocols = [
            "http:",
            "https:"
        ];

        if (
            !allowedProtocols.includes(
                parsedUrl.protocol
            )
        ) {

            return NextResponse.json(
                {
                    error:
                        "Protocolo no permitido"
                },
                {
                    status: 400
                }
            );
        }
        // =====================================
        // VALIDATION
        // =====================================

        if (!code) {

            return NextResponse.json(
                {
                    error: "Código requerido"
                },
                {
                    status: 400
                }
            );
        }

        // =====================================
        // UPDATE DEMO QR
        // =====================================

        await db.execute(
            `
            UPDATE tags_qr_codes
            SET
                label = ?,
                demo_preview_url = ?
            WHERE code = ?
            LIMIT 1
            `,
            [
                label || "Demo QR",
                value,
                code
            ]
        );

        return NextResponse.json({
            success: true
        });

    } catch (error) {

        console.log(
            "DEMO UPDATE ERROR:",
            error
        );

        return NextResponse.json(
            {
                error:
                    error.message ||
                    "Error interno"
            },
            {
                status: 500
            }
        );
    }
}