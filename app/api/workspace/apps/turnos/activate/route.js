export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { createSlug } from "@/app/modules/qr-page/lib/createSlug";
import { createAppQRCode } from "@/app/modules/qr/lib/createAppQRCode";
import { registerQRAddonUsage } from "@/app/modules/addons/lib/registerQRAddonUsage";

function getBaseUrl() {
    return process.env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : process.env.NEXT_PUBLIC_BASE_URL_PROD;
}

const PROFILE_RESOURCE_TYPES = {
    spa: [
        ["professional", "Profesionales", "Profesional", "Profesionales"],
        ["cabin", "Cabinas", "Cabina", "Cabinas"]
    ],
    bike_kayak: [["equipment", "Bicicletas / Kayaks", "Unidad", "Unidades"]],
    hairdresser: [["professional", "Profesionales", "Profesional", "Profesionales"]],
    generic: [["resource", "Recursos", "Recurso", "Recursos"]]
};

export async function POST(req) {
    let connection;
    try {
        const body = await req.json();
        const businessId = Number(body?.businessId || 0);
        const name = String(body?.name || body?.title || "").trim();
        const slug = createSlug(body?.slug || name);
        const profile = String(body?.businessProfileCode || "generic").trim() || "generic";

        if (!businessId || !name || !slug) {
            return Response.json({ error: "businessId, name y slug son requeridos" }, { status: 400 });
        }

        connection = await db.getConnection();
        const [businessRows] = await connection.query(
            "SELECT * FROM tags_businesses WHERE id = ? LIMIT 1",
            [businessId]
        );
        const business = businessRows[0];
        if (!business) return Response.json({ error: "Cliente no encontrado" }, { status: 404 });

        await connection.beginTransaction();

        const [addonRows] = await connection.query(
            `SELECT id, quantity FROM tags_business_addons
             WHERE business_id = ? AND addon_code = 'turnos' AND status = 'active'
             AND (expires_at IS NULL OR expires_at >= NOW()) LIMIT 1 FOR UPDATE`,
            [businessId]
        );
        if (!addonRows.length) {
            await connection.rollback();
            return Response.json({ error: "El cliente no tiene Tags Turnos activo" }, { status: 403 });
        }

        const [usageRows] = await connection.query("SELECT COUNT(*) AS total FROM tags_turnos_apps WHERE business_id = ?", [businessId]);
        const contracted = Math.max(1, Number(addonRows[0].quantity || 1));
        const used = Number(usageRows[0]?.total || 0);
        if (used >= contracted) {
            await connection.rollback();
            return Response.json({ error: `El cliente tiene ${contracted} instancia(s) de Turnos contratada(s) y ya utilizó todas.` }, { status: 409 });
        }

        const [slugRows] = await connection.query("SELECT id FROM tags_qr_pages WHERE slug = ? LIMIT 1", [slug]);
        if (slugRows.length) {
            await connection.rollback();
            return Response.json({ error: "Ese nombre público ya está en uso" }, { status: 409 });
        }
        const publicUrl = `${getBaseUrl()}/p/${slug}`;
        const qr = await createAppQRCode({
            conn: connection,
            businessId,
            label: name,
            value: publicUrl,
            finalUrl: publicUrl,
            status: "active"
        });

        const [pageResult] = await connection.query(
            `INSERT INTO tags_qr_pages (
                business_id, qr_code_id, page_type, schema_type, slug, slug_locked,
                title, description, status, email, phone, whatsapp,
                global_styles, header_config, footer_config, seo_title, seo_description,
                created_at, updated_at
            ) VALUES (?, ?, 'turnos', 'local_business', ?, 1, ?, ?, 'published', ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
                businessId, qr.id, slug, name, `Reservá tu turno en ${name}`,
                business.email || null, business.phone || null, business.phone || null,
                JSON.stringify({}), JSON.stringify({}), JSON.stringify({}),
                `${name} | Turnos`, `Reservá servicios y horarios en ${name}.`
            ]
        );

        const [appResult] = await connection.query(
            `INSERT INTO tags_turnos_apps (
                business_id, page_id, slug, name, business_profile_code, timezone,
                currency, status, settings_json, styles_json,
                public_booking_policy_json, deposit_policy_json
            ) VALUES (?, ?, ?, ?, ?, ?, 'ARS', 'published', ?, ?, ?, ?)`,
            [
                businessId, pageResult.insertId, slug, name, profile,
                business.timezone || "America/Argentina/Buenos_Aires",
                JSON.stringify({ turnosTemplate: profile }), JSON.stringify({}),
                JSON.stringify({ defaultChannel: "admin_only", identification: "contact" }),
                JSON.stringify({ mode: "none", holdMinutes: 15 })
            ]
        );
        const turnosId = appResult.insertId;

        const [profileRows] = await connection.query(
            "SELECT default_capabilities_json FROM tags_turnos_profiles WHERE code = ? AND is_active = 1 LIMIT 1",
            [profile]
        );
        const selected = profileRows[0] || (await connection.query(
            "SELECT default_capabilities_json FROM tags_turnos_profiles WHERE code = 'generic' LIMIT 1"
        ))[0][0];
        let capabilities = [];
        try {
            capabilities = Array.isArray(selected?.default_capabilities_json)
                ? selected.default_capabilities_json
                : JSON.parse(selected?.default_capabilities_json || "[]");
        } catch {
            capabilities = ["appointments"];
        }
        for (const code of capabilities) {
            await connection.query(
                `INSERT IGNORE INTO tags_turnos_app_capabilities (turnos_id, capability_id)
                 SELECT ?, id FROM tags_turnos_capabilities WHERE code = ? AND is_active = 1`,
                [turnosId, code]
            );
        }

        await connection.query(
            `INSERT IGNORE INTO tags_turnos_locations (turnos_id, name, address, phone)
             VALUES (?, ?, ?, ?)`,
            [turnosId, name, business.address || null, business.phone || null]
        );
        for (const [code, typeName, singular, plural] of (PROFILE_RESOURCE_TYPES[profile] || PROFILE_RESOURCE_TYPES.generic)) {
            await connection.query(
                `INSERT IGNORE INTO tags_turnos_resource_types (turnos_id, code, name, singular_label, plural_label)
                 VALUES (?, ?, ?, ?, ?)`,
                [turnosId, code, typeName, singular, plural]
            );
        }
        await connection.query(
            `INSERT IGNORE INTO tags_turnos_roles (turnos_id, code, name, description, is_system)
             VALUES (?, 'administrator', 'Administrador', 'Acceso completo a Turnos', 1)`,
            [turnosId]
        );
        await connection.query(
            `INSERT IGNORE INTO tags_turnos_role_permissions (role_id, permission_id)
             SELECT r.id, p.id FROM tags_turnos_roles r CROSS JOIN tags_turnos_permissions p
             WHERE r.turnos_id = ? AND r.code = 'administrator'`,
            [turnosId]
        );
        await registerQRAddonUsage({
            conn: connection,
            qrCodeId: qr.id,
            businessId,
            addonCode: "turnos",
            sourceTable: "tags_turnos_apps",
            sourceId: turnosId
        });
        await connection.query("UPDATE tags_qr_codes SET has_qr_page = 1 WHERE id = ? AND business_id = ?", [qr.id, businessId]);
        await connection.commit();

        return Response.json({ ok: true, turnosId, pageId: pageResult.insertId, qrId: qr.id, qrCode: qr.code, slug, publicUrl });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("TURNOS ACTIVATE ERROR:", error);
        return Response.json({ error: error.message || "Error activando Tags Turnos" }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}
