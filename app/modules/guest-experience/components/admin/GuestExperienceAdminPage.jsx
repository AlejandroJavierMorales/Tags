"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaArrowLeft, FaBed, FaCalendarCheck, FaCalendarDays, FaComments, FaDoorOpen, FaEye, FaGear, FaGift, FaHotel, FaLocationDot, FaMoneyBillWave, FaPlus, FaShop, FaStar, FaUsers, FaUtensils, FaUserCheck } from "react-icons/fa6";
import TagsSpinner from "@/app/components/TagsSpinner";
import showAlert from "@/app/components/showAlert";
import { normalizeArgentinaWhatsapp } from "@/app/modules/qr-page/lib/normalizeContactFields";
import { buildReservationAccessCommunication } from "@/app/modules/guest-experience/lib/reservationAccessCommunication";
import GuestExperienceReservationsPanel from "./GuestExperienceReservationsPanel";
import GuestExperienceArrivalsPanel from "./GuestExperienceArrivalsPanel";
import GuestExperienceFinanceReport from "./GuestExperienceFinanceReport";
import GuestExperienceCheckinPanel from "./GuestExperienceCheckinPanel";
import GuestExperienceSettingsPanel from "./GuestExperienceSettingsPanel";
import GuestExperienceNearbyManager from "./GuestExperienceNearbyManager";
import GuestExperienceBenefitsManager from "./GuestExperienceBenefitsManager";
import GuestExperienceMessagesManager from "./GuestExperienceMessagesManager";
import GuestExperienceTurnosManager from "./GuestExperienceTurnosManager";
import GuestExperienceCommerceManager from "./GuestExperienceCommerceManager";
import GuestExperienceCommerceOrders from "./GuestExperienceCommerceOrders";
import GuestExperienceReviewsManager from "./GuestExperienceReviewsManager";
import GuestExperienceAdminNavigation from "./GuestExperienceAdminNavigation";
import GuestExperienceTeamManager from "./GuestExperienceTeamManager";
import PushNotificationButton from "@/app/modules/notifications/components/PushNotificationButton";
import "./GuestExperienceAdminPage.css";
import "./GuestExperienceAdminHeader.css";
const UNIT = {
  name: "",
  code: "",
  capacityAdults: 2,
  capacityChildren: 0
};
export default function GuestExperienceAdminPage({
  businessId
}) {
  const router = useRouter(),
    [data, setData] = useState(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [missing, setMissing] = useState(false),
    [tab, setTab] = useState("reservations"),
    [externalStayId, setExternalStayId] = useState(null),
    [unit, setUnit] = useState(UNIT),
    [activation, setActivation] = useState({
      name: "Mi Estadía",
      slug: "mi-estadia"
    });
  async function load(silent = false) {
    if (!silent) setLoading(true);
    try {
      const r = await fetch(`/api/guest-experience/admin/bootstrap?businessId=${businessId}`, {
          cache: "no-store"
        }),
        p = await r.json();
      if (r.status === 404) {
        setMissing(true);
        setData(null);
        return;
      }
      if (!r.ok) return showAlert({
        title: "No se pudo cargar",
        text: p.error || "Error cargando Mi Estadía.",
        icon: "error"
      });
      setMissing(false);
      setData(p);
      if (p.access?.isStaff) {
        const permissions = p.access.permissions || [];
        setTab(permissions.includes("guest.stays.view") ? "reservations" : permissions.includes("guest.messages.view") ? "messages" : permissions.includes("guest.accounts.view") ? "finance" : "reservations");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [businessId]);
  useEffect(() => {
    const openCheckin = event => { sessionStorage.setItem("tags_guest_checkin_stay", String(event.detail)); setExternalStayId(null); setTab("checkin"); };
    window.addEventListener("tags-guest-open-checkin", openCheckin);
    return () => window.removeEventListener("tags-guest-open-checkin", openCheckin);
  }, []);
  async function request(url, method, body, success) {
    setBusy(true);
    try {
      const r = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            businessId,
            guestAppId: data?.app?.id,
            ...body
          })
        }),
        p = await r.json();
      if (!r.ok) {
        await showAlert({
          title: "No se pudo completar",
          text: p.error || "Revisá la información.",
          icon: "error"
        });
        return null;
      }
      if (success) await showAlert({
        title: "Listo",
        text: success,
        icon: "success",
        timer: 1500
      });
      await load(true);
      return p;
    } finally {
      setBusy(false);
    }
  }
  async function activate(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await fetch("/api/workspace/apps/guest-experience/activate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            businessId,
            ...activation
          })
        }),
        p = await r.json();
      if (!r.ok) return showAlert({
        title: "No se pudo activar",
        text: p.error || "Revisá el addon.",
        icon: "error"
      });
      await load();
    } finally {
      setBusy(false);
    }
  }
  async function createReservation(form) {
    const created = await request("/api/guest-experience/admin/stays", "POST", form, null);
    if (!created) return false;
    const unit = data.units.find(item => Number(item.id) === Number(form.unitId));
    const nights = Math.max(1, Math.round((new Date(`${form.endsAt}T12:00:00`) - new Date(`${form.startsAt}T12:00:00`)) / 86400000));
    const lodgingTotal = Number(form.nightlyRate || 0) * nights;
    const previewStay = {
      id: created.reservationId,
      stay_code: created.stayCode,
      guest_name: `${form.firstName} ${form.lastName}`.trim(),
      guest_email: form.email,
      starts_at: form.startsAt,
      ends_at: form.endsAt,
      adults: form.adults,
      children: form.children,
      unit_name: unit?.name || "A confirmar",
      lodging_total: lodgingTotal,
      deposit_required_amount: lodgingTotal * Number(form.depositPercentage || 0) / 100,
      currency: data.app.currency || "ARS",
      app_name: data.app.name,
      logo_url: data.app.logo_url
    };
    const sent = await invite(previewStay, "email");
    if (!sent) await showAlert({ title: "Reserva creada", text: "La reserva quedó registrada, pero el envío del email fue cancelado.", icon: "info" });
    return true;
  }
  async function updateReservation(form) {
    const previous = data.stays.find(item => Number(item.id) === Number(form.stayId));
    const reprogrammed = previous?.status === "no_show_rebooking";
    const updated = await request("/api/guest-experience/admin/stays", "PATCH", form, reprogrammed ? "Reserva reprogramada." : "Reserva modificada.");
    if (!updated) return false;
    if (reprogrammed) {
      const unit = data.units.find(item => Number(item.id) === Number(form.unitId));
      const nights = Math.max(1, Math.round((new Date(`${form.endsAt}T12:00:00`) - new Date(`${form.startsAt}T12:00:00`)) / 86400000));
      await invite({ ...previous, guest_name: `${form.firstName} ${form.lastName}`.trim(), guest_email: form.email, guest_phone: form.phone, starts_at: form.startsAt, ends_at: form.endsAt, adults: form.adults, children: form.children, unit_name: unit?.name || "A confirmar", lodging_total: Number(form.nightlyRate || 0) * nights, deposit_required_amount: Number(form.nightlyRate || 0) * nights * Number(form.depositPercentage || 0) / 100, status: "reserved" }, "email");
    }
    return true;
  }
  async function deleteReservation(stayId) {
    return Boolean(await request("/api/guest-experience/admin/stays", "DELETE", { stayId }, "Reserva eliminada."));
  }
  async function markNoShow(payload) {
    return Boolean(await request("/api/guest-experience/admin/no-show", "POST", payload, "La reserva quedó pendiente de reprogramación y la unidad fue liberada."));
  }
  async function addUnit(e) {
    e.preventDefault();
    if (await request("/api/guest-experience/admin/units", "POST", unit, "Unidad creada.")) setUnit(UNIT);
  }
  async function invite(item, channel) {
    const reminder = channel === "reminder";
    const rebooking = item.status === "no_show_rebooking";
    const eventCode = rebooking ? "no_show_rebooking" : reminder ? "arrival_reminder" : "access_link";
    if (channel === "email" || channel === "whatsapp" || reminder) {
      const preview = buildReservationAccessCommunication({ stay: { ...item, app_name: data.app.name, logo_url: data.app.logo_url, currency: data.app.currency || "ARS" }, settings: data.app.settings || {}, eventCode });
      const confirmed = await showAlert({
        title: `Revisá el aviso por ${channel === "whatsapp" ? "WhatsApp" : "email"} antes de enviarlo`,
        text: `<div style="margin-bottom:12px;text-align:left;font-size:13px"><strong>Destinatario:</strong> ${String(channel === "whatsapp" ? item.guest_phone || "Sin teléfono" : item.guest_email || "Sin email").replace(/[<>&]/g, "")}<br><strong>Asunto:</strong> ${preview.title}${channel === "email" ? "<br><small>También se enviará una copia a la plataforma.</small>" : ""}</div>${preview.html}`,
        icon: "info",
        isHtml: true,
        showCancelButton: true,
        confirmButtonText: "Confirmar y enviar",
        cancelButtonText: "Cancelar",
        width: "760px"
      });
      if (!confirmed) return false;
    }
    const p = await request("/api/guest-experience/admin/invitations", "POST", {
      stayId: item.id,
      channel: reminder ? "email" : channel,
      eventCode
    }, reminder ? "Recordatorio de ingreso enviado." : channel === "email" ? rebooking ? "Aviso de reprogramación enviado por email." : "Acceso enviado por email." : null);
    if (!p) return false;
    if (channel === "whatsapp" && p.whatsappUrl) {
      const url = new URL(p.whatsappUrl);
      const phone = normalizeArgentinaWhatsapp(item.guest_phone);
      if (phone) url.pathname = `/${phone}`;
      window.open(url.toString(), "_blank", "noopener,noreferrer");
    }
    if (channel === "manual") {
      await navigator.clipboard.writeText(p.link);
      await showAlert({
        title: "Enlace copiado",
        text: "El acceso quedó en el portapapeles.",
        icon: "success",
        timer: 1600
      });
    }
    return true;
  }
  async function deleteCommunication(record) {
    const ok = await showAlert({ title: "¿Eliminar esta comunicación?", text: "Se quitará del historial de la reserva. Esta acción no reenvía ni modifica el enlace del huésped.", icon: "warning", showCancelButton: true, confirmButtonText: "Eliminar", cancelButtonText: "Cancelar" });
    if (!ok) return false;
    return Boolean(await request("/api/guest-experience/admin/communications", "DELETE", { communicationId: record.id }, "Comunicación eliminada del historial."));
  }
  async function togglePublication() {
    const next = data.app.status === "published" ? "draft" : "published",
      action = next === "published" ? "publicar" : "despublicar";
    const ok = await showAlert({
      title: `¿${action[0].toUpperCase() + action.slice(1)} la página?`,
      text: next === "published" ? "Los huéspedes con acceso podrán ingresar a Mi Estadía." : "Los accesos públicos quedarán temporalmente deshabilitados.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: next === "published" ? "Publicar" : "Despublicar",
      cancelButtonText: "Cancelar"
    });
    if (ok) await request("/api/guest-experience/admin/publication", "PATCH", {
      status: next
    }, next === "published" ? "Página publicada." : "Página despublicada.");
  }
  async function saveCheckin(body, success) {
    setBusy(true);
    try {
      async function send(confirmOutstanding = false) {
        const response = await fetch("/api/guest-experience/admin/checkin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, guestAppId: data.app.id, ...body, confirmOutstanding }) });
        return { response, payload: await response.json().catch(() => ({})) };
      }
      let result = await send();
      if (result.payload.code === "outstanding_balance") {
        const amount = Number(result.payload.balance || 0).toLocaleString("es-AR", { style: "currency", currency: data.app.currency || "ARS" });
        const proceed = await showAlert({ title: "La estadía tiene saldo pendiente", text: `Quedan ${amount} sin registrar como pagados. Podés volver para cargar el pago o confirmar el ingreso igualmente.`, icon: "warning", showCancelButton: true, confirmButtonText: "Confirmar igualmente", cancelButtonText: "Registrar pago primero" });
        if (!proceed) return false;
        result = await send(true);
      }
      if (!result.response.ok || !result.payload.ok) { await showAlert({ title: "No se pudo completar", text: result.payload.error || "Revisá la información.", icon: "error" }); return false; }
      await showAlert({ title: "Listo", text: success, icon: "success", timer: 1500 });
      await load(true);
      return true;
    } finally { setBusy(false); }
  }
  async function checkoutReservation(item) {
    const first = await showAlert({ title: "¿Confirmar checkout?", text: "La estadía pasará a estado concluido y se ocultarán las claves WiFi.", icon: "warning", showCancelButton: true, confirmButtonText: "Confirmar checkout", cancelButtonText: "Cancelar" });
    if (!first) return false;
    async function send(confirmEarly = false) {
      const response = await fetch("/api/guest-experience/admin/checkin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, guestAppId: data.app.id, stayId: item.id, action: "checkout", confirmEarly }) });
      const payload = await response.json().catch(() => ({}));
      return { response, payload };
    }
    let result = await send();
    if (result.payload.code === "early_checkout") {
      const early = await showAlert({ title: "Checkout anticipado", text: `${result.payload.error} ¿Querés confirmar igualmente?`, icon: "warning", showCancelButton: true, confirmButtonText: "Sí, hacer checkout", cancelButtonText: "Cancelar" });
      if (!early) return false;
      result = await send(true);
    }
    if (!result.response.ok || !result.payload.ok) { await showAlert({ title: "No se pudo confirmar", text: result.payload.error || "Error al registrar el checkout.", icon: "error" }); return false; }
    await showAlert({ title: "Checkout confirmado", text: "La estadía quedó concluida y las claves WiFi ya no están disponibles.", icon: "success", timer: 1800 });
    await load(true);
    return true;
  }
  function financeManage(value) {
    if (value && typeof value === "object" && value.checkout) {
      const item = data?.stays?.find(stay => Number(stay.id) === Number(value.id));
      if (item) checkoutReservation(item);
      return;
    }
    setExternalStayId(value);
  }
  if (loading) return <TagsSpinner size={120} logoSize={66} borderSize={5} background="rgba(255,255,255,.82)" />;
  if (!data && !missing) return <main className="tags_guest_admin"><section className="tags_guest_admin_panel"><h2>No se pudo cargar Mi Estadía</h2><p>Volvé a intentar en unos segundos.</p></section></main>;
  const can = permission => data?.access?.isOwner || data?.access?.permissions?.includes(permission);
  const adminGroups = [
    { key:"stays",label:"Reservas / Estadías",icon:FaCalendarDays,items:[
      can("guest.stays.view")&&{key:"reservations",label:"Grilla de ocupación",icon:FaCalendarDays},
      can("guest.stays.view")&&{key:"rebookings",label:"Reprogramaciones",icon:FaCalendarCheck},
      can("guest.stays.view")&&{key:"arrivals",label:"Ingresos",icon:FaDoorOpen},
      can("guest.accounts.view")&&{key:"finance",label:"Estadías y pagos",icon:FaMoneyBillWave},
      can("guest.checkin.manage")&&{key:"checkin",label:"Checkin",icon:FaUserCheck},
      can("guest.stays.view")&&{key:"active",label:"Estadías en curso",icon:FaBed},
    ].filter(Boolean)},
    data?.access?.isOwner&&{ key:"configuration",label:"Configuración",icon:FaGear,items:[{key:"settings",label:"General",icon:FaGear},{key:"units",label:"Unidades / Habitaciones",icon:FaHotel},{key:"team",label:"Equipo y accesos",icon:FaUsers}]},
    { key:"guest_services",label:"Servicios al huésped",icon:FaGift,items:[
      data?.access?.isOwner&&{key:"turnos",label:"Reservas de amenities",icon:FaCalendarCheck},
      data?.access?.isOwner&&{key:"commerce",label:"Tienda y gastronomía",icon:FaShop},
      data?.access?.isOwner&&{key:"store_orders",label:"Pedidos de tienda",icon:FaShop},
      data?.access?.isOwner&&{key:"resto_orders",label:"Pedidos de gastronomía",icon:FaUtensils},
      can("guest.messages.view")&&{key:"messages",label:"Mensajes / Solicitudes",icon:FaComments},
      data?.access?.isOwner&&{key:"nearby",label:"Lugares cercanos",icon:FaLocationDot},
      data?.access?.isOwner&&{key:"benefits",label:"Beneficios",icon:FaGift},
      data?.access?.isOwner&&{key:"reviews",label:"Reseñas",icon:FaStar},
    ].filter(Boolean)},
  ].filter(group=>group&&group.items.length);
  const adminNavigation = <GuestExperienceAdminNavigation groups={adminGroups} active={tab} onChange={setTab}/>;
  if (!missing && tab === "commerce_resto") return <main className="tags_guest_admin"><header className="tags_guest_admin_hero"><div className="tags_guest_admin_identity"><span className="tags_guest_admin_icon"><FaUtensils /></span><div><small>GASTRONOMÍA</small><h1>{data.app.name}</h1><p>Configuración de instancia de Resto</p></div></div></header>{adminNavigation}<GuestExperienceCommerceManager businessId={businessId} data={data} moduleType="resto" /></main>;
  if (!missing && tab === "reviews") return <main className="tags_guest_admin"><header className="tags_guest_admin_hero"><div className="tags_guest_admin_identity"><span className="tags_guest_admin_icon"><FaStar /></span><div><small>EXPERIENCIA DEL HUÉSPED</small><h1>{data.app.name}</h1><p>Reseñas de huéspedes</p></div></div></header>{adminNavigation}<GuestExperienceReviewsManager businessId={businessId} data={data} /></main>;
  if (!missing && tab === "team" && data.access?.isOwner) return <main className="tags_guest_admin"><header className="tags_guest_admin_hero"><div className="tags_guest_admin_identity"><span className="tags_guest_admin_icon"><FaUsers /></span><div><small>ADMINISTRACIÓN</small><h1>{data.app.name}</h1><p>Equipo y accesos</p></div></div></header>{adminNavigation}<GuestExperienceTeamManager businessId={businessId} data={data} /></main>;
  if (!missing && (tab === "store_orders" || tab === "resto_orders")) return <main className="tags_guest_admin"><header className="tags_guest_admin_hero"><div className="tags_guest_admin_identity"><span className="tags_guest_admin_icon">{tab === "store_orders" ? <FaShop /> : <FaUtensils />}</span><div><small>SERVICIOS AL HUÉSPED</small><h1>{data.app.name}</h1><p>{tab === "store_orders" ? "Pedidos de tienda" : "Pedidos de gastronomía"}</p></div></div><div className="tags_guest_admin_hero_actions"><button type="button" onClick={() => setTab(tab === "store_orders" ? "commerce" : "commerce_resto")}><FaArrowLeft /> Volver a configuración</button></div></header>{adminNavigation}<GuestExperienceCommerceOrders businessId={businessId} guestAppId={data.app.id} moduleType={tab === "store_orders" ? "store" : "resto"} /></main>;
  if (!missing && tab === "checkin") return <main className="tags_guest_admin">
<header className="tags_guest_admin_hero">
<div className="tags_guest_admin_identity">
<span className="tags_guest_admin_icon">
<FaHotel />
</span>
<div>
<small>RECEPCIÓN</small>
<h1>{data.app.name}</h1>
<p>Checkin</p>
</div>
</div>
<div className="tags_guest_admin_hero_actions">
<button type="button" onClick={() => setTab("reservations")}>
<FaArrowLeft /> Volver a Reservas</button>
</div>
</header>
{adminNavigation}
<GuestExperienceCheckinPanel businessId={businessId} data={data} busy={busy} onSaved={saveCheckin} onDataChanged={()=>load(true)} />{busy && <TagsSpinner size={120} logoSize={66} borderSize={5} background="rgba(255,255,255,.72)" />}</main>;
  if (!missing && tab === "rebookings") return <main className="tags_guest_admin"><header className="tags_guest_admin_hero"><div className="tags_guest_admin_identity"><span className="tags_guest_admin_icon"><FaCalendarCheck /></span><div><small>RESERVAS</small><h1>Reprogramaciones</h1><p>Reservas no presentadas que todavía necesitan una nueva fecha</p></div></div><div className="tags_guest_admin_hero_actions"><button type="button" onClick={()=>setTab("reservations")}><FaArrowLeft /> Volver a la grilla</button></div></header>{adminNavigation}<GuestExperienceReservationsPanel rebookingsOnly canManage={can("guest.stays.manage")} canCheckin={can("guest.checkin.manage")} data={data} busy={busy} onCreate={createReservation} onUpdate={updateReservation} onDelete={deleteReservation} onNoShow={markNoShow} onInvite={invite} onDeleteCommunication={deleteCommunication} onCheckout={checkoutReservation} onDataChanged={()=>load(true)} /></main>;
  if (!missing && tab === "active") return <main className="tags_guest_admin">
<header className="tags_guest_admin_hero">
<div className="tags_guest_admin_identity">
<span className="tags_guest_admin_icon">
<FaHotel />
</span>
<div>
<small>ALOJAMIENTO</small>
<h1>Estadías en curso</h1>
<p>Huéspedes cuyo check-in ya fue confirmado</p>
</div>
</div>
<div className="tags_guest_admin_hero_actions">
<button type="button" onClick={() => setTab("reservations")}>
<FaArrowLeft /> Volver a Reservas</button>
</div>
</header>
{adminNavigation}
<section className="tags_guest_admin_panel">
<div className="tags_guest_admin_list">{data.stays.filter(item => item.status === "active").map(item => <article key={item.id}>
<div>
<strong>{item.stay_code} · {item.guest_name}</strong>
<span className="tags_guest_stay_in_progress">Estadía en curso</span>
<span>{item.unit_name} · hasta el {new Date(item.ends_at).toLocaleDateString("es-AR")}</span>
<small>{item.guest_phone} · {item.guest_email}</small>
{Number(item.account_balance||0)>0.009&&<div className="tags_guest_reservation_balance"><span>Abonado <strong>${Number(item.paid_total||0).toLocaleString("es-AR")}</strong></span><span>Saldo pendiente <strong>${Number(item.account_balance||0).toLocaleString("es-AR")}</strong></span><button type="button" onClick={()=>{sessionStorage.setItem("tags_guest_open_stay",String(item.id));setTab("reservations")}}>Ver detalle / imputar pago</button></div>}
</div>
</article>)}{!data.stays.some(item => item.status === "active") && <p>No hay estadías en curso.</p>}</div>
</section>
</main>;
  if (!missing && tab === "arrivals") return <main className="tags_guest_admin"><header className="tags_guest_admin_hero"><div className="tags_guest_admin_identity"><span className="tags_guest_admin_icon"><FaHotel /></span><div><small>RECEPCIÓN</small><h1>{data.app.name}</h1><p>Ingresos previstos</p></div></div></header>{adminNavigation}<GuestExperienceArrivalsPanel data={data} onBack={() => setTab("reservations")} onReminder={item=>invite(item,"reminder")} onCheckin={stayId => { sessionStorage.setItem("tags_guest_checkin_stay", String(stayId)); setTab("checkin"); }} onViewDetail={stayId=>{sessionStorage.setItem("tags_guest_open_stay",String(stayId));setTab("reservations")}} /></main>;
  if (!missing && tab === "finance") return <main className="tags_guest_admin"><header className="tags_guest_admin_hero"><div className="tags_guest_admin_identity"><span className="tags_guest_admin_icon"><FaHotel /></span><div><small>ADMINISTRACIÓN</small><h1>{data.app.name}</h1><p>Estadías, ventas y pagos</p></div></div></header>{adminNavigation}<GuestExperienceFinanceReport businessId={businessId} data={data} onBack={() => setTab("reservations")} onManage={financeManage} />{externalStayId&&<GuestExperienceReservationsPanel canManage={can("guest.stays.manage")} canCheckin={can("guest.checkin.manage")} overlayOnly stayId={externalStayId} onClose={()=>setExternalStayId(null)} data={data} busy={busy} onCreate={createReservation} onUpdate={updateReservation} onDelete={deleteReservation} onNoShow={markNoShow} onInvite={invite} onDeleteCommunication={deleteCommunication} onCheckout={checkoutReservation} onDataChanged={()=>load(true)}/>}</main>;
  if (missing) return <main className="tags_guest_admin">
<header className="tags_guest_admin_hero">
<div className="tags_guest_admin_identity">
<span className="tags_guest_admin_icon">
<FaHotel />
</span>
<div>
<small>NUEVO ADDON</small>
<h1>Tags Guest Experience</h1>
<p>Creá la experiencia Mi Estadía para el alojamiento.</p>
</div>
</div>
<button onClick={() => router.push(`/dashboard/businesses/${businessId}`)}>
<FaArrowLeft /> Volver al negocio</button>
</header>
<section className="tags_guest_admin_activation">
<form onSubmit={activate}>
<h2>Crear Mi Estadía</h2>
<label>Nombre<input required value={activation.name} onChange={e => setActivation({
            ...activation,
            name: e.target.value
          })} />
</label>
<label>Ruta inicial<input required value={activation.slug} onChange={e => setActivation({
            ...activation,
            slug: e.target.value
          })} />
</label>
<button disabled={busy}>Activar instancia</button>
</form>
</section>{busy && <TagsSpinner size={120} logoSize={66} borderSize={5} background="rgba(255,255,255,.72)" />}</main>;
  return <main className="tags_guest_admin">
<header className="tags_guest_admin_hero">
<div className="tags_guest_admin_identity">
<span className="tags_guest_admin_icon">
<FaHotel />
</span>
<div>
<small>MÓDULO DEL ALOJAMIENTO</small>
<h1>{data.app.name}</h1>
<p>Reservas, check-in y experiencia del huésped</p>
</div>
</div>
<div className="tags_guest_admin_hero_actions">
<button onClick={() => router.push(`/dashboard/businesses/${businessId}`)}>
<FaArrowLeft /> Volver al negocio</button>
<button onClick={togglePublication}>{data.app.status === "published" ? "Despublicar" : "Publicar"}</button>
<a href={`/p/${data.app.slug}/mi-estadia`} target="_blank" rel="noreferrer">
<FaEye /> Ver página</a>
</div>
</header>
{adminNavigation}{data.access?.isStaff&&tab==="reservations"&&<PushNotificationButton businessId={businessId}/>} {tab === "reservations" && <GuestExperienceReservationsPanel canManage={can("guest.stays.manage")} canCheckin={can("guest.checkin.manage")} data={data} busy={busy} onCreate={createReservation} onUpdate={updateReservation} onDelete={deleteReservation} onNoShow={markNoShow} onInvite={invite} onDeleteCommunication={deleteCommunication} onCheckout={checkoutReservation} onDataChanged={()=>load(true)} />} {tab === "checkin" && <section className="tags_guest_admin_panel">
<h2>Pre-check-in y check-in</h2>
<p>Las reservas pendientes aparecerán aquí para completar acompañantes, vehículo y confirmar el ingreso.</p>
</section>}{tab === "active" && <section className="tags_guest_admin_panel">
<h2>Estadías en curso</h2>
<p>Esta vista mostrará únicamente las reservas cuyo check-in ya fue confirmado.</p>
</section>}{tab === "units" && <section className="tags_guest_admin_panel">
<header>
<h2>Unidades del alojamiento</h2>
</header>
<form className="tags_guest_admin_form" onSubmit={addUnit}>
<label>Nombre<input required value={unit.name} onChange={e => setUnit({
            ...unit,
            name: e.target.value
          })} />
</label>
<label>Código<input value={unit.code} onChange={e => setUnit({
            ...unit,
            code: e.target.value
          })} />
</label>
<label>Adultos<input type="number" min="1" value={unit.capacityAdults} onChange={e => setUnit({
            ...unit,
            capacityAdults: e.target.value
          })} />
</label>
<label>Niños<input type="number" min="0" value={unit.capacityChildren} onChange={e => setUnit({
            ...unit,
            capacityChildren: e.target.value
          })} />
</label>
<button disabled={busy}>
<FaPlus /> Crear unidad</button>
</form>
<div className="tags_guest_admin_list">{data.units.map(item => <article key={item.id}>
<div>
<strong>{item.name}</strong>
<span>{item.code || "Sin código"} · Capacidad: {item.capacity_adults} adultos y {item.capacity_children} niños</span>
</div>
</article>)}</div>
</section>}{tab === "nearby" && <GuestExperienceNearbyManager businessId={businessId} data={data}/>} {tab === "benefits" && <GuestExperienceBenefitsManager businessId={businessId} data={data}/>} {tab === "turnos" && <GuestExperienceTurnosManager businessId={businessId} data={data}/>} {tab === "commerce" && <GuestExperienceCommerceManager businessId={businessId} data={data} moduleType="store"/>} {tab === "messages" && <GuestExperienceMessagesManager businessId={businessId} data={data}/>} {tab === "settings" && <GuestExperienceSettingsPanel businessId={businessId} data={data} onSaved={() => load(true)} />} {busy && <TagsSpinner size={120} logoSize={66} borderSize={5} background="rgba(255,255,255,.72)" />}</main>;
}
