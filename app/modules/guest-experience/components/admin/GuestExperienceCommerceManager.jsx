"use client";
import { useEffect, useMemo, useState } from "react";
import { FaCheck, FaFloppyDisk, FaShop, FaUtensils } from "react-icons/fa6";
import TagsSpinner from "@/app/components/TagsSpinner";
import showAlert from "@/app/components/showAlert";
import "./GuestExperienceCommerceManager.css";

export default function GuestExperienceCommerceManager({ businessId, data, moduleType = "store" }) {
    const [state, setState] = useState({ stores: [] }), [selected, setSelected] = useState({}), [busy, setBusy] = useState(false);
    const isResto = moduleType === "resto";
    async function read(response) { return response.json().catch(() => ({ error: "El servidor devolvió una respuesta vacía" })); }
    async function load() {
        setBusy(true);
        try {
            const response = await fetch(`/api/guest-experience/admin/commerce?businessId=${businessId}&guestAppId=${data.app.id}&moduleType=${moduleType}`, { cache: "no-store" }), payload = await read(response);
            if (!response.ok) return showAlert({ title: "No se pudo cargar", text: payload.error, icon: "error" });
            setState(payload);
            setSelected(Object.fromEntries(payload.stores.map(item => [item.id, { active: Boolean(Number(item.selected)), displayName: item.display_name || item.name, allowRoomCharge: Boolean(Number(item.allow_room_charge)), deliveryInstructions: item.delivery_instructions || "" }])));
        } finally { setBusy(false); }
    }
    useEffect(() => { load(); }, [businessId, data.app.id, moduleType]);
    function change(id, key, value) { setSelected(current => ({ ...current, [id]: { ...current[id], [key]: value } })); }
    async function save() {
        setBusy(true);
        try {
            const integrations = state.stores.filter(item => selected[item.id]?.active).map(item => ({ storeId: item.id, moduleType, displayName: selected[item.id].displayName, allowRoomCharge: selected[item.id].allowRoomCharge, deliveryInstructions: selected[item.id].deliveryInstructions }));
            const response = await fetch("/api/guest-experience/admin/commerce", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, guestAppId: data.app.id, moduleType, integrations }) }), payload = await read(response);
            if (!response.ok) return showAlert({ title: "No se pudo guardar", text: payload.error, icon: "error" });
            await load(); await showAlert({ title: "Configuración guardada", text: "La configuración fue actualizada.", icon: "success", timer: 1500 });
        } finally { setBusy(false); }
    }
    const Icon = isResto ? FaUtensils : FaShop, title = isResto ? "Gastronomía" : "Tienda", description = isResto ? "Configurá la instancia de Resto que utilizarán tus huéspedes." : "Configurá la instancia de Store que utilizarán tus huéspedes.";
    return <section className="tags_guest_commerce_admin"><header><div><span>{isResto ? "GASTRONOMÍA" : "TIENDA"}</span><h2>Configuración de {title}</h2><p>{description}</p></div></header><section className="tags_guest_commerce_group"><header><Icon /><div><h3>{title}</h3><p>{isResto ? "Carta, comidas y seguimiento del pedido." : "Almacén, regalería y productos del alojamiento."}</p></div></header><div>{state.stores.map(item => { const form = selected[item.id] || {}; return <article className={form.active ? "is_active" : ""} key={item.id}><button type="button" className="tags_guest_commerce_toggle" onClick={() => change(item.id, "active", !form.active)}><i>{form.active && <FaCheck />}</i><span><strong>{item.name}</strong><small>{item.status === "published" && item.page_status === "published" ? "Publicado" : "No publicado"}</small></span></button>{form.active && <div className="tags_guest_commerce_fields"><label>Título visible<input value={form.displayName || ""} onChange={event => change(item.id, "displayName", event.target.value)} /></label><label>Indicaciones de entrega<textarea rows="2" value={form.deliveryInstructions || ""} onChange={event => change(item.id, "deliveryInstructions", event.target.value)} placeholder="Ej.: Lo acercamos a tu alojamiento" /></label><label className="tags_guest_commerce_check"><input type="checkbox" checked={Boolean(form.allowRoomCharge)} onChange={event => change(item.id, "allowRoomCharge", event.target.checked)} /><span>Permitir cargar el pedido a la cuenta de la estadía</span></label></div>}</article>; })}{!state.stores.length && <p className="tags_guest_commerce_empty">No hay una instancia de {title} disponible para este negocio.</p>}</div></section><footer><button type="button" onClick={save} disabled={busy}><FaFloppyDisk /> Guardar configuración</button></footer>{busy && <TagsSpinner size={105} logoSize={55} borderSize={5} background="rgba(255,255,255,.72)" />}</section>;
}
