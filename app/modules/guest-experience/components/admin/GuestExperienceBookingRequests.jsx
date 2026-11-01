"use client";

import { useEffect, useState } from "react";
import { FaCheck, FaClock, FaEnvelope, FaPhone, FaWhatsapp, FaXmark } from "react-icons/fa6";
import TagsSpinner from "@/app/components/TagsSpinner";
import PushNotificationButton from "@/app/modules/notifications/components/PushNotificationButton";
import showAlert from "@/app/components/showAlert";
import { buildReservationAccessCommunication } from "@/app/modules/guest-experience/lib/reservationAccessCommunication";
import { normalizeArgentinaWhatsapp } from "@/app/modules/qr-page/lib/normalizeContactFields";
import "./GuestExperienceBookingRequests.css";
import "./GuestExperienceBookingRequestActions.css";
import "./GuestExperienceBookingRequestFilters.css";

const LABEL = {
  held: "Retenida",
  review_required: "Revisión pendiente",
  pending_payment: "Pendiente de pago",
  confirmed: "Confirmada",
  expired: "Vencida",
  cancelled: "Cancelada",
  rejected: "Rechazada",
};
const formatDate = (value) =>
  new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString("es-AR");
const metadataOf = item => {
  if (item?.metadata_json && typeof item.metadata_json === "object") return item.metadata_json;
  try { return JSON.parse(item?.metadata_json || "{}"); } catch { return {}; }
};
const whatsappUrl = (item, settings = {}) => {
  const phone = normalizeArgentinaWhatsapp(item.customer_phone);
  if (!phone) return "";
  const message = item.status === "pending_payment"
    ? `Hola ${item.customer_name || ""}, aceptamos tu solicitud ${item.request_code} para ${item.unit_name}, del ${formatDate(item.starts_on)} al ${formatDate(item.ends_on)}. Total estadía: ${item.currency || "ARS"} ${Number(item.lodging_total || 0).toLocaleString("es-AR")}. Reserva ${Number(item.deposit_percentage || 0)}%: ${item.currency || "ARS"} ${Number(item.deposit_required_amount || 0).toLocaleString("es-AR")}. Realizá el pago antes del ${new Date(item.hold_expires_at).toLocaleString("es-AR")}. Datos de pago: ${settings.bankPaymentDetails || "consultanos para coordinar el pago"}. La reserva quedará confirmada cuando registremos el pago.`
    : `Hola ${item.customer_name || ""}, recibimos tu solicitud ${item.request_code} para ${item.unit_name}, del ${formatDate(item.starts_on)} al ${formatDate(item.ends_on)}. Me comunico desde el alojamiento para revisar los detalles de tu reserva.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
};

export default function GuestExperienceBookingRequests({ businessId, guestAppId, app, onDataChanged }) {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(true);
  const [notifyById, setNotifyById] = useState({});
  const [filters, setFilters] = useState({ status: "pending", from: "", to: "" });

  async function load(nextFilters = filters) {
    setBusy(true);
    try {
      const query = new URLSearchParams({
        businessId: String(businessId),
        guestAppId: String(guestAppId),
        status: nextFilters.status,
      });
      if (nextFilters.from) query.set("from", nextFilters.from);
      if (nextFilters.to) query.set("to", nextFilters.to);
      const response = await fetch(
        `/api/guest-experience/admin/booking-requests?${query}`,
        { cache: "no-store" },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        return showAlert({
          title: "No se pudieron cargar",
          text: payload.error || "Revisá las solicitudes.",
          icon: "error",
        });
      }
      setItems(payload.requests || []);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load({ status: "pending", from: "", to: "" });
  }, [businessId, guestAppId]);

  function consultHistory(event) {
    event.preventDefault();
    load(filters);
  }

  async function act(item, action) {
    const notifyCustomer = notifyById[item.id] !== false;
    const accepted = await showAlert({
      title: action === "approve" ? "¿Aceptar y enviar los datos de pago?" : action === "payment_received" ? "¿Registrar el pago y confirmar la reserva?" : action === "expire" ? "¿Vencer esta solicitud?" : action === "cancel" ? "¿Cancelar esta solicitud?" : "¿Rechazar esta solicitud?",
      text: `${
        action === "approve" ? `${metadataOf(item).groupProposal ? "Todas las unidades" : "La unidad"} quedará${metadataOf(item).groupProposal ? "n" : ""} retenida${metadataOf(item).groupProposal ? "s" : ""} durante ${Number(app?.settings?.reservationPaymentHours || 48)} horas y se enviarán el presupuesto y los datos de pago.` : action === "payment_received" ? `Se volverá${metadataOf(item).groupProposal ? "n" : ""} a validar ${metadataOf(item).groupProposal ? "todas las unidades y se crearán las estadías" : "la unidad y se creará la estadía"} formal${metadataOf(item).groupProposal ? "es" : ""}; luego podrás enviar el acceso a Mi Estadía.` : "La solicitud dejará de ocupar inventario."
      }${notifyCustomer ? " Se notificará al cliente por email cuando corresponda." : " No se notificará al cliente."}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: action === "approve" ? "Aceptar y enviar" : action === "payment_received" ? "Pago recibido" : action === "expire" ? "Vencer" : action === "cancel" ? "Cancelar solicitud" : "Rechazar",
      cancelButtonText: "Volver",
    });
    if (!accepted) return;

    setBusy(true);
    try {
      const response = await fetch("/api/guest-experience/admin/booking-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, guestAppId, requestId: item.id, action }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        return showAlert({
          title: "No se pudo completar",
          text: payload.error || "Revisá la solicitud.",
          icon: "error",
        });
      }

      await onDataChanged?.();
      await load();

      let notificationResponse = null;
      let notification = {};
      let notificationCancelled = false;
      if (action === "payment_received" && notifyCustomer && item.customer_email) {
        const preview = buildReservationAccessCommunication({
          stay: {
            stay_code: payload.stayCode,
            guest_name: item.customer_name,
            guest_email: item.customer_email,
            guest_phone: item.customer_phone,
            starts_at: item.starts_on,
            ends_at: item.ends_on,
            adults: item.adults,
            children: item.children,
            unit_name: metadataOf(item).groupProposal ? `${metadataOf(item).groupProposal.units?.length || 2} unidades` : item.unit_name,
            lodging_total: payload.lodgingTotal,
            deposit_required_amount: item.deposit_required_amount,
            currency: payload.currency || app?.currency || "ARS",
            app_name: app?.name,
            logo_url: app?.logo_url,
          },
          settings: app?.settings || {},
          eventCode: "access_link",
        });
        const sendAccepted = await showAlert({
          title: "Revisá el aviso por email antes de enviarlo",
          text: `<div style="margin-bottom:12px;text-align:left;font-size:13px"><strong>Destinatario:</strong> ${String(item.customer_email).replace(/[<>&]/g, "")}<br><strong>Asunto:</strong> ${preview.title}<br><small>El enlace seguro de Mi Estadía se generará al confirmar el envío.</small></div>${preview.html}`,
          icon: "info",
          isHtml: true,
          showCancelButton: true,
          confirmButtonText: "Confirmar y enviar",
          cancelButtonText: "No enviar",
          width: "760px",
        });
        if (sendAccepted) {
          notificationResponse = await fetch("/api/guest-experience/admin/invitations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              businessId,
              guestAppId,
              stayId: payload.stayId,
              channel: "email",
              eventCode: "access_link",
            }),
          });
          notification = await notificationResponse.json().catch(() => ({}));
        } else {
          notificationCancelled = true;
        }
      } else {
        notificationResponse = await fetch(
          "/api/guest-experience/admin/booking-requests/notify",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              businessId,
              guestAppId,
              requestId: item.id,
              notifyCustomer,
            }),
          },
        );
        notification = await notificationResponse.json().catch(() => ({}));
      }

      const baseText = action === "payment_received" ? payload.stayCount>1?`Se crearon ${payload.stayCount} estadías: ${(payload.stayCodes||[]).join(", ")}.`:`Se creó la estadía ${payload.stayCode}.` : action === "approve" ? "La solicitud fue aceptada y quedó pendiente de pago." : `La solicitud fue cerrada y ${metadataOf(item).groupProposal ? "las unidades quedaron liberadas" : "la unidad quedó liberada"}.`;
      const notificationText = !notifyCustomer
        ? " No se notificó al cliente."
        : notificationCancelled
          ? " El envío del acceso fue cancelado."
        : notification.skipped === "missing_email"
          ? " No se pudo notificar porque la solicitud no tiene email."
          : !notificationResponse?.ok
            ? ` ${notification.error || "No se pudo enviar el email."}`
            : action === "payment_received"
              ? " Se envió por email el enlace de acceso a Mi Estadía."
              : " Se notificó al cliente por email.";
      await showAlert({
        title: action === "payment_received" ? "Reserva confirmada" : action === "approve" ? "Pendiente de pago" : "Solicitud cerrada",
        text: baseText + notificationText,
        icon: notificationResponse?.ok ? "success" : "warning",
      });
    } finally {
      setBusy(false);
    }
  }


  return (
    <section className="tags_guest_booking_requests">
      <header>
        <div>
          <span>MOTOR DE RESERVAS</span>
          <h2>Solicitudes recibidas</h2>
          <p>
            Las retenciones vencen automáticamente. Las solicitudes en revisión no ocupan
            inventario hasta ser aprobadas.
          </p>
        </div>
        <PushNotificationButton businessId={businessId} />
      </header>
      <form className="tags_guest_booking_filters" onSubmit={consultHistory}>
        <label>Mostrar<select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="pending">Pendientes</option><option value="confirmed">Aprobadas</option><option value="rejected">Rechazadas</option><option value="closed">Vencidas o canceladas</option><option value="all">Todas</option></select></label>
        <label>Fecha o desde<input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} /></label>
        <label>Hasta (opcional)<input type="date" min={filters.from || undefined} value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} /></label>
        <button type="submit">Consultar</button>
        {(filters.status !== "pending" || filters.from || filters.to) && <button type="button" className="is_clear" onClick={() => { const defaults = { status: "pending", from: "", to: "" }; setFilters(defaults); load(defaults); }}>Ver pendientes</button>}
      </form>
      <div>
        {items.map((item) => {
          const groupProposal = metadataOf(item).groupProposal;
          return <article key={item.id}>
            <header>
              <strong>{item.request_code}</strong>
              <b className={`is_${item.status}`}>{LABEL[item.status] || item.status}</b>
            </header>
            <h3>{item.customer_name}</h3>
            <p>
              {groupProposal ? "Solicitud grupal" : item.unit_name} · {formatDate(item.starts_on)} al {formatDate(item.ends_on)} ·{" "}
              {app?.settings?.lodgingPolicy?.capacityMode === "adult_child_limits" ? `${item.adults} adulto(s) y ${item.children} menor(es)` : `${Number(item.adults||0)+Number(item.children||0)} huésped(es)`}
            </p>
            {groupProposal && <div className="tags_guest_booking_group"><strong>Combinación sugerida</strong><ul>{groupProposal.units?.map(unit => <li key={unit.unitId}>{unit.name}: {unit.suggestedGuests} persona(s) · capacidad {unit.capacity}</li>)}</ul><small>La distribución es orientativa y puede reemplazarse por otra más adecuada al organizar la grilla.</small></div>}
            <div>
              {item.customer_email && (
                <span>
                  <FaEnvelope />
                  {item.customer_email}
                </span>
              )}
              {item.customer_phone && (
                <span>
                  <FaPhone />
                  {item.customer_phone}
                </span>
              )}
              {item.hold_expires_at && item.status === "held" && (
                <span>
                  <FaClock />
                  Vence {new Date(item.hold_expires_at).toLocaleString("es-AR")}
                </span>
              )}
            </div>
            {item.customer_notes && <small>{item.customer_notes}</small>}
            {item.customer_phone && whatsappUrl(item, app?.settings) && (
              <a className="tags_guest_booking_whatsapp" href={whatsappUrl(item, app?.settings)} target="_blank" rel="noreferrer">
                <FaWhatsapp /> Conversar por WhatsApp
              </a>
            )}
            {["held", "review_required", "pending_payment"].includes(item.status) && (
              <footer>
                <label className="tags_guest_booking_notify">
                  <input
                    type="checkbox"
                    checked={notifyById[item.id] !== false}
                    onChange={(event) =>
                      setNotifyById((current) => ({
                        ...current,
                        [item.id]: event.target.checked,
                      }))
                    }
                  />
                  <span>Notificar al cliente</span>
                  {!item.customer_email && <small>Sin email cargado</small>}
                </label>
                {item.status !== "pending_payment" && <button onClick={() => act(item, "approve")}><FaCheck /> Aceptar y enviar pago</button>}
                {item.status === "pending_payment" && <button onClick={() => act(item, "payment_received")}><FaCheck /> Pago recibido · confirmar</button>}
                {item.status === "pending_payment" && <button className="is_reject" onClick={() => act(item, "expire")}><FaClock /> Vencer y liberar</button>}
                {item.status === "pending_payment" && <button className="is_reject" onClick={() => act(item, "cancel")}><FaXmark /> Cancelar y liberar</button>}
                {item.status !== "pending_payment" && <button className="is_reject" onClick={() => act(item, "reject")}><FaXmark /> Rechazar</button>}
              </footer>
            )}
          </article>;
        })}
        {!items.length && !busy && (
          <p className="tags_guest_booking_requests_empty">No hay solicitudes para los filtros seleccionados.</p>
        )}
      </div>
      {busy && (
        <TagsSpinner
          size={100}
          logoSize={50}
          borderSize={4}
          background="rgba(255,255,255,.72)"
        />
      )}
    </section>
  );
}
