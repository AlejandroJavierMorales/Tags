const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

const dateLabel = value => {
    if (!value) return "A confirmar";
    const calendarDate = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (calendarDate) return `${calendarDate[3]}/${calendarDate[2]}/${calendarDate[1]}`;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
        ? "A confirmar"
        : parsed.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
};
const timeLabel = value => { const [hour, minute] = String(value || "").split(":"); return hour ? `${Number(hour)}${minute && Number(minute) ? `:${String(minute).padStart(2, "0")}` : ""}hs` : "A confirmar"; };
const money = (value, currency = "ARS") => `${currency === "ARS" ? "$" : currency} ${Number(value || 0).toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export function buildReservationAccessCommunication({ stay, settings = {}, link = "", eventCode = "access_link" }) {
    const appName = stay.app_name || stay.appName || "Mi Estadía";
    const guestName = stay.guest_name || stay.guestName || `${stay.firstName || ""} ${stay.lastName || ""}`.trim();
    const stayCode = stay.stay_code || stay.stayCode || "Se asignará al crear la reserva";
    const startsAt = stay.starts_at || stay.startsAt;
    const endsAt = stay.ends_at || stay.endsAt;
    const people = Number(stay.adults || 0) + Number(stay.children || 0);
    const lodgingTotal = Number(stay.lodging_total ?? stay.lodgingTotal ?? 0);
    const depositRequired = Number(stay.deposit_required_amount ?? stay.depositRequiredAmount ?? 0);
    const currency = stay.currency || "ARS";
    const isRebooking = eventCode === "no_show_rebooking";
    const title = isRebooking ? `Tu estadía está pendiente de reprogramación · ${appName}` : eventCode === "arrival_reminder" ? `Recordatorio de ingreso · ${appName}` : `Reserva confirmada · ${appName}`;
    const checkin = `${dateLabel(startsAt)} ${timeLabel(settings.checkinTime || "15:00")}`;
    const checkout = `${dateLabel(endsAt)} ${timeLabel(settings.checkoutTime || "10:00")}`;
    const accessButton = link
        ? `<a href="${escapeHtml(link)}" style="display:inline-block;padding:13px 20px;background:#22a35a;color:#fff;text-decoration:none;border-radius:9px;font-weight:bold">Acceder a Mi Estadía</a>`
        : `<span style="display:inline-block;padding:13px 20px;background:#22a35a;color:#fff;border-radius:9px;font-weight:bold">Acceder a Mi Estadía</span><small style="display:block;margin-top:8px;color:#63746a">El enlace seguro se generará al confirmar el envío.</small>`;
    const financial = lodgingTotal > 0 ? `<br><strong>Total de la reserva:</strong> ${escapeHtml(money(lodgingTotal, currency))}${depositRequired > 0 ? `<br><strong>Seña requerida:</strong> ${escapeHtml(money(depositRequired, currency))}` : ""}` : "";
    if (isRebooking) {
        const financialLabels = { credit: "La seña queda disponible como crédito", retained: "La seña fue retenida por la no presentación", refund: "La seña será reintegrada" };
        const financialAction = financialLabels[stay.no_show_financial_action] || "El tratamiento de la seña será coordinado con el alojamiento";
        const deadline = stay.no_show_credit_expires_at ? dateLabel(stay.no_show_credit_expires_at) : "Sin fecha límite informada";
        const paid = money(stay.no_show_paid_amount ?? stay.paid_total ?? 0, currency);
        const pending = money(stay.no_show_pending_amount ?? stay.account_balance ?? 0, currency);
        const friendlyMessage = stay.no_show_notification_message || "Sabemos que pueden surgir imprevistos. Tu estadía quedó pendiente de reprogramación y estamos disponibles para ayudarte a coordinar una nueva fecha.";
        const html = `<div style="max-width:620px;margin:auto;font-family:Arial,sans-serif;color:#183226;border:1px solid #dfe9e4;border-radius:18px;overflow:hidden"><div style="padding:24px;background:#fff6ec;text-align:center">${stay.logo_url || stay.logoUrl ? `<img src="${escapeHtml(stay.logo_url || stay.logoUrl)}" alt="${escapeHtml(appName)}" style="max-width:150px;max-height:90px">` : ""}<h1 style="margin:12px 0 0">${escapeHtml(title)}</h1></div><div style="padding:24px"><p>Hola <strong>${escapeHtml(guestName)}</strong>.</p><p>${escapeHtml(friendlyMessage)}</p><p><strong>Reserva:</strong> ${escapeHtml(stayCode)}<br><strong>Fechas originales:</strong> ${escapeHtml(dateLabel(startsAt))} al ${escapeHtml(dateLabel(endsAt))}<br><strong>Tratamiento de la seña:</strong> ${escapeHtml(financialAction)}<br><strong>Importe abonado:</strong> ${escapeHtml(paid)}<br><strong>Saldo registrado:</strong> ${escapeHtml(pending)}<br><strong>Fecha límite para reprogramar:</strong> ${escapeHtml(deadline)}</p><p style="font-size:13px;color:#63746a">Contactanos para elegir una nueva fecha sujeta a disponibilidad.</p></div></div>`;
        const text = `${title}\n\nHola ${guestName}.\n\n${friendlyMessage}\n\nReserva: ${stayCode}\nFechas originales: ${dateLabel(startsAt)} al ${dateLabel(endsAt)}\nTratamiento de la seña: ${financialAction}\nImporte abonado: ${paid}\nSaldo registrado: ${pending}\nFecha límite para reprogramar: ${deadline}\n\nContactanos para elegir una nueva fecha sujeta a disponibilidad.`;
        return { title, html, text };
    }
    const html = `<div style="max-width:620px;margin:auto;font-family:Arial,sans-serif;color:#183226;border:1px solid #dfe9e4;border-radius:18px;overflow:hidden"><div style="padding:24px;background:#f4f8f5;text-align:center">${stay.logo_url || stay.logoUrl ? `<img src="${escapeHtml(stay.logo_url || stay.logoUrl)}" alt="${escapeHtml(appName)}" style="max-width:150px;max-height:90px">` : ""}<h1 style="margin:12px 0 0">${escapeHtml(title)}</h1></div><div style="padding:24px"><p>Hola <strong>${escapeHtml(guestName)}</strong>.</p><p>Estos son los datos de tu reserva:</p><p><strong>Reserva:</strong> ${escapeHtml(stayCode)}<br><strong>Huéspedes:</strong> ${people || 1}<br><strong>Ingreso:</strong> ${escapeHtml(checkin)}<br><strong>Egreso:</strong> ${escapeHtml(checkout)}${financial}</p><p style="text-align:center;margin:28px 0">${accessButton}</p><p style="font-size:12px;color:#63746a">El enlace estará disponible durante la estadía y el período de gracia configurado.</p></div></div>`;
    const text = `${title}\n\nReserva: ${stayCode}\nHuéspedes: ${people || 1}\nIngreso: ${checkin}\nEgreso: ${checkout}${lodgingTotal > 0 ? `\nTotal: ${money(lodgingTotal, currency)}` : ""}${link ? `\n\nAcceso a Mi Estadía: ${link}` : ""}`;
    return { title, html, text };
}
