"use client";

import { useEffect, useState } from "react";
import { FaCheck, FaShop, FaUtensils } from "react-icons/fa6";
import TagsSpinner from "@/app/components/TagsSpinner";
import showAlert from "@/app/components/showAlert";
import "./GuestExperienceCommerceOrders.css";
import "./GuestExperienceCommerceOrdersFix.css";

const STORE_ORDER = { new: "Recibido", confirmed: "Confirmado", preparing: "En preparación", shipped: "Despachado", completed: "Completado", cancelled: "Cancelado" };
const SHIPPING = { pending: "Pendiente", ready: "Listo", in_transit: "En proceso", delivered: "Entregado", returned: "Devuelto", cancelled: "Cancelado" };
const PAYMENT = { pending: "Pendiente", paid: "Pagado", cancelled: "Cancelado", refunded: "Reintegrado" };
const RESTO_ORDER = { new: "Recibido", confirmed: "Confirmado", preparing: "En preparación", ready: "Listo", shipped: "Entregado", completed: "Finalizado", cancelled: "Cancelado" };

export default function GuestExperienceCommerceOrders({ businessId, guestAppId, moduleType }) {
    const [orders, setOrders] = useState([]), [busy, setBusy] = useState(true), [saving, setSaving] = useState(null);
    async function read(response) { return response.json().catch(() => ({ error: "Respuesta vacía del servidor" })); }
    async function load() {
        setBusy(true);
        try {
            const response = await fetch(`/api/guest-experience/admin/commerce?businessId=${businessId}&guestAppId=${guestAppId}`, { cache: "no-store" });
            const payload = await read(response);
            if (response.ok) setOrders(payload.orders.filter(item => item.module_type === moduleType).map(item => ({ ...item, store_shipping_status: ["shipped", "in_transit"].includes(item.store_shipping_status) ? "in_transit" : item.store_shipping_status })));
            else await showAlert({ title: "No se pudo cargar", text: payload.error, icon: "error" });
        } finally { setBusy(false); }
    }
    useEffect(() => { load(); }, [businessId, guestAppId, moduleType]);
    async function update(item, changes) {
        const ok = await showAlert({ title: "¿Actualizar estado?", text: `Se modificará el pedido de ${item.guest_name}.`, icon: "question", showCancelButton: true, confirmButtonText: "Actualizar", cancelButtonText: "Cancelar" });
        if (!ok) return;
        setSaving(item.id);
        try {
            let response, payload;
            if (moduleType === "store") {
                if (changes.order_status) {
                    response = await fetch("/api/store/admin/orders/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, orderId: item.external_order_id, order_status: changes.order_status }) });
                    payload = await read(response); if (!response.ok) throw new Error(payload.error || "No se pudo actualizar el pedido");
                }
                if (changes.shipping_status) {
                    response = await fetch("/api/store/admin/orders/shipping-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, orderId: item.external_order_id, shipping_status: changes.shipping_status }) });
                    payload = await read(response); if (!response.ok) throw new Error(payload.error || "No se pudo actualizar la entrega");
                }
                if (changes.payment_status) {
                    if (changes.payment_status !== "paid") throw new Error("El pago se modifica desde la pantalla de cobros de Store");
                    response = await fetch("/api/store/admin/orders/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, orderId: item.external_order_id, payment_status: "paid" }) });
                    payload = await read(response); if (!response.ok) throw new Error(payload.error || "No se pudo actualizar el pago");
                }
            } else {
                response = await fetch("/api/resto/admin/orders/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, orderId: item.external_session_id, order_status: changes.order_status }) });
                payload = await read(response); if (!response.ok) throw new Error(payload.error || "No se pudo actualizar el pedido gastronómico");
            }
            await showAlert({ title: "Estado actualizado", icon: "success", timer: 1300 }); await load();
        } catch (error) { await showAlert({ title: "No se pudo actualizar", text: error.message, icon: "error" }); } finally { setSaving(null); }
    }
    if (busy) return <TagsSpinner size={90} logoSize={48} borderSize={4} />;
    const orderLabels = moduleType === "store" ? STORE_ORDER : RESTO_ORDER;
    return <section className="tags_guest_commerce_orders_admin"><header><div>{moduleType === "store" ? <FaShop /> : <FaUtensils />}<span><small>{moduleType === "store" ? "PEDIDOS DE TIENDA" : "PEDIDOS DE GASTRONOMÍA"}</small><h2>{moduleType === "store" ? "Pedidos de Store" : "Pedidos de Resto"}</h2></span></div><button onClick={load}>Actualizar</button></header>{orders.map(item => { const orderStatus = moduleType === "store" ? item.store_order_status : item.resto_order_status; return <article key={item.id}><header><div><strong>{item.store_order_number || `Pedido #${item.external_session_id}`}</strong><span>{item.guest_name} · {item.stay_code}</span></div><b>{Number(item.total_amount || 0).toLocaleString("es-AR", { style: "currency", currency: item.currency || "ARS" })}</b></header><div className="tags_guest_commerce_order_admin_fields"><label>Pedido<select value={orderStatus || "new"} onChange={event => update(item, { order_status: event.target.value })}>{Object.entries(orderLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>{moduleType === "store" && <><label>Entrega<select value={item.store_shipping_status || "pending"} onChange={event => update(item, { shipping_status: event.target.value })}>{Object.entries(SHIPPING).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>Pago<select value={item.store_payment_status || "pending"} onChange={event => update(item, { payment_status: event.target.value })}>{Object.entries(PAYMENT).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></>}</div>{saving === item.id && <span className="tags_guest_commerce_order_saving"><FaCheck /> Guardando cambios…</span>}</article>; })}{!orders.length && <div className="tags_guest_commerce_orders_empty">No hay pedidos de este tipo asociados a huéspedes.</div>}</section>;
}
