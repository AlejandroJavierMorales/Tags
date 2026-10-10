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

function ancestorSelection(placeId, places) {
  const result = { countryId: "", provinceId: "", regionId: "", placeId: placeId ? String(placeId) : "" };
  const byId = new Map(places.map(item => [Number(item.id), item]));
  let current = byId.get(Number(placeId));
  while (current) {
    if (current.place_type === "country") result.countryId = String(current.id);
    if (["province", "state"].includes(current.place_type)) result.provinceId = String(current.id);
    if (current.place_type === "region") result.regionId = String(current.id);
    current = byId.get(Number(current.parent_id));
  }
  return result;
}

const placeTypes = { country: ["country"], province: ["province", "state"], region: ["region"], locality: ["locality", "city"] };
const byName = (a, b) => String(a.name).localeCompare(String(b.name), "es");

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
  const [taxonomyPath, setTaxonomyPath] = useState([]);
  const currentSubscriptions = subscriptions.filter(subscription => ["active", "trial", "past_due", "paused"].includes(String(subscription.effective_status)));
  const existing = currentSubscriptions.find(subscription => Number(subscription.business_id) === Number(form.businessId));
  const selectedBusiness = businesses.find(business => Number(business.id) === Number(form.businessId));
  const existingSiteIds = ids(selectedBusiness?.directory_site_ids);
  const assignmentRequired = isDirectory && Boolean(form.siteId) && !existingSiteIds.includes(String(form.siteId));
  const siteTaxonomy = useMemo(() => taxonomy.filter(item => !item.site_id || Number(item.site_id) === Number(form.siteId)), [taxonomy, form.siteId]);
  const taxonomyLeaves = useMemo(() => siteTaxonomy.filter(item => Number(item.is_leaf) === 1).map(item => ({ ...item, label: hierarchyLabel(item, siteTaxonomy) })).filter(item => taxonomySearch && item.label.toLowerCase().includes(taxonomySearch.toLowerCase())).slice(0, 40), [siteTaxonomy, taxonomySearch]);
  const location = { ...ancestorSelection(form.directorySetup?.placeId, places), ...(form.directorySetup || {}) };
  const countries = places.filter(item => placeTypes.country.includes(item.place_type)).sort(byName);
  const provinces = places.filter(item => placeTypes.province.includes(item.place_type) && Number(item.parent_id) === Number(location.countryId)).sort(byName);
  const regions = places.filter(item => placeTypes.region.includes(item.place_type) && Number(item.parent_id) === Number(location.provinceId)).sort(byName);
  const localityParent = location.regionId || location.provinceId;
  const localities = places.filter(item => placeTypes.locality.includes(item.place_type) && Number(item.parent_id) === Number(localityParent)).sort(byName);
  const clientOptions = businesses.map(business => {
    const subscription = currentSubscriptions.find(item => Number(item.business_id) === Number(business.id));
    return { value: business.id, label: `${business.name || business.display_name} · ${business.email}${subscription ? ` · Ya tiene ${subscription.plan_name}` : ""}` };
  });
  const planOptions = plans.filter(plan => Number(plan.is_active) === 1).map(plan => ({ value: plan.id, label: `${plan.name}${plan.code ? ` · ${plan.code}` : ""}` }));
  const set = (field, value) => setForm(state => ({ ...state, [field]: value }));
  const setDirectory = (field, value) => setForm(state => ({ ...state, directorySetup: { ...(state.directorySetup || {}), [field]: value } }));
  useEffect(() => {
    if (!selectedBusiness || String(form.directorySetup?.businessId || "") === String(selectedBusiness.id)) return;
    setForm(state => ({ ...state, directorySetup: { businessId: String(selectedBusiness.id), listingId: String(selectedBusiness.directory_listing_id || ""), slug: slugify(selectedBusiness.name || selectedBusiness.display_name), placeId: String(selectedBusiness.directory_place_id || selectedBusiness.primary_place_id || ""), taxonomyIds: ids(selectedBusiness.directory_taxonomy_ids), existingSiteIds: ids(selectedBusiness.directory_site_ids) } }));
  }, [selectedBusiness, form.directorySetup?.businessId, setForm]);
  const selectBusiness = value => {
    const business = businesses.find(item => Number(item.id) === Number(value));
    setForm(state => ({ ...state, businessId: value, directorySetup: { businessId: String(business?.id || ""), listingId: String(business?.directory_listing_id || ""), slug: slugify(business?.name || business?.display_name), placeId: String(business?.directory_place_id || business?.primary_place_id || ""), taxonomyIds: ids(business?.directory_taxonomy_ids), existingSiteIds: ids(business?.directory_site_ids) } }));
  };
  const toggleTaxonomy = value => {
    const current = form.directorySetup?.taxonomyIds || [];
    setDirectory("taxonomyIds", current.includes(String(value)) ? current.filter(item => item !== String(value)) : [...current, String(value)]);
  };
  const taxonomyChildren = parentId => siteTaxonomy.filter(item => parentId ? Number(item.parent_id) === Number(parentId) : !item.parent_id).sort(byName);
  const chooseTaxonomyLevel = (level, value) => {
    const next = taxonomyPath.slice(0, level);
    if (value) next[level] = String(value);
    setTaxonomyPath(next);
    const selected = siteTaxonomy.find(item => Number(item.id) === Number(value));
    if (selected && Number(selected.is_leaf) === 1 && !(form.directorySetup?.taxonomyIds || []).includes(String(selected.id))) toggleTaxonomy(selected.id);
  };
  const taxonomyLevels = [];
  let taxonomyParent = null, taxonomyLevel = 0;
  while (taxonomyLevel === 0 || taxonomyPath[taxonomyLevel - 1]) {
    const options = taxonomyChildren(taxonomyParent);
    if (!options.length) break;
    taxonomyLevels.push({ level: taxonomyLevel, options, value: taxonomyPath[taxonomyLevel] || "" });
    taxonomyParent = taxonomyPath[taxonomyLevel]; taxonomyLevel += 1;
  }
  const selectedTaxonomy = (form.directorySetup?.taxonomyIds || []).map(id => siteTaxonomy.find(item => String(item.id) === String(id))).filter(Boolean);

  return <div className="tags_subscription_modal_backdrop" onMouseDown={onClose}><section className="tags_subscription_modal" onMouseDown={event => event.stopPropagation()}><header><h2>Nueva suscripción</h2><button type="button" onClick={onClose}>×</button></header><form onSubmit={event => { event.preventDefault(); onSubmit(); }}><div className="tags_subscription_form_grid">
    <label>Cliente<TagsSelect searchable searchPlaceholder="Buscar cliente..." value={form.businessId} options={clientOptions} onChange={selectBusiness} />{existing && <small>Este cliente ya tiene {existing.plan_name}. Modificá esa suscripción en lugar de crear otra.</small>}</label>
    <label>Plan<TagsSelect searchable searchPlaceholder="Buscar plan..." value={form.planId} options={planOptions} onChange={onPlan} disabled={Boolean(existing)} /></label>
    <label>Mes de inicio<select value={form.startMonth} onChange={event => setForm(state => ({ ...state, startMonth: Number(event.target.value), priceSelection: "", customAmount: "", expiresAt: "" }))}>{MONTHS.map((month, index) => <option key={index + 1} value={index + 1}>{month}</option>)}</select></label>
    {isDirectory && <label>Directorio<select required value={form.siteId} onChange={event => { const siteId=event.target.value;setTaxonomyPath([]);setTaxonomySearch("");setForm(state=>({...state,siteId,directorySetup:{...state.directorySetup,taxonomyIds:[]}})); }}><option value="">Seleccionar Directorio</option>{sites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}</select></label>}
    {isDirectory && form.siteId && !assignmentRequired && <div className="is_wide tags_subscription_directory_notice">El cliente ya tiene una ficha en este Directorio. Se reutilizará y se activarán las funcionalidades del plan.</div>}
    {assignmentRequired && <fieldset className="is_wide tags_subscription_directory_setup"><legend>Preparar ficha del Directorio</legend><p>Completá la ubicación y los rubros paso a paso. La Web se publicará al activar la suscripción.</p><label>Ruta pública<input value={form.directorySetup?.slug || ""} onChange={event => setDirectory("slug", slugify(event.target.value))} placeholder="nombre-del-negocio" /></label><div className="tags_subscription_location_grid"><label>País<select value={location.countryId || ""} onChange={event => setForm(state => ({...state,directorySetup:{...state.directorySetup,countryId:event.target.value,provinceId:"",regionId:"",placeId:""}}))}><option value="">Seleccionar país</option>{countries.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Provincia<select disabled={!location.countryId} value={location.provinceId || ""} onChange={event => setForm(state => ({...state,directorySetup:{...state.directorySetup,provinceId:event.target.value,regionId:"",placeId:""}}))}><option value="">Seleccionar provincia</option>{provinces.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Región<select disabled={!location.provinceId} value={location.regionId || ""} onChange={event => setForm(state => ({...state,directorySetup:{...state.directorySetup,regionId:event.target.value,placeId:""}}))}><option value="">Seleccionar región</option>{regions.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Localidad<select disabled={!localityParent} value={location.placeId || ""} onChange={event => setDirectory("placeId",event.target.value)}><option value="">Seleccionar localidad</option>{localities.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label></div><div className="tags_subscription_taxonomy_picker"><h4>Rubros</h4><p>Elegí cada nivel hasta llegar al rubro final. Podés asignar más de uno.</p><div className="tags_subscription_taxonomy_levels">{taxonomyLevels.map(item=><label key={item.level}>{item.level===0?"Rubro principal":`Subrubro nivel ${item.level}`}<select value={item.value} onChange={event=>chooseTaxonomyLevel(item.level,event.target.value)}><option value="">Seleccionar</option>{item.options.map(option=><option value={option.id} key={option.id}>{option.name}</option>)}</select></label>)}</div><label>O buscar un rubro final<input value={taxonomySearch} onChange={event=>setTaxonomySearch(event.target.value)} placeholder="Ej.: club de tenis" /></label>{taxonomySearch&&<div className="tags_subscription_taxonomy_results">{taxonomyLeaves.map(item=><button type="button" key={item.id} onClick={()=>toggleTaxonomy(item.id)}>{item.label}</button>)}{!taxonomyLeaves.length&&<small>No hay coincidencias.</small>}</div>}<div className="tags_subscription_taxonomy_selected">{selectedTaxonomy.map(item=><button type="button" key={item.id} onClick={()=>toggleTaxonomy(item.id)}><span>{hierarchyLabel(item,siteTaxonomy)}</span><b>×</b></button>)}</div></div></fieldset>}
    <label className="is_wide">Modalidad y período<TagsSelect searchable searchPlaceholder="Buscar modalidad..." value={form.priceSelection} options={priceOptions.map(option => ({ value: option.value, label: option.label }))} onChange={value => { const option = priceOptions.find(item => item.value === value); setForm(state => ({ ...state, priceSelection: value, durationMonths: option?.duration || 1, paymentMethod: option?.method || "manual", customAmount: option ? String(option.amount) : "", expiresAt: option ? expiryDate(option.duration, form.startMonth) : "", paymentState: option?.method === "mercadopago" ? "pending" : state.paymentState })); }} />{form.planId && !priceOptions.length && <small>Este plan no tiene modalidades con precio configurado para el Directorio seleccionado.</small>}</label>
    <div className="is_wide tags_subscription_amount_expiry"><label>Importe final<input required type="number" min="0.01" step="0.01" value={form.customAmount || ""} placeholder={priceOptions[0]?.amount || amount || ""} onChange={event => set("customAmount", event.target.value)} /><small>Podés modificarlo para una oferta excepcional.</small></label><label>Vencimiento<input required type="date" value={form.expiresAt || ""} onChange={event => set("expiresAt", event.target.value)} /><small>Podés modificarlo si acordás otra vigencia.</small></label></div>
    <label>Estado inicial<select value={form.paymentState} onChange={event => set("paymentState", event.target.value)}><option value="paid">Pago recibido · activar ahora</option><option value="pending">Pendiente de pago</option></select></label>
    {form.planId && <fieldset className="is_wide"><legend>Funcionalidades contratadas</legend><div className="tags_subscription_addons">{addons.map(addon => { const quantity = Number(form.addons?.[addon.code] || 0); return <label className={quantity > 0 ? "is_selected" : ""} key={addon.code}><span><input type="checkbox" checked={quantity > 0} onChange={event => set("addons", { ...(form.addons || {}), [addon.code]: event.target.checked ? Math.max(1, Number(addon.default_quantity || 1)) : 0 })} />{addon.name}</span>{quantity > 0 && <input aria-label={`Cantidad de ${addon.name}`} type="number" min="1" max="999" value={quantity} onChange={event => set("addons", { ...(form.addons || {}), [addon.code]: Math.max(1, Number(event.target.value || 1)) })} />}</label>})}</div><small>El plan propone una base. Podés agregar, quitar o cambiar cantidades para este cliente.</small></fieldset>}
  </div><footer><button type="button" onClick={onClose}>Cancelar</button>{existing ? <button type="button" onClick={() => onEditExisting(existing)}>Editar suscripción existente</button> : <button type="submit">Continuar</button>}</footer></form></section></div>;
}
