"use client";

import { useEffect, useState } from "react";
import {
  FaArrowRight,
  FaBed,
  FaCalendarDays,
  FaChevronLeft,
  FaChevronRight,
  FaCircleCheck,
  FaImages,
  FaTriangleExclamation,
  FaWhatsapp,
  FaXmark,
} from "react-icons/fa6";
import TagsSpinner from "@/app/components/TagsSpinner";
import { parseLodgingBookingSearchParams } from "../../lib/parseLodgingBookingSearchParams.mjs";
import "./LodgingBookingPage.css";
import "./LodgingBookingRequest.css";
import "./LodgingBookingVisualTheme.css";
import "./LodgingUnitDetails.css";

const ASSIGNMENT_NOTICE = "La unidad indicada es orientativa. La asignación definitiva se realizará al organizar la grilla de ocupación. Siempre se respetarán la capacidad, las características y el equipamiento correspondientes a la categoría reservada.";

const tomorrow = (plus = 1) => {
  const date = new Date();
  date.setDate(date.getDate() + plus);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const DECISION = {
  available: "Disponible",
  available_with_warning: "Disponible",
  review_required: "Requiere confirmación",
  alternative_suggested: "Fechas alternativas",
  unavailable: "No disponible",
};
const requestKey = () =>
  globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const money = (value, currency = "ARS") =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

function PublicPrice({ item, deposit }) {
  const pricing = item.pricing;
  return <div className="tags_lodging_booking_price">
    {pricing.discountTotal > 0 && <small className="tags_lodging_original_price">Antes {money(pricing.subtotal, pricing.currency)}</small>}
    <strong>Total estadía {money(pricing.total, pricing.currency)}</strong>
    {pricing.promotion && <small className="tags_lodging_promotion">{pricing.promotion.name} · ahorrás {money(pricing.discountTotal, pricing.currency)}</small>}
    <small>Precio por noche {money(pricing.averageNightlyRate, pricing.currency)}</small>
    {Number(item.ratePlan?.depositPercentage || 0) > 0 && <small>Reserva {item.ratePlan.depositPercentage}% {money(deposit(item), pricing.currency)}</small>}
  </div>;
}

export default function LodgingBookingPage({ app }) {
  const totalCapacityMode = app.settings?.lodgingPolicy?.capacityMode !== "adult_child_limits";
  const [form, setForm] = useState({
    startsOn: tomorrow(1),
    endsOn: tomorrow(3),
    adults: 2,
    children: 0,
    couponCode: "",
    unitOccupancies: [],
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(null);
  const [contact, setContact] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerNotes: "",
    idempotencyKey: "",
  });
  const [created, setCreated] = useState(null);
  const [unitDetails, setUnitDetails] = useState(null);
  const [detailImage, setDetailImage] = useState(0);

  useEffect(() => {
    const initial = parseLodgingBookingSearchParams(window.location.search);
    if (!initial) return;
    setForm(initial);
    search(null, initial);
  }, []);

  async function search(event, values = form) {
    event?.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    setCreated(null);
    try {
      const query = new URLSearchParams({
        slug: app.slug,
        ...values,
        adults: String(values.adults),
        children: String(values.children),
        ...(values.unitOccupancies?.length > 1 ? { requestedUnitOccupancies: values.unitOccupancies.join(",") } : {}),
      });
      const response = await fetch(`/api/guest-experience/public/lodging-availability?${query}`, {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error || "No se pudo consultar la disponibilidad.");
        return;
      }
      setResult(payload);
    } finally {
      setBusy(false);
    }
  }

  function choose(item) {
    setSelected(item);
    setCreated(null);
    setContact((current) => ({ ...current, idempotencyKey: requestKey() }));
  }

  function chooseGroup(proposal) {
    choose({
      isGroup: true,
      name: `Propuesta para ${proposal.requestedGuests} personas`,
      groupProposal: proposal,
      groupProposalKey: proposal.key,
      pricing: { configured: true, total: proposal.total, currency: proposal.currency },
    });
  }

  function showUnit(item) {
    setUnitDetails(item);
    setDetailImage(0);
  }

  const depositAmount = item => Number(item?.pricing?.total || 0) * Number(item?.ratePlan?.depositPercentage || 0) / 100;

  async function submitRequest(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/guest-experience/public/booking-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: app.slug, unitId: selected.unitId, groupRequest: selected.isGroup === true, groupProposalKey: selected.groupProposalKey || "", ...form, ...contact }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error || "No se pudo registrar la solicitud.");
        return;
      }
      setCreated(payload.request);
    } finally {
      setBusy(false);
    }
  }

  const phone = String(app.settings?.receptionPhone || "").replace(/\D/g, "");
  const contactText = encodeURIComponent(
    totalCapacityMode
      ? `Hola, consulté disponibilidad en ${app.name} para ingresar el ${form.startsOn} y salir el ${form.endsOn}. Somos ${Number(form.adults || 0) + Number(form.children || 0)} huéspedes.`
      : `Hola, consulté disponibilidad en ${app.name} para ingresar el ${form.startsOn} y salir el ${form.endsOn}. Somos ${form.adults} adulto(s) y ${form.children} menor(es).`,
  );
  const actionable =
    result?.units?.filter(
      (item) => !["unavailable", "alternative_suggested"].includes(item.decision),
    ) || [];

  return (
    <main className="tags_lodging_booking" style={app.themeStyle || undefined}>
      <header
        style={
          app.cover_url
            ? { backgroundImage: `linear-gradient(#10251aaa,#10251aaa),url(${app.cover_url})` }
            : undefined
        }
      >
        <div className="tags_lodging_booking_hero_identity">
          {app.logo_url && <img src={app.logo_url} alt={`Logo de ${app.name}`} />}
          <span>RESERVAS DIRECTAS</span>
          <h1>{app.name}</h1>
          <p>{app.welcome_message || "Consultá las unidades disponibles para tu próxima estadía."}</p>
        </div>
        {app.bookingImages?.length > 0 && <div className={`tags_lodging_booking_hero_gallery has_${Math.min(app.bookingImages.length, 4)}`}>
          {app.bookingImages.map((image, index) => <img key={`${image.url}-${index}`} src={image.url} alt={image.alt || `${app.name} · imagen ${index + 1}`} />)}
        </div>}
      </header>

      <section className="tags_lodging_booking_search">
        <div><span>PLANIFICÁ TU ESTADÍA</span><h2>Consultar disponibilidad</h2><p>La respuesta considera ocupación, bloqueos, precios y políticas reales del alojamiento.</p></div>
        <form onSubmit={search}>
          <label>Ingreso<input required type="date" min={tomorrow(0)} value={form.startsOn} onChange={(event) => setForm({ ...form, startsOn: event.target.value })} /></label>
          <label>Egreso<input required type="date" min={form.startsOn || tomorrow(1)} value={form.endsOn} onChange={(event) => setForm({ ...form, endsOn: event.target.value })} /></label>
          {totalCapacityMode
            ? <label>Huéspedes<input required type="number" min="1" max="30" value={Number(form.adults || 0) + Number(form.children || 0)} onChange={(event) => setForm({ ...form, adults: event.target.value, children: 0, unitOccupancies: [] })} /></label>
            : <><label>Adultos<input required type="number" min="1" max="30" value={form.adults} onChange={(event) => setForm({ ...form, adults: event.target.value, unitOccupancies: [] })} /></label><label>Menores<input required type="number" min="0" max="30" value={form.children} onChange={(event) => setForm({ ...form, children: event.target.value, unitOccupancies: [] })} /></label></>}
          <label>Cupón (opcional)<input type="text" maxLength="80" value={form.couponCode} onChange={(event) => setForm({ ...form, couponCode: event.target.value.toUpperCase() })} /></label>
          <button disabled={busy}><FaCalendarDays /> Consultar <FaArrowRight /></button>
        </form>
      </section>

      {error && <section className="tags_lodging_booking_notice is_error"><FaTriangleExclamation /><div><strong>No pudimos completar la operación</strong><p>{error}</p></div></section>}

      {result && <section className="tags_lodging_booking_results">
        <header><div><span>RESULTADO</span><h2>{result.query.nights} noche{result.query.nights === 1 ? "" : "s"} · {result.query.adults + result.query.children} huésped{result.query.adults + result.query.children === 1 ? "" : "es"}</h2></div><strong>{result.groupProposals?.length || actionable.length} opción{(result.groupProposals?.length || actionable.length) === 1 ? "" : "es"}</strong></header>
        {result.coupon?.requested && !result.coupon.applied && <p className="tags_lodging_coupon_invalid">El cupón ingresado no es válido para estas fechas, unidades o condiciones.</p>}
        {result.groupProposals?.map((proposal,index) => <article key={proposal.key} className="tags_lodging_group_proposal"><i><FaBed /></i><div><span>COMBINACIÓN DISPONIBLE</span><h3>{result.groupProposals.length > 1 ? `Opción ${index + 1}` : "Propuesta para alojar al grupo"}</h3><p>Estas cabañas están disponibles para las fechas consultadas:</p><ul>{proposal.units.map(unit => <li key={unit.unitId}>{unit.images?.[0]?.url && <img src={unit.images[0].url} alt={unit.name}/>}<div><strong>{unit.name}</strong><small>Capacidad: {unit.capacity} personas · distribución sugerida: {unit.suggestedGuests}</small></div></li>)}</ul><div className="tags_lodging_booking_price"><strong>Total estadía {money(proposal.total, proposal.currency)}</strong><small>Precio por noche {money(proposal.total / result.query.nights, proposal.currency)}</small>{proposal.depositRequiredAmount > 0 && <small>Reserva {proposal.depositPercentage}% {money(proposal.depositRequiredAmount, proposal.currency)}</small>}</div><p className="tags_lodging_group_flexible"><strong>La combinación es orientativa.</strong> El alojamiento puede proponer otra distribución o combinación que resulte más adecuada, respetando la capacidad y las características necesarias.</p></div><button type="button" onClick={() => chooseGroup(proposal)}>Confirmar reserva</button></article>)}
        {!result.groupProposals?.length && <div>{result.units.map((item) => <article key={item.unitId} className={`is_${item.decision}`}>{item.images?.[0]?.url?<button type="button" className="tags_lodging_unit_thumbnail" onClick={()=>showUnit(item)} aria-label={`Ver imágenes de ${item.name}`}><img src={item.images[0].url} alt={item.images[0].alt||item.name}/></button>:<i>{item.decision === "available" ? <FaCircleCheck /> : item.decision === "unavailable" ? <FaBed /> : <FaTriangleExclamation />}</i>}<div><span>{DECISION[item.decision] || item.decision}</span><h3>{item.name}</h3><small className="tags_lodging_unit_capacity">Hasta {item.capacity?.total||Number(item.capacity?.adults||0)+Number(item.capacity?.children||0)} personas</small>{item.description&&<p className="tags_lodging_unit_summary">{item.description}</p>}{item.reason && <p>{item.reason}</p>}{item.pricing?.configured && <PublicPrice item={item} deposit={depositAmount}/>} {!item.pricing?.configured && item.decision !== "unavailable" && <p className="tags_lodging_booking_consult_price">Precio sujeto a confirmación del alojamiento.</p>}{item.suggestion && <p><strong>Alternativa:</strong> {item.suggestion.startsOn} al {item.suggestion.endsOn} · {item.suggestion.nights} noches</p>}{item.images?.length > 0 && <button className="tags_lodging_unit_images_button" type="button" onClick={() => showUnit(item)}><FaImages /> Ver imágenes y detalles</button>}</div>{!["unavailable", "alternative_suggested"].includes(item.decision) && <button type="button" onClick={() => choose(item)}>Confirmar reserva</button>}</article>)}</div>}
        <p className="tags_lodging_assignment_notice"><strong>Importante sobre la unidad:</strong> {ASSIGNMENT_NOTICE}</p>
        {!actionable.length && !result.groupProposals?.length && <p className="tags_lodging_booking_empty">No encontramos unidades disponibles con esos datos. Probá otras fechas o cantidad de huéspedes.</p>}
      </section>}

      <footer><strong>{app.name}</strong><span>Reserva directa con el alojamiento</span></footer>

      {selected && <div className="tags_lodging_request_backdrop" onMouseDown={() => !busy && setSelected(null)}><section className="tags_lodging_request_modal" onMouseDown={(event) => event.stopPropagation()}><button type="button" className="tags_lodging_request_close" onClick={() => setSelected(null)}><FaXmark /></button>{created ? <div className="tags_lodging_request_success"><FaCircleCheck /><span>SOLICITUD RECIBIDA</span><h2>{created.code}</h2><p>El alojamiento revisará la disponibilidad y te enviará las instrucciones de pago si acepta la solicitud.</p>{created.quote && <div className="tags_lodging_request_quote"><strong>Total estadía {money(created.quote.lodgingTotal, created.quote.currency)}</strong>{created.quote.depositRequiredAmount > 0 && <span>Reserva {created.quote.depositPercentage}% {money(created.quote.depositRequiredAmount, created.quote.currency)}</span>}</div>}<p className="tags_lodging_assignment_notice">{ASSIGNMENT_NOTICE}</p>{phone && <a href={`https://wa.me/${phone}?text=${contactText}`} target="_blank" rel="noreferrer"><FaWhatsapp /> Continuar por WhatsApp</a>}</div> : <><span>CONFIRMAR RESERVA</span><h2>{selected.name}</h2><p>{form.startsOn} al {form.endsOn} · {result.query.nights} noches</p>{selected.pricing?.configured && <div className="tags_lodging_request_quote"><strong>Total estadía {money(selected.pricing.total, selected.pricing.currency)}</strong><span>Precio por noche {money(selected.pricing.total / result.query.nights, selected.pricing.currency)}</span>{Number(selected.groupProposal?.depositPercentage || selected.ratePlan?.depositPercentage || 0) > 0 && <small>Reserva {selected.groupProposal?.depositPercentage || selected.ratePlan?.depositPercentage}% {money(selected.groupProposal?.depositRequiredAmount || depositAmount(selected), selected.pricing.currency)}</small>}</div>}<p className="tags_lodging_request_review_notice">La solicitud será recibida y verificada por el alojamiento. Si es aceptada, recibirás por email o WhatsApp los datos de pago y el plazo disponible. La reserva quedará confirmada una vez registrado el pago correspondiente.</p><p className="tags_lodging_assignment_notice">{ASSIGNMENT_NOTICE}</p><form onSubmit={submitRequest}><label>Nombre y apellido<input required value={contact.customerName} onChange={(event) => setContact({ ...contact, customerName: event.target.value })} /></label><label>Email<input type="email" value={contact.customerEmail} onChange={(event) => setContact({ ...contact, customerEmail: event.target.value })} /></label><label>WhatsApp o teléfono<input type="tel" value={contact.customerPhone} onChange={(event) => setContact({ ...contact, customerPhone: event.target.value })} /></label><label>Comentarios<textarea maxLength="2000" value={contact.customerNotes} onChange={(event) => setContact({ ...contact, customerNotes: event.target.value })} /></label><small>Necesitamos al menos un email o teléfono para responderte.</small><button disabled={busy}>Confirmar reserva</button></form></>}</section></div>}
      {unitDetails && <div className="tags_lodging_unit_backdrop" onMouseDown={() => setUnitDetails(null)}><section className="tags_lodging_unit_modal" onMouseDown={event => event.stopPropagation()}><button className="tags_lodging_unit_close" type="button" onClick={() => setUnitDetails(null)}><FaXmark /></button><div className="tags_lodging_unit_media"><img src={unitDetails.images[detailImage]?.url} alt={unitDetails.images[detailImage]?.alt || unitDetails.name}/>{unitDetails.images.length > 1 && <><button type="button" className="is_previous" onClick={() => setDetailImage((detailImage - 1 + unitDetails.images.length) % unitDetails.images.length)}><FaChevronLeft /></button><button type="button" className="is_next" onClick={() => setDetailImage((detailImage + 1) % unitDetails.images.length)}><FaChevronRight /></button><span>{detailImage + 1} / {unitDetails.images.length}</span></>}</div><div className="tags_lodging_unit_information"><small>UNIDAD DE ALOJAMIENTO</small><h2>{unitDetails.name}</h2>{unitDetails.description && <p>{unitDetails.description}</p>}{unitDetails.equipment?.length > 0 && <><h3>Equipamiento y servicios</h3><ul>{unitDetails.equipment.map((entry, index) => <li key={`${entry}-${index}`}><FaCircleCheck /> {entry}</li>)}</ul></>}{unitDetails.details && <><h3>Otros detalles</h3><p>{unitDetails.details}</p></>}<p className="tags_lodging_assignment_notice">{ASSIGNMENT_NOTICE}</p></div></section></div>}
      {busy && <TagsSpinner size={110} logoSize={58} borderSize={5} background="rgba(255,255,255,.74)" />}
    </main>
  );
}
