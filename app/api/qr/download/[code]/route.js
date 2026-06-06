import { db } from "@/app/lib/tags-db";
import QRCode from "qrcode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req, { params }) {

    try {

        // =========================
        // PARAMS
        // =========================
        const code = params.code;


        const { searchParams } =
            new URL(req.url);

        const format =
            (searchParams.get("format") || "svg")
                .toLowerCase();

        const isPreview =
            searchParams.get("preview") === "1";



        // =========================
        // VALIDATE FORMAT
        // =========================
        const allowedFormats = [
            "svg",
            "png"
        ];

        if (!allowedFormats.includes(format)) {

            return Response.json(
                {
                    error: "Formato inválido"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // GET QR
        // =========================
        const [rows] = await db.execute(
            `
      SELECT
        q.code,
        q.final_url,
        q.label,
        q.status,

        p.name as product_name

      FROM tags_qr_codes q

      LEFT JOIN tags_products p
        ON q.product_id = p.id

      WHERE q.code = ?
      LIMIT 1
      `,
            [code]
        );

        const qr = rows[0];

        // =========================
        // NOT FOUND
        // =========================
        if (!qr) {

            return Response.json(
                {
                    error: "QR no encontrado"
                },
                {
                    status: 404
                }
            );
        }

        // =========================
        // QR OPTIONS
        // =========================
        const qrOptions = {

            errorCorrectionLevel: "H",

            margin: 1,

            width: 1200,

            color: {
                dark: "#111111",
                light: "#FFFFFF"
            }
        };

        const isDev =
            process.env.NODE_ENV === "development";

        const baseUrl = isDev
            ? "http://localhost:3000"
            : "https://www.tags.com.ar";

        const qrTarget =
            `${baseUrl}/t/${qr.code}`;

        /* console.log("QR TARGET:", qrTarget); */

        // =========================
        // SVG
        // =========================
        if (format === "svg") {



            const svg = await QRCode.toString(
                qrTarget,
                {
                    ...qrOptions,
                    type: "svg"
                }
            );

            return new Response(svg, {

                status: 200,

                headers: {

                    "Content-Type":
                        "image/svg+xml",

                    ...(isPreview
                        ? {}
                        : {
                            "Content-Disposition":
                                `attachment; filename="${qr.code}.svg"`
                        }),

                    "Cache-Control":
                        "no-store"
                }
            });
        }

        // =========================
        // PNG
        // =========================
        if (format === "png") {

            const pngBuffer =
                await QRCode.toBuffer(
                    qrTarget,
                    {
                        ...qrOptions,

                        type: "png",

                        width: 2000
                    }
                );

            return new Response(
                new Uint8Array(pngBuffer),
                {

                    status: 200,

                    headers: {

                        "Content-Type":
                            "image/png",

                        ...(isPreview
                            ? {}
                            : {
                                "Content-Disposition":
                                    `attachment; filename="${qr.code}.png"`
                            }),

                        "Cache-Control":
                            "public, max-age=31536000"
                    }
                }
            );
        }

    } catch (err) {

        console.error(
            "DOWNLOAD QR ERROR:",
            err
        );

        return Response.json(
            {
                error: "Error generando QR"
            },
            {
                status: 500
            }
        );
    }
}