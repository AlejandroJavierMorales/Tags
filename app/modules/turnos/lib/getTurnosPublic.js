import { db } from "@/app/lib/tags-db";
import { parseJson } from "./turnosService";

export async function getTurnosBySlug(slug, connection = db) {
    const [rows] = await connection.query(
        `SELECT a.*, p.title AS page_title, p.description AS page_description,
                p.global_styles, p.header_config, p.footer_config, p.status AS page_status,
                b.name AS business_name, b.email AS business_email, b.phone AS business_phone
         FROM tags_turnos_apps a
         INNER JOIN tags_qr_pages p ON p.id = a.page_id AND p.page_type = 'turnos'
         INNER JOIN tags_businesses b ON b.id = a.business_id
         WHERE a.slug = ? AND a.status = 'published' AND p.status = 'published'
         LIMIT 1`,
        [String(slug || "").trim()]
    );
    const app = rows[0];
    if (!app) return null;
    return {
        ...app,
        settings: parseJson(app.settings_json),
        styles: parseJson(app.styles_json),
        publicBookingPolicy: parseJson(app.public_booking_policy_json),
        depositPolicy: parseJson(app.deposit_policy_json),
        page: {
            title: app.page_title,
            description: app.page_description,
            global_styles: parseJson(app.global_styles),
            header_config: parseJson(app.header_config),
            footer_config: parseJson(app.footer_config)
        }
    };
}

export async function getPublicServices(turnosId, connection = db) {
    const [rows] = await connection.query(
        `SELECT s.*, c.name AS category_name
         FROM tags_turnos_services s
         LEFT JOIN tags_turnos_service_categories c ON c.id = s.category_id
         WHERE s.turnos_id = ? AND s.is_active = 1 AND s.is_visible = 1
         ORDER BY c.sort_order ASC, s.sort_order ASC, s.id ASC`,
        [turnosId]
    );
    return rows;
}

export async function getPublicLocations(turnosId, connection = db) {
    const [rows] = await connection.query(
        `SELECT * FROM tags_turnos_locations WHERE turnos_id = ? AND is_active = 1 ORDER BY sort_order ASC, id ASC`,
        [turnosId]
    );
    return rows;
}

