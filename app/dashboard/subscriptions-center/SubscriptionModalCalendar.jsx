import TagsSelect from "@/app/components/ui/TagsSelect";

const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

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

export default function SubscriptionModalCalendar({ form, setForm, businesses, plans, sites, isDirectory, directoryPrice, priceOptions, amount, onPlan, onClose, onSubmit }) {
  const clientOptions = businesses.map(business => ({ value: business.id, label: `${business.name || business.display_name} · ${business.email}` }));
  const planOptions = plans.filter(plan => Number(plan.is_active) === 1).map(plan => ({ value: plan.id, label: `${plan.name}${plan.code ? ` · ${plan.code}` : ""}` }));
  const set = (field, value) => setForm(valueState => ({ ...valueState, [field]: value }));
  return <div className="tags_subscription_modal_backdrop" onMouseDown={onClose}><section className="tags_subscription_modal" onMouseDown={event => event.stopPropagation()}><header><h2>Nueva suscripción</h2><button type="button" onClick={onClose}>×</button></header><form onSubmit={event => { event.preventDefault(); onSubmit(); }}><div className="tags_subscription_form_grid">
    <label>Cliente<TagsSelect searchable searchPlaceholder="Buscar cliente..." value={form.businessId} options={clientOptions} onChange={value => set("businessId", value)} /></label><label>Plan<TagsSelect searchable searchPlaceholder="Buscar plan..." value={form.planId} options={planOptions} onChange={onPlan} /></label>
    <label>Mes de inicio<select value={form.startMonth} onChange={event => setForm(valueState => ({ ...valueState, startMonth: Number(event.target.value), priceSelection: "", customAmount: "", expiresAt: "" }))}>{MONTHS.map((month, index) => <option key={index + 1} value={index + 1}>{month}</option>)}</select></label>
    {isDirectory && <label>Directorio<select value={form.siteId} onChange={event => set("siteId", event.target.value)}>{sites.filter(site => Number(site.id) === Number(directoryPrice?.site_id) || !directoryPrice).map(site => <option key={site.id} value={site.id}>{site.name}</option>)}</select></label>}
    <label className="is_wide">Modalidad y período<TagsSelect searchable searchPlaceholder="Buscar modalidad..." value={form.priceSelection} options={priceOptions.map(option => ({ value: option.value, label: option.label }))} onChange={value => { const option = priceOptions.find(item => item.value === value); setForm(valueState => ({ ...valueState, priceSelection: value, durationMonths: option?.duration || 1, paymentMethod: option?.method || "manual", customAmount: option ? String(option.amount) : "", expiresAt: option ? expiryDate(option.duration, form.startMonth) : "", paymentState: option?.method === "mercadopago" ? "pending" : valueState.paymentState })); }} />{form.planId && !priceOptions.length && <small>Este plan no tiene modalidades con precio configurado.</small>}</label>
    <div className="is_wide tags_subscription_amount_expiry"><label>Importe final<input required type="number" min="0.01" step="0.01" value={form.customAmount || ""} placeholder={priceOptions[0]?.amount || amount || ""} onChange={event => set("customAmount", event.target.value)} /><small>Podés modificarlo para una oferta excepcional.</small></label><label>Vencimiento<input required type="date" value={form.expiresAt || ""} onChange={event => set("expiresAt", event.target.value)} /><small>Podés modificarlo si acordás otra vigencia.</small></label></div>
    <label>Estado inicial<select value={form.paymentState} onChange={event => set("paymentState", event.target.value)}><option value="paid">Pago recibido · activar ahora</option><option value="pending">Pendiente de pago</option></select></label>
  </div><footer><button type="button" onClick={onClose}>Cancelar</button><button type="submit">Continuar</button></footer></form></section></div>;
}
