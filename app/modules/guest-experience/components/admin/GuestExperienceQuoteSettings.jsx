"use client";
import { useState } from "react";
import { FaArrowDown, FaArrowUp, FaEye, FaPlus, FaTrash, FaXmark } from "react-icons/fa6";
import "./GuestExperienceQuoteSettings.css";

const newSection = () => ({ id: globalThis.crypto?.randomUUID?.() || `section-${Date.now()}`, title: "", content: "", enabled: true });
const sampleDate = days => { const date = new Date(); date.setDate(date.getDate() + days); return date.toLocaleDateString("es-AR"); };
const sampleMoney = (currency, value) => `${currency === "USD" ? "U$S" : "$"} ${Number(value).toLocaleString("es-AR", { maximumFractionDigits: 2 })}`;

export default function GuestExperienceQuoteSettings({ form, setForm, units = [], currentSettings = {} }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const sections = Array.isArray(form.bookingQuoteSections) ? form.bookingQuoteSections : [];
  const visibleSections = sections.filter(section => section?.enabled !== false && (section?.title || section?.content));
  const sampleTotal = form.currency === "USD" ? 500 : 500000;
  const sampleDeposit = sampleTotal * (Number(form.depositPercentage || 0) / 100);
  const sampleUnit = units.find(unit => unit.status !== "inactive") || units[0] || null;
  const sampleCapacity = sampleUnit ? Math.max(1, Number(sampleUnit.capacity_adults || 0) + Number(sampleUnit.capacity_children || 0)) : 2;
  const sampleCategory = sampleUnit?.features?.publicCategory || "Tipo de alojamiento";
  const sampleUnitName = sampleUnit?.name || "Unidad de ejemplo";
  const sampleUnitLabel = form.bookingUnitDisplay === "unit" ? sampleUnitName : form.bookingUnitDisplay === "category_unit" ? `${sampleCategory} · ${sampleUnitName}` : sampleCategory;
  const update = (index, patch) => setForm({ ...form, bookingQuoteSections: sections.map((item, position) => position === index ? { ...item, ...patch } : item) });
  const move = (index, direction) => { const next = [...sections], target = index + direction; if (target < 0 || target >= next.length) return; [next[index], next[target]] = [next[target], next[index]]; setForm({ ...form, bookingQuoteSections: next }); };
  const remove = index => setForm({ ...form, bookingQuoteSections: sections.filter((_, position) => position !== index) });
  return <section data-settings-tab="budget" className="tags_guest_settings_group tags_guest_settings_quote">
    <h3>Contenido del presupuesto y correo</h3>
    <p>Fechas, huéspedes, unidades, total, seña y saldo se generan automáticamente. Agregá solamente las secciones comerciales que necesite este alojamiento.</p>
    <div>
      <label>Prefijo del presupuesto<input value={form.quoteCodePrefix ?? currentSettings.quoteCodePrefix ?? "PRES"} onChange={event => setForm({ ...form, quoteCodePrefix: event.target.value.toUpperCase() })} placeholder="ECOS" maxLength={20}/><small>Ejemplo: ECOS-2026-0001.</small></label>
      <label>Vigencia predeterminada<input type="number" min="1" max="365" value={form.quoteValidityDays ?? currentSettings.quoteValidityDays ?? 7} onChange={event => setForm({ ...form, quoteValidityDays: event.target.value })}/><small>Días durante los cuales la propuesta permanece vigente.</small></label>
      <label className="wide"><span><input type="checkbox" checked={(form.showOccupancyQuoteButton ?? currentSettings.showOccupancyQuoteButton) === true} onChange={event => setForm({ ...form, showOccupancyQuoteButton: event.target.checked })}/> Mostrar “+ Presupuesto” junto a “+ Nueva reserva” en la grilla</span></label>
      <label>Cómo identificar la unidad<select value={form.bookingUnitDisplay} onChange={event => setForm({ ...form, bookingUnitDisplay: event.target.value })}><option value="category">Sólo categoría pública</option><option value="category_unit">Categoría pública y unidad asignada</option><option value="unit">Sólo unidad asignada</option></select><small>Por defecto no se informa el número interno.</small></label>
      <label className="wide">Condiciones adicionales<textarea value={form.bookingBudgetDetails} onChange={event => setForm({ ...form, bookingBudgetDetails: event.target.value })} placeholder="Qué incluye la tarifa, condiciones y aclaraciones" /></label>
      {sections.map((section, index) => <article key={section.id || index}>
        <header><label><span><input type="checkbox" checked={section.enabled !== false} onChange={event => update(index, { enabled: event.target.checked })} /> Incluir esta sección</span></label><nav><button type="button" disabled={!index} onClick={() => move(index, -1)} aria-label="Subir sección"><FaArrowUp /></button><button type="button" disabled={index === sections.length - 1} onClick={() => move(index, 1)} aria-label="Bajar sección"><FaArrowDown /></button><button type="button" onClick={() => remove(index)} aria-label="Eliminar sección"><FaTrash /></button></nav></header>
        <input value={section.title || ""} onChange={event => update(index, { title: event.target.value })} placeholder="Título, por ejemplo: Servicios incluidos" maxLength={190}/>
        <textarea value={section.content || ""} onChange={event => update(index, { content: event.target.value })} placeholder="Contenido de esta sección" />
      </article>)}
      <div className="tags_guest_quote_actions"><button type="button" className="tags_guest_quote_add" onClick={() => setForm({ ...form, bookingQuoteSections: [...sections, newSection()] })}><FaPlus /> Agregar sección</button><button type="button" className="tags_guest_quote_preview_button" onClick={() => setPreviewOpen(true)}><FaEye /> Ver presupuesto completo</button></div>
    </div>
    {previewOpen && <div className="tags_guest_quote_preview_backdrop" onMouseDown={() => setPreviewOpen(false)}>
      <section className="tags_guest_quote_preview" onMouseDown={event => event.stopPropagation()}>
        <header><div className="tags_guest_quote_preview_brand">{form.logoUrl && <img src={form.logoUrl} alt={form.name || "Logo del alojamiento"} />}<h2>{form.name || "Nombre del alojamiento"}</h2><strong>Presupuesto</strong><small>VISTA PREVIA · DATOS DE EJEMPLO</small></div><button type="button" onClick={() => setPreviewOpen(false)} aria-label="Cerrar vista previa"><FaXmark /></button></header>
        <div className="tags_guest_quote_preview_body">
          <p>Hola <strong>Huésped de ejemplo</strong>,</p>
          <p>Por el presente te enviamos el presupuesto solicitado.</p>
          <section className="tags_guest_quote_preview_summary"><strong>{sampleUnitLabel}</strong><span>Ingreso: {sampleDate(15)} · {form.checkinTime || "15:00"} hs</span><span>Egreso: {sampleDate(18)} · {form.checkoutTime || "10:00"} hs</span><span>Noches: 3</span><span>Pasajeros: {sampleCapacity}</span></section>
          <section className="tags_guest_quote_preview_amounts"><span><strong>Total estadía:</strong> {sampleMoney(form.currency, sampleTotal)}</span><span><strong>Reserva {Number(form.depositPercentage || 0)}%:</strong> {sampleMoney(form.currency, sampleDeposit)}</span><span><strong>Saldo:</strong> {sampleMoney(form.currency, sampleTotal - sampleDeposit)}</span><span><strong>Vigencia del presupuesto:</strong> {Number(form.quoteValidityDays || currentSettings.quoteValidityDays || 7)} días</span></section>
          {form.bookingBudgetDetails && <p className="preserve_lines">{form.bookingBudgetDetails}</p>}
          <p><strong>Importante:</strong> la reserva quedará confirmada cuando el alojamiento registre el pago correspondiente.</p>
          {visibleSections.map((section, index) => <section className="tags_guest_quote_preview_section" key={section.id || index}>{section.title && <h2>{section.title}</h2>}<p className="preserve_lines">{section.content}</p></section>)}
        </div>
        <footer><small>Esta vista utiliza datos de ejemplo. En el envío real se completan automáticamente huésped, unidad, fechas, importes y vencimiento.</small><button type="button" onClick={() => setPreviewOpen(false)}>Cerrar</button></footer>
      </section>
    </div>}
  </section>;
}
