"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaArrowLeft, FaBed, FaCalendarCheck, FaCalendarDays, FaComments, FaDoorOpen, FaEye, FaGear, FaGift, FaHotel, FaLocationDot, FaMoneyBillWave, FaPlus, FaShop, FaStar, FaUtensils, FaUserCheck } from "react-icons/fa6";
import TagsSpinner from "@/app/components/TagsSpinner";
import showAlert from "@/app/components/showAlert";
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
    return Boolean(await request("/api/guest-experience/admin/stays", "POST", form, "Reserva creada y agregada a la ocupación."));
  }
  async function updateReservation(form) {
    return Boolean(await request("/api/guest-experience/admin/stays", "PATCH", form, "Reserva modificada."));
  }
  async function deleteReservation(stayId) {
    return Boolean(await request("/api/guest-experience/admin/stays", "DELETE", { stayId }, "Reserva eliminada."));
  }
  async function addUnit(e) {
    e.preventDefault();
    if (await request("/api/guest-experience/admin/units", "POST", unit, "Unidad creada.")) setUnit(UNIT);
  }
  async function invite(item, channel) {
    const reminder = channel === "reminder";
    const p = await request("/api/guest-experience/admin/invitations", "POST", {
      stayId: item.id,
      channel: reminder ? "email" : channel,
      eventCode: reminder ? "arrival_reminder" : "access_link"
    }, reminder ? "Recordatorio de ingreso enviado." : channel === "email" ? "Acceso enviado por email." : null);
    if (!p) return;
    if (channel === "whatsapp" && p.whatsappUrl) window.open(p.whatsappUrl, "_blank", "noopener,noreferrer");
    if (channel === "manual") {
      await navigator.clipboard.writeText(p.link);
      await showAlert({
        title: "Enlace copiado",
        text: "El acceso quedó en el portapapeles.",
        icon: "success",
        timer: 1600
      });
    }
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
    return Boolean(await request("/api/guest-experience/admin/checkin", "POST", body, success));
  }
  const adminGroups = [{ key:"stays",label:"Reservas / Estadías",icon:FaCalendarDays,items:[{key:"reservations",label:"Grilla de ocupación",icon:FaCalendarDays},{key:"arrivals",label:"Ingresos",icon:FaDoorOpen},{key:"finance",label:"Estadías y pagos",icon:FaMoneyBillWave},{key:"checkin",label:"Checkin",icon:FaUserCheck},{key:"active",label:"Estadías en curso",icon:FaBed}]},{key:"configuration",label:"Configuración",icon:FaGear,items:[{key:"settings",label:"General",icon:FaGear},{key:"units",label:"Unidades / Habitaciones",icon:FaHotel}]},{key:"guest_services",label:"Servicios al huésped",icon:FaGift,items:[{key:"turnos",label:"Reservas de amenities",icon:FaCalendarCheck},{key:"commerce",label:"Tienda y gastronomía",icon:FaShop},{key:"store_orders",label:"Pedidos de tienda",icon:FaShop},{key:"resto_orders",label:"Pedidos de gastronomía",icon:FaUtensils},{key:"messages",label:"Mensajes / Solicitudes",icon:FaComments},{key:"nearby",label:"Lugares cercanos",icon:FaLocationDot},{key:"benefits",label:"Beneficios",icon:FaGift},{key:"reviews",label:"Reseñas",icon:FaStar}]}];
  const adminNavigation = <GuestExperienceAdminNavigation groups={adminGroups} active={tab} onChange={setTab}/>;
  if (!missing && tab === "commerce_resto") return <main className="tags_guest_admin"><header className="tags_guest_admin_hero"><div className="tags_guest_admin_identity"><span className="tags_guest_admin_icon"><FaUtensils /></span><div><small>GASTRONOMÍA</small><h1>{data.app.name}</h1><p>Configuración de instancia de Resto</p></div></div></header>{adminNavigation}<GuestExperienceCommerceManager businessId={businessId} data={data} moduleType="resto" /></main>;
  if (!missing && tab === "reviews") return <main className="tags_guest_admin"><header className="tags_guest_admin_hero"><div className="tags_guest_admin_identity"><span className="tags_guest_admin_icon"><FaStar /></span><div><small>EXPERIENCIA DEL HUÉSPED</small><h1>{data.app.name}</h1><p>Reseñas de huéspedes</p></div></div></header>{adminNavigation}<GuestExperienceReviewsManager businessId={businessId} data={data} /></main>;
  if (!missing && (tab === "store_orders" || tab === "resto_orders")) return <main className="tags_guest_admin"><header className="tags_guest_admin_hero"><div className="tags_guest_admin_identity"><span className="tags_guest_admin_icon">{tab === "store_orders" ? <FaShop /> : <FaUtensils />}</span><div><small>SERVICIOS AL HUÉSPED</small><h1>{data.app.name}</h1><p>{tab === "store_orders" ? "Pedidos de tienda" : "Pedidos de gastronomía"}</p></div></div><div className="tags_guest_admin_hero_actions"><button type="button" onClick={() => setTab(tab === "store_orders" ? "commerce" : "commerce_resto")}><FaArrowLeft /> Volver a configuración</button></div></header>{adminNavigation}<GuestExperienceCommerceOrders businessId={businessId} guestAppId={data.app.id} moduleType={tab === "store_orders" ? "store" : "resto"} /></main>;
  if (loading) return <TagsSpinner size={120} logoSize={66} borderSize={5} background="rgba(255,255,255,.82)" />;
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
<GuestExperienceCheckinPanel businessId={businessId} data={data} busy={busy} onSaved={saveCheckin} />{busy && <TagsSpinner size={120} logoSize={66} borderSize={5} background="rgba(255,255,255,.72)" />}</main>;
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
<span>{item.unit_name} · hasta el {new Date(item.ends_at).toLocaleDateString("es-AR")}</span>
<small>{item.guest_phone} · {item.guest_email}</small>
</div>
</article>)}{!data.stays.some(item => item.status === "active") && <p>No hay estadías en curso.</p>}</div>
</section>
</main>;
  if (!missing && tab === "arrivals") return <main className="tags_guest_admin"><header className="tags_guest_admin_hero"><div className="tags_guest_admin_identity"><span className="tags_guest_admin_icon"><FaHotel /></span><div><small>RECEPCIÓN</small><h1>{data.app.name}</h1><p>Ingresos previstos</p></div></div></header>{adminNavigation}<GuestExperienceArrivalsPanel data={data} onBack={() => setTab("reservations")} onReminder={item=>invite(item,"reminder")} onCheckin={stayId => { sessionStorage.setItem("tags_guest_checkin_stay", String(stayId)); setTab("checkin"); }} /></main>;
  if (!missing && tab === "finance") return <main className="tags_guest_admin"><header className="tags_guest_admin_hero"><div className="tags_guest_admin_identity"><span className="tags_guest_admin_icon"><FaHotel /></span><div><small>ADMINISTRACIÓN</small><h1>{data.app.name}</h1><p>Estadías, ventas y pagos</p></div></div></header>{adminNavigation}<GuestExperienceFinanceReport businessId={businessId} data={data} onBack={() => setTab("reservations")} onManage={setExternalStayId} />{externalStayId&&<GuestExperienceReservationsPanel overlayOnly stayId={externalStayId} onClose={()=>setExternalStayId(null)} data={data} busy={busy} onCreate={createReservation} onUpdate={updateReservation} onDelete={deleteReservation} onInvite={invite}/>}</main>;
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
{adminNavigation}{tab === "reservations" && <GuestExperienceReservationsPanel data={data} busy={busy} onCreate={createReservation} onUpdate={updateReservation} onDelete={deleteReservation} onInvite={invite} />} {tab === "checkin" && <section className="tags_guest_admin_panel">
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

