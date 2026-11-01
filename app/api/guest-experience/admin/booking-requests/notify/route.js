export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { sendMail } from "@/app/lib/sendMail";
import { getGuestAdminAccess, guestAdminAccessResponse } from "@/app/modules/guest-experience/lib/getGuestAdminAccess";
import { guestError, parseGuestJson } from "@/app/modules/guest-experience/lib/guestExperienceService";

const escape = value => String(value || "").replace(/[&<>\"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
const formatDate = value => new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString("es-AR");
const money = (currency, value) => `${currency === "USD" ? "U$S" : "$"} ${Number(value || 0).toLocaleString("es-AR", { maximumFractionDigits: 2 })}`;
const nightsBetween = (start, end) => Math.max(1, Math.round((new Date(`${end}T12:00:00`) - new Date(`${start}T12:00:00`)) / 86400000));
const whatsappUrl = value => {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (!digits.startsWith("54")) digits = `54${digits}`;
  return digits.length >= 10 ? `https://wa.me/${digits}` : "";
};
const inferredCategory = (name, capacity) => {
  const value = String(name || "").trim();
  const type = /cabaña/i.test(value) ? (/loft/i.test(value) ? "Cabaña Loft" : "Cabaña") : /departamento/i.test(value) ? "Departamento" : /habitación/i.test(value) ? "Habitación" : "Alojamiento";
  return `${type} para ${capacity} ${capacity === 1 ? "pasajero" : "pasajeros"}`;
};

async function recordEvent({ guestAppId, requestId, actorId, status, eventType, notes, metadata }) {
  await db.query(`INSERT INTO tags_guest_booking_request_events
    (guest_app_id, request_id, actor_type, actor_id, event_type, from_status, to_status, notes, metadata_json)
    VALUES (?, ?, 'owner', ?, ?, ?, ?, ?, ?)`,
  [guestAppId, requestId, actorId, eventType, status, status, notes, JSON.stringify(metadata)]);
}

export async function POST(req) {
  const body = await req.json().catch(() => null);
  if (!body) return guestError("Cuerpo JSON inválido");
  const businessId = Number(body.businessId || 0), guestAppId = Number(body.guestAppId || 0), requestId = Number(body.requestId || 0);
  const access = await getGuestAdminAccess({ businessId, guestAppId, permission: "guest.stays.manage" });
  if (!access.allowed) return guestAdminAccessResponse(access);

  const [rows] = await db.query(`SELECT r.*, a.name app_name, a.logo_url, a.settings_json,
      u.name unit_name, u.capacity_adults, u.capacity_children, u.features_json, s.stay_code
    FROM tags_guest_booking_requests r
    INNER JOIN tags_guest_apps a ON a.id=r.guest_app_id AND a.business_id=?
    INNER JOIN tags_guest_units u ON u.id=r.unit_id
    LEFT JOIN tags_guest_stays s ON s.id=r.confirmed_stay_id
    WHERE r.id=? AND r.guest_app_id=? LIMIT 1`, [businessId, requestId, guestAppId]);
  const item = rows[0];
  if (!item) return guestError("Solicitud no encontrada", 404);
  const [groupUnits]=await db.query(`SELECT ru.suggested_guests,u.name,u.capacity_adults,u.capacity_children,u.features_json
    FROM tags_guest_booking_request_units ru INNER JOIN tags_guest_units u ON u.id=ru.unit_id AND u.guest_app_id=ru.guest_app_id
    WHERE ru.request_id=? AND ru.guest_app_id=? ORDER BY ru.id`,[requestId,guestAppId]);
  if (!["pending_payment", "confirmed", "rejected", "cancelled", "expired"].includes(item.status)) return guestError("La solicitud todavía no fue resuelta", 409);

  const eventBase = { guestAppId, requestId, actorId: access.session?.id || access.session?.userId || null, status: item.status };
  if (body.notifyCustomer === false || !item.customer_email) {
    const reason = body.notifyCustomer === false ? "operator_choice" : "missing_email";
    await recordEvent({ ...eventBase, eventType: "customer.notification_skipped", notes: reason === "operator_choice" ? "El operador eligió no notificar al cliente" : "No se notificó porque falta el email", metadata: { reason } });
    return Response.json({ ok: true, skipped: reason });
  }

  const settings = parseGuestJson(item.settings_json), features = parseGuestJson(item.features_json);
  const pendingPayment = item.status === "pending_payment", confirmed = item.status === "confirmed";
  const capacity = Number(item.capacity_adults || 0) + Number(item.capacity_children || 0);
  const passengers = Number(item.adults || 0) + Number(item.children || 0);
  const category = features.publicCategory || inferredCategory(item.unit_name, capacity);
  const singleUnitLabel = settings.bookingUnitDisplay === "unit" ? item.unit_name : settings.bookingUnitDisplay === "category_unit" ? `${category} · ${item.unit_name}` : category;
  const unitLabel=groupUnits.length>1?groupUnits.map(unit=>`${unit.name} · ${unit.suggested_guests} huésped${Number(unit.suggested_guests)===1?"":"es"}`).join(" + "):singleUnitLabel;
  const nights = nightsBetween(String(item.starts_on).slice(0, 10), String(item.ends_on).slice(0, 10));
  const subject = pendingPayment ? `Solicitud aceptada · Datos para confirmar tu reserva · ${item.app_name}` : confirmed ? `Reserva confirmada · ${item.app_name}` : `Actualización de tu solicitud · ${item.app_name}`;
  const message = pendingPayment ? `El alojamiento revisó y aceptó tu solicitud ${item.request_code}. Para confirmar la reserva, realizá el pago indicado antes del vencimiento.` : confirmed ? `Tu reserva ${item.stay_code || item.request_code} fue confirmada.` : `Tu solicitud ${item.request_code} fue cerrada para las fechas indicadas.`;
  const summary = [`Ingreso: ${formatDate(item.starts_on)} · ${settings.checkinTime || "15:00"} hs`, `Egreso: ${formatDate(item.ends_on)} · ${settings.checkoutTime || "10:00"} hs`, `Noches: ${nights}`, `Pasajeros: ${passengers}`];
  const sectionLabels = { presentation: "Presentación", experiences: "Experiencias", lodging: "El alojamiento", services: "Servicios incluidos", location: "Ubicación y alrededores", signature: "" };
  const configuredSections = Array.isArray(settings.bookingQuoteSections)
    ? settings.bookingQuoteSections
    : Object.entries(sectionLabels).map(([key, label]) => ({ title: label, ...settings.bookingQuoteSections?.[key] }));
  const commercialSections = configuredSections.filter(section => section?.enabled !== false && section?.content).map(section => ({ label: section.title || "", content: section.content }));
  const contactUrl = whatsappUrl(settings.receptionPhone);
  const paymentText = settings.bankPaymentDetails || "Contactá al alojamiento para coordinar el pago.";
  const textSections = commercialSections.map(section => `${section.label ? `${section.label.toUpperCase()}\n` : ""}${section.content}`).join("\n\n");
  const text = [`Hola ${item.customer_name},`, message, unitLabel, ...summary, pendingPayment ? `Total estadía: ${money(item.currency, item.lodging_total)}\nReserva ${Number(item.deposit_percentage || 0)}%: ${money(item.currency, item.deposit_required_amount)}\nSaldo: ${money(item.currency, Number(item.lodging_total || 0) - Number(item.deposit_required_amount || 0))}\nRealizar antes de: ${new Date(item.hold_expires_at).toLocaleString("es-AR")}` : "", pendingPayment ? `Datos para realizar el pago:\n${paymentText}` : "", settings.bookingBudgetDetails || "", textSections, pendingPayment ? "La reserva quedará confirmada cuando el alojamiento registre el pago correspondiente." : ""].filter(Boolean).join("\n\n");
  const htmlSections = commercialSections.map(section => `<section style="margin-top:28px">${section.label ? `<h2 style="font-size:18px;color:#176b43">${escape(section.label)}</h2>` : ""}<p style="white-space:pre-line;line-height:1.55">${escape(section.content)}</p></section>`).join("");
  const html = `<div style="max-width:680px;margin:auto;font-family:Arial;color:#183226;border:1px solid #dfe9e3;border-radius:16px;overflow:hidden"><div style="padding:24px;text-align:center;background:#f3f7f4">${item.logo_url ? `<img src="${escape(item.logo_url)}" alt="${escape(item.app_name)}" style="max-width:220px;max-height:100px;object-fit:contain">` : ""}<h1 style="font-size:24px">${escape(subject)}</h1></div><div style="padding:26px"><p>Hola <strong>${escape(item.customer_name)}</strong>,</p><p>${escape(message)}</p><div style="padding:16px;background:#f7faf8;border-radius:12px;line-height:1.7"><strong>${escape(unitLabel)}</strong><br>${summary.map(escape).join("<br>")}</div>${pendingPayment ? `<div style="margin-top:18px;padding:16px;background:#eef7f1;border-radius:12px;line-height:1.8"><strong>Total estadía:</strong> ${escape(money(item.currency, item.lodging_total))}<br><strong>Reserva ${escape(item.deposit_percentage || 0)}%:</strong> ${escape(money(item.currency, item.deposit_required_amount))}<br><strong>Saldo:</strong> ${escape(money(item.currency, Number(item.lodging_total || 0) - Number(item.deposit_required_amount || 0)))}<br><strong>Realizar antes de:</strong> ${escape(new Date(item.hold_expires_at).toLocaleString("es-AR"))}</div><h2 style="font-size:18px">Datos para realizar el pago</h2><p style="white-space:pre-line">${escape(paymentText)}</p>${!settings.bankPaymentDetails && contactUrl ? `<p><a href="${escape(contactUrl)}" style="display:inline-block;padding:12px 18px;border-radius:9px;background:#1f9d55;color:#fff;text-decoration:none;font-weight:bold">Contactar por WhatsApp</a></p>` : ""}${settings.bookingBudgetDetails ? `<p style="white-space:pre-line">${escape(settings.bookingBudgetDetails)}</p>` : ""}<p><strong>Importante:</strong> la reserva quedará confirmada cuando el alojamiento registre el pago correspondiente.</p>` : ""}${htmlSections}${item.resolution_notes ? `<p>${escape(item.resolution_notes)}</p>` : ""}</div></div>`;

  const delivery = await sendMail({ to: item.customer_email, subject, text, html });
  const status = delivery.ok ? "sent" : "failed";
  await recordEvent({ ...eventBase, eventType: "customer.notification", notes: delivery.ok ? "Notificación enviada" : "Falló la notificación", metadata: { channel: "email", recipient: item.customer_email, status, error: delivery.error || null, quoteSnapshot: { unitLabel, summary, total: Number(item.lodging_total || 0), deposit: Number(item.deposit_required_amount || 0), currency: item.currency, sections: commercialSections } } });
  return delivery.ok ? Response.json({ ok: true, status }) : guestError("La solicitud fue resuelta, pero no se pudo enviar el email", 502, "NOTIFICATION_FAILED");
}
