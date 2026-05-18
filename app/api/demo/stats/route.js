import { db } from "@/app/lib/tags-db";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


export async function GET(req) {

    try {

        const { searchParams } =
            new URL(req.url);

        const code =
            searchParams.get("code") ||
            "DEMO001";

        // =============================
        // GET QR
        // =============================

        const [qrRows] = await db.execute(
            `
            SELECT
                id,
                code,
                label,
                final_url,
                total_clicks,
                last_click_at
            FROM tags_qr_codes
            WHERE code = ?
            LIMIT 1
            `,
            [code]
        );

        const qr = qrRows[0];

        if (!qr) {

            return NextResponse.json(
                {
                    error: "QR no encontrado"
                },
                {
                    status: 404
                }
            );
        }

        // =============================
        // TOTALS
        // =============================

        const [totalsRows] = await db.execute(
            `
            SELECT
                COUNT(*) AS scans,
                COALESCE(SUM(is_unique), 0) AS unique_scans
            FROM tags_clicks
            WHERE qr_code_id = ?
            `,
            [qr.id]
        );

        const totals =
            totalsRows[0] || {};

        // =============================
        // TODAY CLICKS
        // =============================

        const [todayRows] = await db.execute(
            `
            SELECT
                COUNT(*) AS today_clicks
            FROM tags_clicks
            WHERE qr_code_id = ?
            AND DATE(created_at) = CURDATE()
            `,
            [qr.id]
        );

        const todayClicks =
            Number(
                todayRows[0]?.today_clicks || 0
            );

        // =============================
        // DEVICES
        // =============================

        const [deviceRows] = await db.execute(
            `
            SELECT
                device_type,
                COUNT(*) AS total
            FROM tags_clicks
            WHERE qr_code_id = ?
            GROUP BY device_type
            ORDER BY total DESC
            `,
            [qr.id]
        );

        // =============================
        // MOBILE %
        // =============================

        const mobileCount =
            deviceRows.find(
                d => d.device_type === "mobile"
            )?.total || 0;

        const totalScans =
            Number(totals.scans || 0);

        const mobilePercent =
            totalScans > 0
                ? Math.round(
                    (Number(mobileCount) / totalScans) * 100
                )
                : 0;

        // =============================
        // OS
        // =============================

        const [osRows] = await db.execute(
            `
            SELECT
                os,
                COUNT(*) AS total
            FROM tags_clicks
            WHERE qr_code_id = ?
            GROUP BY os
            ORDER BY total DESC
            `,
            [qr.id]
        );

        // =============================
        // BROWSERS
        // =============================

        const [browserRows] = await db.execute(
            `
            SELECT
                browser,
                COUNT(*) AS total
            FROM tags_clicks
            WHERE qr_code_id = ?
            GROUP BY browser
            ORDER BY total DESC
            `,
            [qr.id]
        );

        // =============================
        // LAST SCANS
        // =============================

        const [lastScansRows] = await db.execute(
            `
            SELECT
                id,
                ip,
                created_at,
                country,
                city,
                device_type,
                os,
                browser
            FROM tags_clicks
            WHERE qr_code_id = ?
            ORDER BY created_at DESC
            LIMIT 10
            `,
            [qr.id]
        );

        // =============================
        // DAILY
        // =============================

        const [dailyRows] = await db.execute(
            `
            SELECT
                DATE_FORMAT(date, '%d/%m') AS day,
                clicks,
                unique_clicks
            FROM tags_stats_daily
            WHERE qr_code_id = ?
            ORDER BY date ASC
            LIMIT 7
            `,
            [qr.id]
        );

        // =============================
        // CITIES
        // =============================

        const [citiesRows] = await db.execute(
            `
        SELECT
            city,
            COUNT(*) AS clicks
        FROM tags_clicks
        WHERE qr_code_id = ?
        AND city IS NOT NULL
        AND city != ''
        GROUP BY city
        ORDER BY clicks DESC
        LIMIT 10
        `,
            [qr.id]
        );

        // =============================
        // RESPONSE
        // =============================

        return NextResponse.json({

            success: true,

            // =========================
            // SIMPLE FRONT FIELDS
            // =========================

            totalClicks:
                totalScans,

            uniqueClicks:
                Number(
                    totals.unique_scans || 0
                ),

            todayClicks,

            mobilePercent,

            lastScans:
                lastScansRows,

            // =========================
            // FULL DATA
            // =========================

            qr: {
                code: qr.code,
                label: qr.label,
                url: qr.final_url,
                total_clicks:
                    qr.total_clicks || 0,
                last_click_at:
                    qr.last_click_at
            },

            stats: {

                scans:
                    totalScans,

                unique_scans:
                    Number(
                        totals.unique_scans || 0
                    ),

                devices:
                    deviceRows,

                os:
                    osRows,

                browsers:
                    browserRows,

                cities:
                    citiesRows,

                daily:
                    dailyRows,

                last_scans:
                    lastScansRows
            }
        });

    } catch (error) {

        console.log(error);

        return NextResponse.json(
            {
                error: "Error interno"
            },
            {
                status: 500
            }
        );
    }
}