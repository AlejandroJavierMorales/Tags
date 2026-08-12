export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getTurnosAccess, turnosAccessResponse } from "@/app/modules/turnos/lib/access/getTurnosAccess";
import { cleanText, jsonResponseError } from "@/app/modules/turnos/lib/turnosService";

export async function GET(req) {
    const params = new URL(req.url).searchParams;
    const businessId = String(params.get("businessId") || "");
    const turnosId = Number(params.get("turnosId") || 0);
    const customerId = Number(params.get("customerId") || 0);
    const search = cleanText(params.get("search"), 120);
    const access = await getTurnosAccess({ businessId, turnosId, permission: "customers.view" });
    if (!access.allowed) return turnosAccessResponse(access);
    if (customerId) {
        const [customers] = await db.query("SELECT * FROM tags_turnos_customers WHERE id=? AND business_id=? LIMIT 1", [customerId, businessId]);
        if (!customers[0]) return jsonResponseError("Cliente no encontrado", 404);
        const [bookings] = await db.query(`SELECT b.id,b.booking_number,b.status,b.starts_at,b.ends_at,b.party_size,s.name service_name FROM tags_turnos_bookings b INNER JOIN tags_turnos_services s ON s.id=b.service_id WHERE b.customer_id=? AND b.turnos_id=? ORDER BY b.starts_at DESC LIMIT 100`, [customerId, turnosId]);
        return Response.json({ ok: true, customer: customers[0], bookings });
    }
    const pattern = `%${search}%`;
    const [customers] = await db.query(
        `SELECT c.*,
                COUNT(b.id) booking_count,
                MAX(b.starts_at) last_booking_at,
                MIN(CASE WHEN b.starts_at>=NOW() AND b.status IN ('pending','confirmed','checked_in','in_progress') THEN b.starts_at END) next_booking_at
         FROM tags_turnos_customers c
         LEFT JOIN tags_turnos_bookings b ON b.customer_id=c.id AND b.turnos_id=?
         WHERE c.business_id=? AND (?='' OR c.name LIKE ? OR COALESCE(c.email,'') LIKE ? OR COALESCE(c.phone,'') LIKE ? OR COALESCE(c.document,'') LIKE ?)
         GROUP BY c.id ORDER BY c.name LIMIT 500`,
        [turnosId, businessId, search, pattern, pattern, pattern, pattern]
    );
    return Response.json({ ok: true, customers });
}

async function save(req, editing) {
    const body = await req.json().catch(() => null);
    if (!body) return jsonResponseError("Cuerpo JSON inválido");
    const businessId = String(body.businessId || "");
    const turnosId = Number(body.turnosId || 0);
    const customerId = Number(body.customerId || 0);
    const access = await getTurnosAccess({ businessId, turnosId, permission: "customers.manage" });
    if (!access.allowed) return turnosAccessResponse(access);
    const name = cleanText(body.name, 190);
    const email = cleanText(body.email, 190).toLowerCase() || null;
    const phone = cleanText(body.phone, 60) || null;
    const document = cleanText(body.document, 80) || null;
    const dateOfBirth = /^\d{4}-\d{2}-\d{2}$/.test(String(body.dateOfBirth || "")) ? body.dateOfBirth : null;
    const notes = cleanText(body.notes, 5000) || null;
    if (!name || (!email && !phone)) return jsonResponseError("Nombre y al menos un medio de contacto son requeridos");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonResponseError("El email no tiene un formato válido");
    if (phone && phone.replace(/\D/g, "").length < 6) return jsonResponseError("El teléfono no tiene un formato válido");
    if (email) {
        const [sameEmail] = await db.query("SELECT id,name FROM tags_turnos_customers WHERE business_id=? AND id<>? AND email=? LIMIT 1", [businessId, customerId, email]);
        if (sameEmail[0]) return jsonResponseError(`El email ya pertenece a ${sameEmail[0].name}`, 409, "CUSTOMER_EMAIL_DUPLICATE");
    }
    if (phone) {
        const normalizedPhone = phone.replace(/\D/g, "");
        const [phones] = await db.query("SELECT id,name,phone FROM tags_turnos_customers WHERE business_id=? AND id<>? AND phone IS NOT NULL", [businessId, customerId]);
        const samePhone = phones.find(item => String(item.phone || "").replace(/\D/g, "") === normalizedPhone);
        if (samePhone) return jsonResponseError(`El teléfono ya pertenece a ${samePhone.name}`, 409, "CUSTOMER_PHONE_DUPLICATE");
    }
    if (editing) {
        const [result] = await db.query("UPDATE tags_turnos_customers SET name=?,email=?,phone=?,document=?,date_of_birth=?,notes=?,updated_at=NOW() WHERE id=? AND business_id=?", [name, email, phone, document, dateOfBirth, notes, customerId, businessId]);
        if (!result.affectedRows) return jsonResponseError("Cliente no encontrado", 404);
        if (email) await db.query(`UPDATE tags_turnos_notification_deliveries nd INNER JOIN tags_turnos_bookings b ON b.id=nd.booking_id SET nd.recipient=? WHERE b.customer_id=? AND b.status IN ('pending','confirmed','checked_in','in_progress') AND nd.channel='email' AND nd.status='pending'`, [email, customerId]);
        return Response.json({ ok: true, customerId });
    }
    const [result] = await db.query("INSERT INTO tags_turnos_customers (business_id,name,email,phone,document,date_of_birth,notes,privacy_consent_at) VALUES (?,?,?,?,?,?,?,NOW())", [businessId, name, email, phone, document, dateOfBirth, notes]);
    return Response.json({ ok: true, customerId: result.insertId }, { status: 201 });
}

export async function POST(req) { return save(req, false); }
export async function PATCH(req) { return save(req, true); }
