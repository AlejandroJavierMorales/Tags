import { useEffect, useMemo, useState } from "react";
import TagsSelect from "@/app/components/ui/TagsSelect";

const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const slugify = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const ids = value => String(value || "").split(",").map(item => item.trim()).filter(Boolean);

function hierarchyLabel(item, items) {
  const byId = new Map(items.map(entry => [String(entry.id), entry]));
  const parts = [item.name];
  let parent = byId.get(String(item.parent_id));
  while (parent) { parts.unshift(parent.name); parent = byId.get(String(parent.parent_id)); }
  return parts.join(" / ");
}

function expiryDate(months, startMonth) {
  const now = new Date();
  const duration = Math.max(1, Number(months || 1));
  const start = Math.min(12, Math.max(1, Number(startMonth || now.getMonth() + 1)));
  const year = start < now.getMonth() + 1 ? now.getFullYear() + 1 : now.getFullYear();
  const target = new Date(year, start - 1 + duration - 1, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  const day = Math.min(now.getDate(), lastDay);
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function SubscriptionModalCalendar({ form, setForm, businesses, subscriptions = [], plans, addons = [], sites, places = [], taxonomy = [], isDirectory, priceOptions, amount, onPlan, onClose, onSubmit, onEditExisting }) {
  const [taxonomySearch, setTaxonomySearch] = useState("");
  const currentSubscriptions = subscriptions.filter(subscription => ["active", "trial", "past_due", "paused"].includes(String(subscription.effective_status)));
  const existing = currentSubscriptions.find(subscription => Number(subscription.business_id) === Number(form.businessId));
  const selectedBusiness = businesses.find(business => Number(business.id) === Number(form.businessId));
  const existingSiteIds = ids(selectedBusiness?.directory_site_ids);
  const assignmentRequired = isDirectory && Boolean(form.siteId) && !existingSiteIds.includes(String(form.siteId));
  const taxonomyLeaves = useMemo(() => taxonomy.filter(item => Number(item.is_leaf) === 1 && (!item.site_id || Number(item.site_id) === Number(form.siteId))).map(item => ({ ...item, label: hierarchyLabel(item, taxonomy) })).filter(item => !taxonomySearch || item.label.toLowerCase().includes(taxonomySearch.toLowerCase())), [taxonomy, form.siteId, taxonomySearch]);
  const localityOptions = places.filter(place => place.place_type === "locality" && Number(place.is_active ?? 1) === 1).map(place => ({ value: place.id, label: hierarchyLabel(place, places) }));
  const clientOptions = businesses.map(business => {
    const subscription = currentSubscriptions.find(item => Number(item.business_id) === Number(business.id));
    return { value: business.id, label: `${business.name || business.display_name} · ${business.email}${subscription ? ` · Ya tiene ${subscription.plan_name}` : ""}` };
  });
  const planOptions = plans.filter(plan => Number(plan.is_active) === 1).map(plan => ({ value: plan.id, label: `${plan.name}${plan.code ? ` · ${plan.code}` : ""}` }));
  const set = (field, value) => setForm(state => ({ ...state, [field]: value }));
  const setDirectory = (field, value) => setForm(state => ({ ...state, directorySetup: { ...(state.directorySetup || {}), [field]: value } }));
  useEffect(() => {
    if (!selectedBusiness || String(form.directorySetup?.businessId || "") === String(selectedBusiness.id)) return;
    setForm(state => ({ ...state, directorySetup: { businessId: String(selectedBusiness.id), listingId: String(selectedBusiness.directory_listing_id || ""), slug: slugify(selectedBusiness.name || selectedBusiness.display_name), placeId: String(selectedBusiness.directory_place_id || ""), taxonomyIds: ids(selectedBusiness.directory_taxonomy_ids), existingSiteIds: ids(selectedBusiness.directory_site_ids) } }));
  }, [selectedBusiness, form.directorySetup?.businessId, setForm]);
  const selectBusiness = value => {
    const business = businesses.find(item => Number(item.id) === Number(value));
    setForm(state => ({ ...state, businessId: value, directorySetup: { businessId: String(business?.id || ""), listingId: String(business?.directory_listing_id || ""), slug: slugify(business?.name || business?.display_name), placeId: String(business?.directory_place_id || ""), taxonomyIds: ids(business?.directory_taxonomy_ids), existingSiteIds: ids(business?.directory_site_ids) } }));
  };
  const toggleTaxonomy = value => {
    const current = form.directorySetup?.taxonomyIds || [];
    setDirectory("taxonomyIds", current.includes(String(value)) ? current.filter(item => item !== String(value)) : [...current, String(value)]);
  };

  return <div className="tags_subscription_modal_backdrop" onMouseDown={onClose}><section className="tags_subscription_modal" onMouseDown={event => event.stopPropagation()}><header><h2>Nueva suscripción</h2><button type="button" onClick={onClose}>×</button></header><form onSubmit={event => { event.preventDefault(); onSubmit(); }}><div className="tags_subscription_form_grid">
    <label>Cliente<TagsSelect searchable searchPlaceholder="Buscar cliente..." value={form.businessId} options={clientOptions} onChange={selectBusiness} />{existing && <small>Este cliente ya tiene {existing.plan_name}. Modificá esa suscripción en lugar de crear otra.</small>}</label>
    <label>Plan<TagsSelect searchable searchPlaceholder="Buscar plan..." value={form.planId} options={planOptions} onChange={onPlan} disabled={Boolean(existing)} /></label>
    <label>Mes de inicio<select value={form.startMonth} onChange={event => setForm(state => ({ ...state, startMonth: Number(event.target.value), priceSelection: "", customAmount: "", expiresAt: "" }))}>{MONTHS.map((month, index) => <option key={index + 1} value={index + 1}>{month}</option>)}</select></label>
    {isDirectory && <label>Directorio<select required value={form.siteId} onChange={event => set("siteId", event.target.value)}><option value="">Seleccionar Directorio</option>{sites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}</select></label>}
    {isDirectory && form.siteId && !assignmentRequired && <div className="is_wide tags_subscription_directory_notice">El cliente ya tiene una ficha en este Directorio. Se reutilizará y se activarán las funcionalidades del plan.</div>}
    {assignmentRequired && <fieldset className="is_wide tags_subscription_directory_setup"><legend>Preparar ficha del Directorio</legend><p>Estos datos se guardarán antes de activar el plan para que el cliente no quede configurado a medias.</p><div className="tags_subscription_form_grid"><label>Ruta pública<input value={form.directorySetup?.slug || ""} onChange={event => setDirectory("slug", slugify(event.target.value))} placeholder="nombre-del-negocio" /></label><label>Localidad<TagsSelect searchable searchPlaceholder="Buscar localidad..." value={form.directorySetup?.placeId || ""} options={localityOptions} onChange={value => setDirectory("placeId", value)} /></label></div><label>Rubros finales<input value={taxonomySearch} onChange={event => setTaxonomySearch(event.target.value)} placeholder="Buscar rubro..." /></label><div className="tags_subscription_taxonomy_grid">{taxonomyLeaves.slice(0, 80).map(item => <label className={(form.directorySetup?.taxonomyIds || []).includes(String(item.id)) ? "is_selected" : ""} key={item.id}><input type="checkbox" checked={(form.directorySetup?.taxonomyIds || []).includes(String(item.id))} onChange={() => toggleTaxonomy(item.id)} /><span>{item.label}</span></label>)}</div>{!taxonomyLeaves.length && <small>No hay rubros finales que coincidan con la búsqueda.</small>}</fieldset>}
    <label className="is_wide">Modalidad y período<TagsSelect searchable searchPlaceholder="Buscar modalidad..." value={form.priceSelection} options={priceOptions.map(option => ({ value: option.value, label: option.label }))} onChange={value => { const option = priceOptions.find(item => item.value === value); setForm(state => ({ ...state, priceSelection: value, durationMonths: option?.duration || 1, paymentMethod: option?.method || "manual", customAmount: option ? String(option.amount) : "", expiresAt: option ? expiryDate(option.duration, form.startMonth) : "", paymentState: option?.method === "mercadopago" ? "pending" : state.paymentState })); }} />{form.planId && !priceOptions.length && <small>Este plan no tiene modalidades con precio configurado para el Directorio seleccionado.</small>}</label>
    <div className="is_wide tags_subscription_amount_expiry"><label>Importe final<input required type="number" min="0.01" step="0.01" value={form.customAmount || ""} placeholder={priceOptions[0]?.amount || amount || ""} onChange={event => set("customAmount", event.target.value)} /><small>Podés modificarlo para una oferta excepcional.</small></label><label>Vencimiento<input required type="date" value={form.expiresAt || ""} onChange={event => set("expiresAt", event.target.value)} /><small>Podés modificarlo si acordás otra vigencia.</small></label></div>
    <label>Estado inicial<select value={form.paymentState} onChange={event => set("paymentState", event.target.value)}><option value="paid">Pago recibido · activar ahora</option><option value="pending">Pendiente de pago</option></select></label>
    {form.planId && <fieldset className="is_wide"><legend>Funcionalidades contratadas</legend><div className="tags_subscription_addons">{addons.map(addon => { const quantity = Number(form.addons?.[addon.code] || 0); return <label className={quantity > 0 ? "is_selected" : ""} key={addon.code}><span><input type="checkbox" checked={quantity > 0} onChange={event => set("addons", { ...(form.addons || {}), [addon.code]: event.target.checked ? Math.max(1, Number(addon.default_quantity || 1)) : 0 })} />{addon.name}</span>{quantity > 0 && <input aria-label={`Cantidad de ${addon.name}`} type="number" min="1" max="999" value={quantity} onChange={event => set("addons", { ...(form.addons || {}), [addon.code]: Math.max(1, Number(event.target.value || 1)) })} />}</label>})}</div><small>El plan propone una base. Podés agregar, quitar o cambiar cantidades para este cliente.</small></fieldset>}
  </div><footer><button type="button" onClick={onClose}>Cancelar</button>{existing ? <button type="button" onClick={() => onEditExisting(existing)}>Editar suscripción existente</button> : <button type="submit">Continuar</button>}</footer></form></section></div>;
}
