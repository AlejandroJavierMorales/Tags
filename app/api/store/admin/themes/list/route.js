// =====================================
// API: /api/store/admin/themes/list
// Descripción: Lista themes activos para Tags Tienda usando tags_qr_page_themes.
// Uso: Dashboard Tags Tienda / Apariencia.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

function parseJson(value, fallback = {}) {
    if (!value) return fallback;
    if (typeof value === "object") return value;

    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

function mapQRThemeToStore(tokens = {}) {
    return {
        backgroundColor:
            tokens["--qr-bg"] || "#f8fafc",

        textColor:
            tokens["--qr-text"] || "#111827",

        mutedColor:
            tokens["--qr-muted"] || "#64748b",

        borderColor:
            tokens["--qr-border"] || "#e5e7eb",

        primaryColor:
            tokens["--qr-primary"] || "#16a34a",

        primaryTextColor:
            tokens["--qr-primary-text"] || "#ffffff",

        primaryHoverColor:
            tokens["--qr-primary-hover"] ||
            tokens["--qr-primary"] ||
            "#15803d",

        surfaceColor:
            tokens["--qr-surface"] || "#ffffff",

        surfaceAltColor:
            tokens["--qr-surface-alt"] || "#f3f4f6",

        borderRadius:
            tokens["--qr-radius"] || "18px",

        shadow:
            tokens["--qr-shadow"] ||
            "0 14px 32px rgba(15,23,42,.08)"
    };
}

export async function GET() {
    try {
        const [rows] =
            await db.query(
                `
                SELECT
                    id,
                    code,
                    name,
                    description,
                    css_tokens
                FROM tags_qr_page_themes
                WHERE is_active = 1
                ORDER BY sort_order ASC, id ASC
                `
            );

        const themes =
            rows.map(theme => {
                const tokens =
                    parseJson(theme.css_tokens, {});

                return {
                    id: theme.id,
                    code: theme.code,
                    name: theme.name,
                    description: theme.description,
                    tokens,
                    storeStyles:
                        mapQRThemeToStore(tokens)
                };
            });

        return Response.json({
            ok: true,
            themes
        });

    } catch (err) {
        console.error(
            "STORE THEMES LIST ERROR:",
            err
        );

        return Response.json(
            {
                error: "Error listando themes"
            },
            {
                status: 500
            }
        );
    }
}