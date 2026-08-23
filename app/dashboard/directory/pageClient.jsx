"use client";

import { useEffect, useMemo, useState } from "react";
import { FaBuilding, FaFolderTree, FaGlobe, FaLocationDot, FaMoneyBillTransfer, FaPen, FaPlus, FaTrash, FaWhatsapp } from "react-icons/fa6";
import TagsSpinner from "@/app/components/TagsSpinner";
import MediaUploader from "@/app/components/MediaUploader";
import showAlert from "@/app/components/showAlert";
import "./directoryAdmin.css";

const EMPTY_SITE = { name: "", code: "", primaryHost: "", territoryPlaceId: "", logoUrl: "", slogan: "", primaryColor: "#2f7958", emailFrom: "", replyTo: "", notificationEmail: "", whatsapp: "", phone: "", isActive: true };
const EMPTY_TAXONOMY = { parentId: "", name: "", slug: "", imageUrl: "", description: "", sortOrder: 0, isActive: true };
const EMPTY_PLACE = { parentId: "", placeType: "locality", name: "", slug: "", countryCode: "AR", latitude: "", longitude: "", isActive: true };
const EMPTY_LISTING = { listingId: "", businessId: "", slug: "", siteIds: [], lockedSiteIds: [], taxonomyIds: [], placeId: "", isPublished: false };
const PLACE_TYPES = [["country", "País"], ["province", "Provincia"], ["state", "Estado"], ["department", "Departamento"], ["region", "Región"], ["valley", "Valle"], ["locality", "Localidad"], ["neighborhood", "Barrio"], ["other", "Otro"]];
const placeTypeLabel = value => PLACE_TYPES.find(item => item[0] === value)?.[1] || value;

function hierarchyLabel(item, items) {
    const byId = new Map((items || []).map(entry => [String(entry.id), entry]));
    const parts = [item.name];
    let parent = byId.get(String(item.parent_id));
    while (parent) {
        parts.unshift(parent.name);
        parent = byId.get(String(parent.parent_id));
    }
    return parts.join(" / ");
}

function storagePathFromUrl(value) {
    try {
        const url = new URL(String(value || ""));
        if (url.hostname !== "storage.googleapis.com") return "";
        return url.pathname.split("/").filter(Boolean).slice(1).join("/");
    } catch {
        return "";
    }
}

function parseConfig(value) {
    if (!value) return {};
    if (typeof value === "object") return value;
    try { return JSON.parse(value); } catch { return {}; }
}

export default function DirectoryAdminClient() {
    const [data, setData] = useState({ sites: [], taxonomy: [], places: [], businesses: [], listings: [] });
    const [pricing, setPricing] = useState({ sites: [], plans: [], prices: [] });
    const [subscriptions, setSubscriptions] = useState({ subscriptions: [], kpis: {}, sites: [], plans: [], page: 1, pageSize: 20, total: 0, noticeDays: 10 });
    const [subscriptionFilters, setSubscriptionFilters] = useState({ search: "", status: "all", siteId: "", planId: "", paymentProvider: "all", page: 1 });
    const [payments, setPayments] = useState({ payments: [], subscriptions: [], page: 1, pageSize: 20, total: 0 });
    const [paymentFilters, setPaymentFilters] = useState({ search: "", status: "all", provider: "all", page: 1 });
    const [automaticSubscriptions, setAutomaticSubscriptions] = useState({ subscriptions: [], kpis: {}, page: 1, pageSize: 20, total: 0 });
    const [automaticFilters, setAutomaticFilters] = useState({ search: "", status: "all", page: 1 });
    const [tab, setTab] = useState("listings");
    const [busy, setBusy] = useState(false);
    const [modal, setModal] = useState(null);
    const [form, setForm] = useState({});
    const [listingFilters, setListingFilters] = useState({ search: "", siteId: "", status: "all" });

    async function load() {
        setBusy(true);
        try {
            const response = await fetch("/api/directory/admin/bootstrap", { cache: "no-store" });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.error || "No se pudo cargar");
            setData(payload);
        } catch (error) {
            showAlert({ title: "Error", text: error.message, icon: "error" });
        } finally {
            setBusy(false);
        }
    }

    async function loadPricing() {
        try {
            const response = await fetch("/api/directory/admin/pricing", { cache: "no-store" });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.error || "No se pudo cargar precios");
            setPricing(payload);
        } catch (error) { showAlert({ title: "Error", text: error.message, icon: "error" }); }
    }

    useEffect(() => { load(); }, []);
    useEffect(() => { if (tab === "pricing") loadPricing(); }, [tab]);
    async function loadSubscriptions(filters = subscriptionFilters) {
        try {
            const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== "" && value != null).map(([key, value]) => [key, String(value)]));
            const response = await fetch(`/api/directory/admin/subscriptions?${params}`, { cache: "no-store" });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.error || "No se pudieron cargar las suscripciones");
            setSubscriptions(payload);
        } catch (error) { showAlert({ title: "Error", text: error.message, icon: "error" }); }
    }
    useEffect(() => {
        if (tab !== "subscriptions") return undefined;
        const timeout = setTimeout(() => loadSubscriptions(), subscriptionFilters.search ? 300 : 0);
        return () => clearTimeout(timeout);
    }, [tab, subscriptionFilters]);
    async function loadPayments(filters = paymentFilters) {
        try {
            const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== "" && value != null).map(([key, value]) => [key, String(value)]));
            const response = await fetch(`/api/directory/admin/payment-history?${params}`, { cache: "no-store" });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.error || "No se pudieron cargar los pagos");
            setPayments(payload);
        } catch (error) { showAlert({ title: "Error", text: error.message, icon: "error" }); }
    }
    useEffect(() => {
        if (tab !== "payments") return undefined;
        const timeout = setTimeout(() => loadPayments(), paymentFilters.search ? 300 : 0);
        return () => clearTimeout(timeout);
    }, [tab, paymentFilters]);
    async function loadAutomaticSubscriptions(filters = automaticFilters) {
        try {
            const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== "" && value != null).map(([key, value]) => [key, String(value)]));
            const response = await fetch(`/api/directory/admin/automatic-subscriptions?${params}`, { cache: "no-store" });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.error || "No se pudieron cargar las suscripciones automáticas");
            setAutomaticSubscriptions(payload);
        } catch (error) { showAlert({ title: "Error", text: error.message, icon: "error" }); }
    }
    useEffect(() => {
        if (tab !== "automatic-subscriptions") return undefined;
        const timeout = setTimeout(() => loadAutomaticSubscriptions(), automaticFilters.search ? 300 : 0);
        return () => clearTimeout(timeout);
    }, [tab, automaticFilters]);
    async function automaticSubscriptionAction(item, action) {
        setBusy(true);
        try {
            const response = await fetch("/api/directory/admin/automatic-subscriptions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscriptionId: item.subscription_id, action }) });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.error || "No se pudo completar");
            if (payload.checkoutUrl) window.open(payload.checkoutUrl, "_blank", "noopener,noreferrer");
            await loadAutomaticSubscriptions();
        } catch (error) { showAlert({ title: "Error", text: error.message, icon: "error" }); }
        finally { setBusy(false); }
    }
    async function confirmManualPayment(item) {
        const confirmed = await showAlert({ title: "¿Confirmar pago?", text: `${item.business_name} · ${item.plan_name} · ${item.duration_months} mes(es)`, icon: "warning", showCancelButton: true, confirmButtonText: "Confirmar pago", cancelButtonText: "Cancelar" });
        if (!confirmed) return;
        setBusy(true);
        try {
            const response = await fetch("/api/directory/admin/payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscriptionId: item.subscription_id }) });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.error || "No se pudo confirmar");
            await loadSubscriptions();
            await loadPayments();
            await showAlert({ title: "Pago confirmado", text: "La suscripción y la ficha quedaron activas.", icon: "success", timer: 1600 });
        } catch (error) { showAlert({ title: "Error", text: error.message, icon: "error" }); }
        finally { setBusy(false); }
    }

    async function updateSubscription(item, action) {
        const labels = { pause: "Pausar", reactivate: "Reactivar", cancel: "Cancelar", make_free: "Dejar gratuita" };
        const detail = action === "make_free" ? "La Web paga se ocultará, pero la tarjeta gratuita y todo su contenido se conservarán." : `${item.business_name} · ${item.plan_name}`;
        const confirmed = await showAlert({ title: `¿${labels[action]} suscripción?`, text: detail, icon: "warning", showCancelButton: true, confirmButtonText: labels[action], cancelButtonText: "Volver" });
        if (!confirmed) return;
        setBusy(true);
        try {
            const response = await fetch("/api/directory/admin/subscriptions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscriptionId: item.subscription_id, action }) });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.error || "No se pudo actualizar");
            await loadSubscriptions();
            await showAlert({ title: "Suscripción actualizada", icon: "success", timer: 1300 });
        } catch (error) { showAlert({ title: "Error", text: error.message, icon: "error" }); }
        finally { setBusy(false); }
    }

    function openSubscription(item = null) {
        const businessId = item?.business_id || item?.id || "";
        const business = subscriptions.businesses?.find(entry => String(entry.id) === String(businessId));
        const siteIds = String(business?.site_ids || item?.site_ids || "").split(",").filter(Boolean);
        const editing = Boolean(item?.subscription_id);
        setForm({ action: editing ? "edit" : "create", subscriptionId: editing ? String(item.subscription_id) : "", businessId: String(businessId || ""), siteId: siteIds.length === 1 ? siteIds[0] : "", planId: editing ? String(item.plan_id || "") : "", durationMonths: String(item?.duration_months || 1), paymentState: "pending", provider: item?.payment_provider || "manual", amount: editing ? String(item.amount || "") : "", startedAt: item?.started_at ? String(item.started_at).slice(0, 10) : new Date().toISOString().slice(0, 10), expiresAt: item?.expires_at ? String(item.expires_at).slice(0, 10) : "" });
        setModal("subscription");
    }

    async function subscriptionSubmit(event) {
        event.preventDefault();
        setBusy(true);
        try {
            const response = await fetch("/api/directory/admin/subscriptions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.error || "No se pudo crear la suscripción");
            setModal(null);
            await loadSubscriptions();
            await load();
            if (payload.checkoutUrl) window.open(payload.checkoutUrl, "_blank", "noopener,noreferrer");
            await showAlert({ title: payload.checkoutUrl ? "Suscripción creada y enlace generado" : "Suscripción creada", icon: "success", timer: 1600 });
        } catch (error) { await showAlert({ title: "Error", text: error.message, icon: "error" }); }
        finally { setBusy(false); }
    }

    function openPayment(subscriptionId = "") {
        const item = payments.subscriptions?.find(entry => String(entry.id) === String(subscriptionId));
        setForm({ action: "create", subscriptionId: String(subscriptionId || ""), amount: item?.amount || "", provider: "manual", paidAt: new Date().toISOString().slice(0, 10), notes: "" });
        setModal("payment");
    }

    async function paymentSubmit(event) {
        event.preventDefault();
        const ok = await send("/api/directory/admin/payment-history", "POST", form, "Pago imputado");
        if (ok) { await loadPayments(); await loadSubscriptions(); }
    }

    async function cancelPayment(item) {
        const result = await showAlert({ title: "¿Anular pago?", text: `${item.business_name} · ${item.currency} ${Number(item.amount || 0).toLocaleString("es-AR")}. El registro se conservará como anulado.`, showCancelButton: true, confirmButtonText: "Anular pago", cancelButtonText: "Volver", icon: "warning" });
        if (!result) return;
        setBusy(true);
        try {
            const response = await fetch("/api/directory/admin/payment-history", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "cancel", paymentId: item.id, reason: "Anulado por administración" }) });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.error || "No se pudo anular");
            await loadPayments();
        } catch (error) { showAlert({ title: "Error", text: error.message, icon: "error" }); }
        finally { setBusy(false); }
    }

    function notifySubscription(item) {
        const phone = String(item.business_whatsapp || "").replace(/\D/g, "");
        if (!phone) return;
        const expiration = item.expires_at ? new Date(item.expires_at).toLocaleDateString("es-AR") : "próximamente";
        const directoryName = item.primary_site_name || item.site_names || "el Directorio";
        const message = `Hola ${item.business_name}. Te informamos que tu suscripción al plan ${item.plan_name} vence el ${expiration}. Para mantener activa tu Web y sus funcionalidades, contactanos para gestionar la renovación. Muchas gracias. ${directoryName}`;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
        fetch("/api/directory/admin/subscriptions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscriptionId: item.subscription_id, action: "notice" }) }).finally(() => loadSubscriptions());
    }

    async function savePricing(formData) {
        setBusy(true);
        try {
            const response = await fetch("/api/directory/admin/pricing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.error || "No se pudo guardar");
            await loadPricing();
            await showAlert({ title: "Precios guardados", icon: "success", timer: 1300 });
        } catch (error) { showAlert({ title: "Error", text: error.message, icon: "error" }); }
        finally { setBusy(false); }
    }

    async function send(url, method, body, success) {
        setBusy(true);
        try {
            const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.error || "No se pudo completar");
            setModal(null);
            await load();
            await showAlert({ title: success, icon: "success", timer: 1300 });
            return true;
        } catch (error) {
            await showAlert({ title: "Error", text: error.message, icon: "error" });
            return false;
        } finally {
            setBusy(false);
        }
    }

    async function remove(entity, item) {
        const confirmed = await showAlert({
            title: `¿Eliminar ${item.name}?`,
            text: "Solo se eliminará si no tiene datos asociados.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Eliminar",
            cancelButtonText: "Cancelar"
        });
        if (confirmed) await send("/api/directory/admin/entities", "DELETE", { entity, id: item.id }, "Registro eliminado");
    }

    async function openClientCleanup(item) {
        if (!item.business_id) {
            await showAlert({ title: "No se puede eliminar", text: "La ficha no está vinculada con un cliente Tags.", icon: "warning" });
            return;
        }
        setBusy(true);
        try {
            const response = await fetch("/api/directory/admin/clients/cleanup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ businessId: item.business_id })
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.error || "No se pudo preparar la eliminación");
            setForm({ businessId: item.business_id, confirmation: "", inventory: payload.inventory });
            setModal("client-cleanup");
        } catch (error) {
            await showAlert({ title: "Error", text: error.message, icon: "error" });
        } finally { setBusy(false); }
    }

    async function clientCleanupSubmit(event) {
        event.preventDefault();
        setBusy(true);
        try {
            const response = await fetch("/api/directory/admin/clients/cleanup", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ businessId: form.businessId, confirmation: form.confirmation })
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error([payload.error, ...(payload.blockers || [])].filter(Boolean).join(" "));
            setModal(null);
            await load();
            await showAlert({ title: "Cliente de prueba eliminado", text: payload.warning || `También se eliminaron ${payload.filesDeleted || 0} archivo(s) de Cloud Storage.`, icon: payload.warning ? "warning" : "success" });
        } catch (error) {
            await showAlert({ title: "No se eliminó el cliente", text: error.message, icon: "error" });
        } finally { setBusy(false); }
    }

    async function openOrphanFiles() {
        setBusy(true);
        try {
            const response = await fetch("/api/directory/admin/clients/cleanup?orphans=1", { cache: "no-store" });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.error || "No se pudieron consultar los archivos");
            setForm({ orphans: payload.orphans || [] });
            setModal("orphan-files");
        } catch (error) {
            await showAlert({ title: "Error", text: error.message, icon: "error" });
        } finally { setBusy(false); }
    }

    async function removeOrphanFile(item) {
        const confirmed = await showAlert({ title: "¿Eliminar archivo huérfano?", text: item.path, icon: "warning", showCancelButton: true, confirmButtonText: "Eliminar archivo", cancelButtonText: "Volver" });
        if (!confirmed) return;
        setBusy(true);
        try {
            const response = await fetch("/api/directory/admin/clients/cleanup", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "orphan_file", path: item.path })
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.error || "No se pudo eliminar el archivo");
            setForm(current => ({ ...current, orphans: (current.orphans || []).filter(file => file.path !== item.path) }));
        } catch (error) {
            await showAlert({ title: "Error", text: error.message, icon: "error" });
        } finally { setBusy(false); }
    }

    function openEntity(entity, item = null) {
        if (entity === "site") {
            const config = parseConfig(item?.directory_config);
            const brand = parseConfig(item?.brand_config);
            setForm(item ? { id: item.id, name: item.name, code: item.code, primaryHost: item.primary_host, territoryPlaceId: config.territoryPlaceId || "", logoUrl: brand.logoUrl || brand.logo_url || "", slogan: brand.slogan || "", primaryColor: brand.primaryColor || "#2f7958", emailFrom: brand.emailFrom || "", replyTo: brand.replyTo || "", notificationEmail: brand.notificationEmail || brand.replyTo || "", whatsapp: brand.whatsapp || brand.contactWhatsapp || "", phone: brand.phone || "", isActive: Boolean(Number(item.is_active)) } : EMPTY_SITE);
        }
        if (entity === "taxonomy") {
            setForm(item ? { id: item.id, parentId: item.parent_id || "", name: item.name, slug: item.slug, imageUrl: item.image_url || "", description: item.description || "", sortOrder: item.sort_order || 0, isActive: Boolean(Number(item.is_active)) } : EMPTY_TAXONOMY);
        }
        if (entity === "place") {
            setForm(item ? { id: item.id, parentId: item.parent_id || "", placeType: item.place_type, name: item.name, slug: item.slug, countryCode: item.country_code || "", latitude: item.latitude || "", longitude: item.longitude || "", isActive: Boolean(Number(item.is_active)) } : EMPTY_PLACE);
        }
        setModal(entity);
    }

    function openListing(item = null) {
        const existingSiteIds = item ? String(item.site_ids || "").split(",").filter(Boolean) : [];
        setForm(item ? {
            listingId: item.id,
            businessId: item.business_id || "",
            slug: "",
            siteIds: existingSiteIds,
            lockedSiteIds: existingSiteIds,
            taxonomyIds: String(item.taxonomy_ids || "").split(",").filter(Boolean),
            placeId: item.place_id || "",
            isPublished: Number(item.published_count || 0) > 0
        } : EMPTY_LISTING);
        setModal("listing");
    }

    function toggleArray(field, value) {
        const stringValue = String(value);
        setForm(current => ({
            ...current,
            [field]: (current[field] || []).includes(stringValue)
                ? current[field].filter(item => item !== stringValue)
                : [...(current[field] || []), stringValue]
        }));
    }

    function entitySubmit(event) {
        event.preventDefault();
        send("/api/directory/admin/entities", form.id ? "PATCH" : "POST", { ...form, entity: modal }, form.id ? "Registro actualizado" : "Registro creado");
    }

    function listingSubmit(event) {
        event.preventDefault();
        send("/api/directory/admin/listings", "POST", form, "Ficha asignada");
    }

    const filteredListings = useMemo(() => data.listings.filter(item => {
        const search = listingFilters.search.trim().toLowerCase();
        const haystack = `${item.display_name || ""} ${item.business_email || ""}`.toLowerCase();
        const siteIds = String(item.site_ids || "").split(",").filter(Boolean);
        const published = Number(item.published_count || 0) > 0;
        const status = listingFilters.status;
        const matchesStatus = status === "all"
            || (status === "web" && Boolean(item.qr_page_id))
            || (status === "card" && !item.qr_page_id)
            || (status === "published" && published)
            || (status === "draft" && !published);
        return (!search || haystack.includes(search))
            && (!listingFilters.siteId || siteIds.includes(String(listingFilters.siteId)))
            && matchesStatus;
    }), [data.listings, listingFilters]);

    const taxonomyTree = useMemo(() => {
        const tree = new Map();
        (data.taxonomy || []).forEach(item => {
            const parent = item.parent_id == null ? "root" : String(item.parent_id);
            if (!tree.has(parent)) tree.set(parent, []);
            tree.get(parent).push(item);
        });
        tree.forEach(items => items.sort((a, b) => String(a.name).localeCompare(String(b.name), "es", { sensitivity: "base" })));
        return tree;
    }, [data.taxonomy]);

    const placesTree = useMemo(() => {
        const tree = new Map();
        (data.places || []).forEach(item => {
            const parent = item.parent_id == null ? "root" : String(item.parent_id);
            if (!tree.has(parent)) tree.set(parent, []);
            tree.get(parent).push(item);
        });
        tree.forEach(items => items.sort((a, b) => String(a.name).localeCompare(String(b.name), "es", { sensitivity: "base" })));
        return tree;
    }, [data.places]);

    const tabs = [
        ["listings", FaBuilding, "Clientes y fichas"],
        ["sites", FaGlobe, "Directorios"],
        ["taxonomy", FaFolderTree, "Rubros"],
        ["places", FaLocationDot, "Ubicaciones"],
        ["pricing", FaGlobe, "Planes Directorio"],
        ["subscriptions", FaMoneyBillTransfer, "Suscripciones"],
        ["automatic-subscriptions", FaMoneyBillTransfer, "Automáticas MP"],
        ["payments", FaMoneyBillTransfer, "Pagos"]
    ];

    return <main className="tags_directory_admin">
        <header><div><span>ADMINISTRACIÓN DE PLATAFORMA</span><h1><FaGlobe />Directorios</h1><p>Canales, clientes, rubros y ubicación.</p></div></header>
        <nav>{tabs.map(([key, Icon, label]) => <button type="button" className={tab === key ? "active" : ""} onClick={() => setTab(key)} key={key}><Icon />{label}</button>)}</nav>
        {busy && <div className="tags_directory_admin_busy"><TagsSpinner /></div>}

        {tab === "listings" && <section>
            <SectionHead title="Clientes y fichas" text="Vinculá un cliente Tags con su Web y uno o varios Directorios." onAdd={() => openListing()} addText="Asignar cliente" onSecondary={openOrphanFiles} secondaryText="Archivos huérfanos" />
            <div className="tags_directory_admin_filters"><input value={listingFilters.search} onChange={event => setListingFilters({ ...listingFilters, search: event.target.value })} placeholder="Buscar cliente, nombre o email" /><select value={listingFilters.siteId} onChange={event => setListingFilters({ ...listingFilters, siteId: event.target.value })}><option value="">Todos los Directorios</option>{data.sites.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={listingFilters.status} onChange={event => setListingFilters({ ...listingFilters, status: event.target.value })}><option value="all">Todos los estados</option><option value="web">Web activa</option><option value="card">Tarjeta / sin Web</option><option value="published">Publicada</option><option value="draft">Borrador</option></select></div>
            <div className="tags_directory_admin_table"><table><thead><tr><th>Cliente/Ficha</th><th>Estado</th><th>Directorios y rutas</th><th /></tr></thead><tbody>
                {filteredListings.map(item => <tr key={item.id}><td><strong>{item.display_name}</strong><small>{item.business_email || "Sin cliente Tags vinculado"}</small></td><td>{item.qr_page_id ? "Web activada" : Number(item.is_free) === 1 ? "Tarjeta gratuita" : item.status}</td><td>{String(item.channels || "").split(";;").filter(Boolean).map(value => <span key={value}>{value.replace("|", " · /")}</span>)}</td><td><div className="tags_directory_listing_actions"><button type="button" onClick={() => openListing(item)} title="Editar asignación"><FaPen /></button>{item.business_id && <button type="button" className="danger" onClick={() => openClientCleanup(item)} title="Eliminar alta de prueba"><FaTrash /></button>}</div></td></tr>)}
                {!filteredListings.length && <tr><td colSpan="4" className="tags_directory_admin_empty">No hay clientes que coincidan con los filtros.</td></tr>}
            </tbody></table></div>
        </section>}

        {tab === "sites" && <EntitySection title="Directorios o canales" text="Cada canal define su territorio y dominio público." items={data.sites} onAdd={() => openEntity("site")} render={item => <><div><strong>{item.name}</strong><small>{item.code} · {item.primary_host}</small></div><Actions onEdit={() => openEntity("site", item)} onDelete={() => remove("site", item)} /></>} />}
        {tab === "taxonomy" && <section><SectionHead title="Rubros" text="Árbol global de rubros. Solo el último nivel de cada rama se puede asignar a una ficha." onAdd={() => openEntity("taxonomy")} /><div className="tags_directory_taxonomy_tree"><TaxonomyBranch parentKey="root" tree={taxonomyTree} onEdit={item => openEntity("taxonomy", item)} onDelete={item => remove("taxonomy", item)} /></div></section>}
        {tab === "places" && <section><SectionHead title="Ubicaciones" text="Cargá y administrá Países, Provincias, Regiones y Localidades en una jerarquía clara." onAdd={() => openEntity("place")} /><div className="tags_directory_taxonomy_tree"><PlaceBranch parentKey="root" tree={placesTree} onEdit={item => openEntity("place", item)} onDelete={item => remove("place", item)} /></div></section>}
        {tab === "pricing" && <DirectoryPricing pricing={pricing} onSave={savePricing} />}
        {tab === "subscriptions" && <DirectorySubscriptions data={subscriptions} filters={subscriptionFilters} setFilters={setSubscriptionFilters} onCreate={openSubscription} onConfirm={confirmManualPayment} onAction={updateSubscription} onNotify={notifySubscription} />}
        {tab === "automatic-subscriptions" && <DirectoryAutomaticSubscriptions data={automaticSubscriptions} filters={automaticFilters} setFilters={setAutomaticFilters} onAction={automaticSubscriptionAction} />}
        {tab === "payments" && <DirectoryPayments data={payments} filters={paymentFilters} setFilters={setPaymentFilters} onCreate={openPayment} onConfirm={confirmManualPayment} onCancel={cancelPayment} />}

        {modal && <div className="tags_directory_admin_overlay"><div className="tags_directory_admin_modal">
            <button type="button" className="close" onClick={() => setModal(null)}>×</button>
            <h2>{modal === "client-cleanup" ? "Eliminar alta de prueba" : modal === "orphan-files" ? "Archivos huérfanos" : modal === "payment" ? "Imputar pago" : modal === "subscription" ? (form.action === "edit" ? "Editar suscripción" : "Crear suscripción") : <>{form.id || form.listingId ? "Editar" : "Crear"} {modal === "listing" ? "asignación" : modal === "site" ? "Directorio" : modal === "taxonomy" ? "rubro" : "ubicación"}</>}</h2>
            {modal === "client-cleanup" ? <ClientCleanupForm form={form} setForm={setForm} onSubmit={clientCleanupSubmit} busy={busy} /> : modal === "orphan-files" ? <OrphanFiles files={form.orphans || []} onDelete={removeOrphanFile} /> : modal === "listing" ? <ListingForm data={data} form={form} setForm={setForm} toggleArray={toggleArray} onSubmit={listingSubmit} busy={busy} /> : modal === "subscription" ? <SubscriptionForm data={subscriptions} form={form} setForm={setForm} onSubmit={subscriptionSubmit} busy={busy} /> : modal === "payment" ? <PaymentForm data={payments} form={form} setForm={setForm} onSubmit={paymentSubmit} busy={busy} /> : <EntityForm modal={modal} data={data} form={form} setForm={setForm} onSubmit={entitySubmit} busy={busy} />}
        </div></div>}
    </main>;
}

function SectionHead({ title, text, onAdd, addText = "Agregar", onSecondary, secondaryText }) {
    return <div className="tags_directory_admin_section_head"><div><h2>{title}</h2><p>{text}</p></div><div className="tags_directory_section_actions">{onSecondary && <button type="button" className="secondary" onClick={onSecondary}><FaTrash />{secondaryText}</button>}{onAdd && <button type="button" onClick={onAdd}><FaPlus />{addText}</button>}</div></div>;
}

function ClientCleanupForm({ form, setForm, onSubmit, busy }) {
    const inventory = form.inventory || {};
    const counts = inventory.counts || {};
    const expected = String(inventory.business?.display_name || inventory.business?.name || "").trim();
    return <form onSubmit={onSubmit} className="tags_directory_cleanup_form">
        <div className="tags_directory_cleanup_warning"><strong>Eliminación definitiva de una prueba</strong><p>Se eliminarán el cliente, su ficha, páginas, QR, suscripciones, pagos, Reviews y archivos propios. Esta acción no se puede deshacer.</p></div>
        <div className="tags_directory_cleanup_inventory"><strong>{expected}</strong><small>{inventory.business?.email}</small><div><span>{counts.listings || 0} ficha(s)</span><span>{counts.pages || 0} página(s)</span><span>{counts.qrs || 0} QR</span><span>{counts.subscriptions || 0} suscripción(es)</span><span>{counts.addons || 0} addon(s)</span><span>{counts.files || 0} archivo(s)</span></div></div>
        {(inventory.blockers || []).length > 0 && <div className="tags_directory_cleanup_blockers"><strong>El borrado está bloqueado</strong>{inventory.blockers.map(item => <p key={item}>{item}</p>)}</div>}
        {inventory.canDelete && <label>Para confirmar, escribí exactamente: <strong>{expected}</strong><input autoComplete="off" value={form.confirmation || ""} onChange={event => setForm({ ...form, confirmation: event.target.value })} /></label>}
        <button type="submit" className="danger" disabled={busy || !inventory.canDelete || form.confirmation !== expected}>Eliminar definitivamente</button>
    </form>;
}

function OrphanFiles({ files, onDelete }) {
    return <div className="tags_directory_orphan_files"><p>Son logos subidos desde Publicar mi negocio que ya no tienen ninguna referencia en la base. Revisá la ruta antes de eliminarlos.</p>{!files.length && <div className="tags_directory_admin_empty">No se encontraron archivos huérfanos.</div>}{files.map(item => <article key={item.path}><div><strong>{item.path.split("/").pop()}</strong><small>{item.createdAt ? new Date(item.createdAt).toLocaleString("es-AR") : "Sin fecha"} · {(Number(item.size || 0) / 1024).toFixed(1)} KB</small><code>{item.path}</code></div><button type="button" className="danger" onClick={() => onDelete(item)}><FaTrash /> Eliminar</button></article>)}</div>;
}

function EntitySection({ title, text, items, onAdd, render }) {
    return <section><SectionHead title={title} text={text} onAdd={onAdd} /><div className="tags_directory_admin_rows">{items.map(item => <article key={item.id}>{render(item)}</article>)}</div></section>;
}

function Actions({ onEdit, onDelete }) {
    return <div className="actions"><button type="button" onClick={onEdit} title="Editar"><FaPen /></button><button type="button" onClick={onDelete} className="danger" title="Eliminar"><FaTrash /></button></div>;
}

function TaxonomyBranch({ parentKey, tree, onEdit, onDelete }) {
    return (tree.get(parentKey) || []).map(item => {
        const children = tree.get(String(item.id)) || [];
        const isLeaf = Boolean(Number(item.is_leaf));
        return <div className="tags_directory_taxonomy_node" key={item.id}>
            <article className={isLeaf ? "leaf" : "branch"}>
                <div><strong>{item.name}</strong><small>{isLeaf ? "Rubro asignable" : "Categoría organizadora"} · {item.listing_count} fichas</small></div>
                <Actions onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} />
            </article>
            {children.length > 0 && <div className="tags_directory_taxonomy_children"><TaxonomyBranch parentKey={String(item.id)} tree={tree} onEdit={onEdit} onDelete={onDelete} /></div>}
        </div>;
    });
}

function PlaceBranch({ parentKey, tree, onEdit, onDelete }) {
    return (tree.get(parentKey) || []).map(item => {
        const children = tree.get(String(item.id)) || [];
        return <div className="tags_directory_taxonomy_node" key={item.id}>
            <article className={children.length ? "branch" : "leaf"}>
                <div><strong>{item.name}</strong><small>{placeTypeLabel(item.place_type)} · {item.listing_count} fichas</small></div>
                <Actions onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} />
            </article>
            {children.length > 0 && <div className="tags_directory_taxonomy_children"><PlaceBranch parentKey={String(item.id)} tree={tree} onEdit={onEdit} onDelete={onDelete} /></div>}
        </div>;
    });
}

function PlaceSelector({ places, value, onChange }) {
    const byId = new Map((places || []).map(item => [String(item.id), item]));
    const selectedPath = [];
    let cursor = byId.get(String(value));
    while (cursor) {
        selectedPath.unshift(cursor);
        cursor = cursor.parent_id ? byId.get(String(cursor.parent_id)) : null;
    }
    const levels = [];
    let parentId = null;
    for (let index = 0; index < 12; index += 1) {
        const options = (places || []).filter(item => (item.parent_id == null ? null : String(item.parent_id)) === (parentId == null ? null : String(parentId))).sort((a, b) => String(a.name).localeCompare(String(b.name), "es", { sensitivity: "base" }));
        if (!options.length) break;
        const selected = selectedPath.find(item => (item.parent_id == null ? null : String(item.parent_id)) === (parentId == null ? null : String(parentId)));
        levels.push({ options, selected: selected ? String(selected.id) : "" });
        if (!selected || !places.some(item => String(item.parent_id) === String(selected.id))) break;
        parentId = selected.id;
    }
    const selectedPlace = byId.get(String(value));
    return <div className="tags_directory_place_selector">
        <label>Ubicación del cliente{levels.map((level, index) => <select key={index} value={level.selected} onChange={event => onChange(event.target.value)}><option value="">Seleccionar {index === 0 ? "país o ubicación principal" : "nivel siguiente"}</option>{level.options.map(item => <option key={item.id} value={item.id}>{item.name} · {placeTypeLabel(item.place_type)}</option>)}</select>)}</label>
        {selectedPlace && selectedPlace.place_type !== "locality" && <small className="tags_directory_place_warning">Seleccioná también una localidad para completar País → Provincia → Región → Localidad.</small>}
    </div>;
}

function ListingForm({ data, form, setForm, toggleArray, onSubmit, busy }) {
    const [taxonomySearch, setTaxonomySearch] = useState("");
    const taxonomyById = new Map((data.taxonomy || []).map(item => [String(item.id), item]));
    function taxonomyLabel(item) {
        const parts = [item.name];
        let parent = taxonomyById.get(String(item.parent_id));
        while (parent) {
            parts.unshift(parent.name);
            parent = taxonomyById.get(String(parent.parent_id));
        }
        return parts.join(" / ");
    }
    const leaves = data.taxonomy.filter(item => Boolean(Number(item.is_leaf))).map(item => ({ item, label: taxonomyLabel(item) })).sort((a, b) => a.label.localeCompare(b.label, "es", { sensitivity: "base" }));
    const visibleLeaves = leaves.filter(({ label }) => !taxonomySearch.trim() || label.toLowerCase().includes(taxonomySearch.trim().toLowerCase()));
    return <form onSubmit={onSubmit}>
        <label>Cliente Tags<select required value={form.businessId} onChange={event => setForm({ ...form, businessId: event.target.value })}><option value="">Seleccionar</option>{data.businesses.map(item => <option value={item.id} key={item.id}>{item.name} · {item.email}</option>)}</select></label>
        <label>Ficha migrada o existente<select value={form.listingId} onChange={event => setForm({ ...form, listingId: event.target.value })}><option value="">Crear ficha nueva</option>{data.listings.filter(item => !item.business_id || String(item.business_id) === String(form.businessId)).map(item => <option value={item.id} key={item.id}>{item.display_name}</option>)}</select></label>
        <label>Slug para fichas nuevas<input value={form.slug} onChange={event => setForm({ ...form, slug: event.target.value })} placeholder="nombre-del-negocio" /><small>Las rutas históricas existentes no se reemplazan.</small></label>
        <fieldset><legend>Directorios</legend>{data.sites.map(item => { const locked=(form.lockedSiteIds||[]).includes(String(item.id));return <label className="check" key={item.id}><input type="checkbox" disabled={locked} checked={(form.siteIds || []).includes(String(item.id))} onChange={() => toggleArray("siteIds", item.id)} />{item.name}{locked ? " · ruta conservada" : ""}</label>; })}<small>Las rutas ya asignadas se conservan; podés sumar nuevos Directorios.</small></fieldset>
        <PlaceSelector places={data.places} value={form.placeId} onChange={value => setForm({ ...form, placeId: value })} />
        <fieldset><legend>Rubros globales</legend><small>Seleccioná únicamente el último rubro de cada rama.</small><input className="tags_directory_taxonomy_search" value={taxonomySearch} onChange={event => setTaxonomySearch(event.target.value)} placeholder="Buscar rubro dentro del árbol" /><div className="tags_directory_admin_checks">{visibleLeaves.map(({ item, label }) => <label className="check" key={item.id}><input type="checkbox" checked={(form.taxonomyIds || []).includes(String(item.id))} onChange={() => toggleArray("taxonomyIds", item.id)} />{label}</label>)}{!visibleLeaves.length && <small>No hay hojas que coincidan con la búsqueda.</small>}</div></fieldset>
        <label className="check"><input type="checkbox" checked={Boolean(form.isPublished)} onChange={event => setForm({ ...form, isPublished: event.target.checked })} />Publicar en los Directorios seleccionados</label>
        <button type="submit" disabled={busy}>Guardar asignación</button>
    </form>;
}

function EntityForm({ modal, data, form, setForm, onSubmit, busy }) {
    return <form onSubmit={onSubmit}>
        {modal === "site" && <>
            <label>Nombre<input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label>
            <label>Código<input required disabled={Boolean(form.id)} value={form.code} onChange={event => setForm({ ...form, code: event.target.value })} /></label>
            <label>Dominio o subdominio<input required value={form.primaryHost} onChange={event => setForm({ ...form, primaryHost: event.target.value })} /></label>
            <label>Slogan<input value={form.slogan || ""} onChange={event => setForm({ ...form, slogan: event.target.value })} placeholder="Plataforma Comercial de..." /></label>
            <div className="tags_directory_admin_media_field tags_directory_site_logo_field"><span>Logo del Directorio</span><MediaUploader businessId="platform" value={form.logoUrl} module="directory" variant="site-brand" entityId={form.id || "new"} fileName={form.code || form.name || "directorio"} replace previousUrl={form.logoUrl} previousStoragePath={storagePathFromUrl(form.logoUrl)} accept="image/*" label={form.logoUrl ? "Cambiar logo" : "Cargar logo"} onChange={media => setForm({ ...form, logoUrl: media?.url || "" })} /></div>
            <label>Color principal<input type="color" value={form.primaryColor || "#2f7958"} onChange={event => setForm({ ...form, primaryColor: event.target.value })} /></label>
            <label>Email no-reply visible<input type="email" placeholder={form.primaryHost ? `no-reply@${form.primaryHost}` : "no-reply@dominio.com"} value={form.emailFrom} onChange={event => setForm({ ...form, emailFrom: event.target.value })} /><small>El dominio debe estar validado en Mailgun. No se expone la casilla tecnica compartida.</small></label>
            <label>Email para respuestas<input type="email" value={form.replyTo} onChange={event => setForm({ ...form, replyTo: event.target.value })} /><small>Opcional. Las respuestas del cliente llegaran a esta casilla.</small></label>
            <label>Email de notificaciones administrativas<input type="email" value={form.notificationEmail || ""} onChange={event => setForm({ ...form, notificationEmail: event.target.value })} placeholder="info@dominio.com" /><small>Recibe nuevas altas, suscripciones pendientes y vencimientos del Directorio.</small></label>
            <label>WhatsApp de contacto<input value={form.whatsapp || ""} onChange={event => setForm({ ...form, whatsapp: event.target.value })} placeholder="3546778899" /><small>Se usará en el botón flotante de Publicar Mi Negocio y en los contactos del Directorio.</small></label>
            <label>Teléfono de contacto<input value={form.phone || ""} onChange={event => setForm({ ...form, phone: event.target.value })} placeholder="3546778899" /><small>Se mostrará como teléfono institucional del Directorio.</small></label>
            <label>Territorio<select value={form.territoryPlaceId} onChange={event => setForm({ ...form, territoryPlaceId: event.target.value })}><option value="">Sin territorio asignado</option>{data.places.map(item => <option value={item.id} key={item.id}>{item.name} · {placeTypeLabel(item.place_type)}</option>)}</select></label>
        </>}
        {modal === "taxonomy" && <>
            <p className="tags_directory_admin_form_note">Este rubro estará disponible en todos los Directorios.</p>
            <label>Rubro superior<select value={form.parentId} onChange={event => setForm({ ...form, parentId: event.target.value })}><option value="">Rubro principal</option>{data.taxonomy.filter(item => item.id !== form.id).map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
            <label>Nombre<input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label>
            <label>Slug<input value={form.slug} onChange={event => setForm({ ...form, slug: event.target.value })} /></label>
            <div className="tags_directory_admin_media_field"><span>Imagen del rubro</span><MediaUploader businessId="platform" value={form.imageUrl} module="directory" variant="category" entityId={form.id || "new"} fileName={form.slug || form.name || "rubro"} replace previousUrl={form.imageUrl} previousStoragePath={storagePathFromUrl(form.imageUrl)} accept="image/*" label={form.imageUrl ? "Cambiar imagen" : "Cargar imagen"} onChange={media => setForm({ ...form, imageUrl: media?.url || "" })} /></div>
            <label>Descripción<textarea value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} /></label>
        </>}
        {modal === "place" && <>
            <label>Tipo<select value={form.placeType} onChange={event => setForm({ ...form, placeType: event.target.value })}>{PLACE_TYPES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <label>Ubicación superior<select value={form.parentId} onChange={event => setForm({ ...form, parentId: event.target.value })}><option value="">Sin superior</option>{data.places.filter(item => item.id !== form.id).map(item => <option value={item.id} key={item.id}>{item.name} · {placeTypeLabel(item.place_type)}</option>)}</select></label>
            <label>Nombre<input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label>
            <label>Código de país<input maxLength="2" value={form.countryCode} onChange={event => setForm({ ...form, countryCode: event.target.value.toUpperCase() })} /></label>
            <details className="tags_directory_admin_optional"><summary>Ubicación de referencia para mapas (opcional)</summary><p>Solo se utiliza para centrar mapas. La ubicación exacta se carga en cada prestador.</p><div className="two"><label>Latitud<input type="number" step="any" value={form.latitude} onChange={event => setForm({ ...form, latitude: event.target.value })} /></label><label>Longitud<input type="number" step="any" value={form.longitude} onChange={event => setForm({ ...form, longitude: event.target.value })} /></label></div></details>
        </>}
        <label className="check"><input type="checkbox" checked={form.isActive !== false} onChange={event => setForm({ ...form, isActive: event.target.checked })} />Activo</label>
        <button type="submit" disabled={busy}>Guardar</button>
    </form>;
}

const PRICE_FIELDS = [
    ["manual_month_01", "Enero"], ["manual_month_02", "Febrero"], ["manual_month_03", "Marzo"],
    ["manual_month_04", "Abril"], ["manual_month_05", "Mayo"], ["manual_month_06", "Junio"],
    ["manual_month_07", "Julio"], ["manual_month_08", "Agosto"], ["manual_month_09", "Septiembre"],
    ["manual_month_10", "Octubre"], ["manual_month_11", "Noviembre"], ["manual_month_12", "Diciembre"],
    ["manual_pack_12", "Promo anual · 12 meses"],
    ["mercadopago_monthly", "Mercado Pago mensual"]
];

const SUBSCRIPTION_STATUS_LABELS = { active: "Activa", pending: "Pendiente de pago", paused: "Pausada", expired: "Vencida", cancelled: "Cancelada", past_due: "Pago vencido" };

function DirectorySubscriptions({ data, filters, setFilters, onCreate, onConfirm, onAction, onNotify }) {
    const pages = Math.max(1, Math.ceil(Number(data.total || 0) / Number(data.pageSize || 20)));
    const setFilter = (field, value) => setFilters(current => ({ ...current, [field]: value, page: field === "page" ? value : 1 }));
    const freeBusinesses = (data.businesses || []).filter(item => Number(item.is_free) === 1 && !item.current_subscription_id);
    const visibleFreeBusinesses = freeBusinesses.filter(item => {
        const search = String(filters.search || "").trim().toLowerCase();
        const siteIds = String(item.site_ids || "").split(",").filter(Boolean);
        return (!search || `${item.name || ""} ${item.email || ""}`.toLowerCase().includes(search))
            && (!filters.siteId || siteIds.includes(String(filters.siteId)))
            && !filters.planId
            && ["all", "free"].includes(filters.paymentProvider);
    });
    const currentTotal = Number(data.kpis?.total || 0) + freeBusinesses.length;
    const kpis = [
        ["all", "Todas", currentTotal], ["active", "Activas", data.kpis?.active], ["pending", "Pendientes", data.kpis?.pending],
        ["expiring", "Por vencer", data.kpis?.expiring], ["paused", "Pausadas", data.kpis?.paused], ["expired", "Vencidas", data.kpis?.expired], ["cancelled", "Canceladas", data.kpis?.cancelled], ["free", "Gratuitos", freeBusinesses.length]
    ];
    return <section>
        <SectionHead title="Suscripciones" text="Administrá vigencia, pagos y publicación de los planes del Directorio." onAdd={() => onCreate()} addText="Crear suscripción" />
        <p className="tags_directory_subscription_filter_label">Filtrar por estado</p>
        <div className="tags_directory_subscription_kpis" role="group" aria-label="Filtrar suscripciones por estado">{kpis.map(([key, label, value]) => <button type="button" className={filters.status === key ? "active" : ""} onClick={() => setFilter("status", key)} key={key}><strong>{Number(value || 0)}</strong><span>{label}</span></button>)}</div>
        <div className="tags_directory_subscription_filters">
            <input value={filters.search} onChange={event => setFilter("search", event.target.value)} placeholder="Buscar negocio, titular o email" />
            <select value={filters.siteId} onChange={event => setFilter("siteId", event.target.value)}><option value="">Todos los Directorios</option>{(data.sites || []).map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
            <select value={filters.planId} onChange={event => setFilter("planId", event.target.value)}><option value="">Todos los planes</option>{(data.plans || []).map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
            <select value={filters.paymentProvider} onChange={event => setFilter("paymentProvider", event.target.value)}><option value="all">Todos los pagos</option><option value="manual">Manual</option><option value="transfer">Transferencia</option><option value="mercadopago">Mercado Pago</option><option value="free">Gratuito</option></select>
        </div>
        <div className="tags_directory_admin_table tags_directory_subscriptions_table"><table><thead><tr><th>Negocio</th><th>Plan</th><th>Estado</th><th>Importe</th><th>Vigencia</th><th>Acciones</th></tr></thead><tbody>
            {filters.status !== "free" && (data.subscriptions || []).map(item => {
                const expiresAt = item.expires_at ? new Date(item.expires_at) : null;
                const days = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / 86400000) : null;
                const canNotify = Boolean(String(item.business_whatsapp || "").replace(/\D/g, "")) && days != null && days <= Number(data.noticeDays || 10) && ["active", "expired", "past_due"].includes(item.effective_status);
                return <tr key={item.subscription_id}>
                    <td><strong>{item.business_name}</strong><small>{item.business_email}</small><small>{item.site_names || "Sin Directorio"}</small></td>
                    <td><strong>{item.plan_name}</strong><small>{item.payment_provider || "manual"} · {item.duration_months || 1} mes(es)</small></td>
                    <td><span className={`tags_directory_subscription_status ${item.effective_status}`}>{SUBSCRIPTION_STATUS_LABELS[item.effective_status] || item.effective_status}</span>{days != null && item.effective_status === "active" && <small>{days === 0 ? "Vence hoy" : `Vence en ${days} días`}</small>}</td>
                    <td>{item.currency} {Number(item.amount || 0).toLocaleString("es-AR")}</td>
                    <td><small>Inicio: {item.started_at ? new Date(item.started_at).toLocaleDateString("es-AR") : "—"}</small><small>Fin: {expiresAt ? expiresAt.toLocaleDateString("es-AR") : "Sin vencimiento"}</small>{item.last_expiration_notice_at && <small>Notificada: {new Date(item.last_expiration_notice_at).toLocaleDateString("es-AR")}</small>}</td>
                    <td><div className="tags_directory_subscription_actions">
                        <button type="button" onClick={() => onCreate(item)}>Editar</button>
                        {item.effective_status === "pending" && <button type="button" onClick={() => onConfirm(item)}>Confirmar pago</button>}
                        {["active", "pending"].includes(item.effective_status) && <button type="button" onClick={() => onAction(item, "pause")}>Pausar</button>}
                        {["paused", "past_due"].includes(item.effective_status) && <button type="button" onClick={() => onAction(item, "reactivate")}>Reactivar</button>}
                        {["active", "pending", "paused", "past_due", "expired"].includes(item.effective_status) && <button type="button" onClick={() => onAction(item, "make_free")}>Dejar gratuita</button>}
                        {item.effective_status === "cancelled" && <button type="button" onClick={() => onCreate(item)}>Nueva suscripción</button>}
                        {item.effective_status !== "cancelled" && <button type="button" className="danger" onClick={() => onAction(item, "cancel")}>Cancelar</button>}
                        <button type="button" className="whatsapp" disabled={!canNotify} onClick={() => onNotify(item)} title={canNotify ? "Preparar aviso de vencimiento" : "Disponible cuando falten 10 días o menos"}><FaWhatsapp /> Notificar</button>
                    </div></td>
                </tr>;
            })}
            {["all", "free"].includes(filters.status) && visibleFreeBusinesses.map(item => <tr key={`free-${item.id}`}>
                <td><strong>{item.name}</strong><small>{item.email}</small></td>
                <td><strong>Ficha gratuita</strong><small>Sin plan pago vigente</small></td>
                <td><span className="tags_directory_subscription_status free">Gratuita</span></td>
                <td>—</td><td><small>Sin vencimiento de plan</small></td>
                <td><div className="tags_directory_subscription_actions"><button type="button" onClick={() => onCreate(item)}>Asignar plan pago</button></div></td>
            </tr>)}
            {((filters.status === "free" && !visibleFreeBusinesses.length) || (filters.status !== "free" && !data.subscriptions?.length && !(filters.status === "all" && visibleFreeBusinesses.length))) && <tr><td colSpan="6" className="tags_directory_admin_empty">No hay suscripciones que coincidan con los filtros.</td></tr>}
        </tbody></table></div>
        {filters.status !== "free" && <div className="tags_directory_subscription_pagination"><button type="button" disabled={Number(data.page || 1) <= 1} onClick={() => setFilter("page", Number(data.page || 1) - 1)}>Anterior</button><span>Página {data.page || 1} de {pages} · {filters.status === "all" ? currentTotal : Number(data.total || 0)} registros</span><button type="button" disabled={Number(data.page || 1) >= pages} onClick={() => setFilter("page", Number(data.page || 1) + 1)}>Siguiente</button></div>}
        {!data.noticeTrackingEnabled && <p className="tags_directory_subscription_migration_note">El botón de WhatsApp funciona. Ejecutá la migración de avisos para registrar la fecha de la última notificación.</p>}
    </section>;
}

function SubscriptionForm({ data, form, setForm, onSubmit, busy }) {
    const business = (data.businesses || []).find(item => String(item.id) === String(form.businessId));
    const allowedSites = String(business?.site_ids || "").split(",").filter(Boolean);
    const sites = (data.sites || []).filter(item => !business || allowedSites.includes(String(item.id)));
    return <form onSubmit={onSubmit}>
        <label>Cliente con ficha asignada<select required value={form.businessId} onChange={event => { const selected=(data.businesses || []).find(item => String(item.id)===event.target.value);const ids=String(selected?.site_ids||"").split(",").filter(Boolean);setForm({ ...form, businessId:event.target.value,siteId:ids.length===1?ids[0]:"" }); }}><option value="">Seleccionar cliente</option>{(data.businesses || []).map(item => <option value={item.id} key={item.id}>{item.name} · {item.email} · {item.current_plan_name ? `${item.current_plan_name} (${item.current_subscription_status})` : "Ficha gratuita / sin suscripción paga"}</option>)}</select></label>
        <label>Directorio<select required value={form.siteId} onChange={event => setForm({ ...form, siteId: event.target.value })}><option value="">Seleccionar Directorio</option>{sites.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select><small>Solo aparecen los Directorios donde el cliente ya tiene una ficha asignada.</small></label>
        <label>Plan<select required value={form.planId} onChange={event => setForm({ ...form, planId: event.target.value })}><option value="">Seleccionar plan</option>{(data.plans || []).map(item => <option value={item.id} key={item.id}>{item.name} · {item.max_qr_codes} QR</option>)}</select></label>
        <div className="two"><label>Período<select disabled={form.provider === "mercadopago"} value={form.provider === "mercadopago" ? "1" : form.durationMonths} onChange={event => setForm({ ...form, durationMonths: event.target.value })}><option value="1">1 mes</option><option value="3">3 meses</option><option value="6">6 meses</option><option value="12">12 meses</option></select></label><label>Fecha de inicio<input type="date" required value={form.startedAt} onChange={event => setForm({ ...form, startedAt: event.target.value })} /></label></div>
        <label>Importe a imputar<input type="number" min="0.01" step="0.01" required={form.action === "edit"} value={form.amount || ""} onChange={event => setForm({ ...form, amount: event.target.value })} placeholder="Precio configurado del plan" /><small>Se precarga con el precio del plan cuando corresponde y puede modificarse para este cliente. Los pagos históricos no se alteran.</small></label>
        {form.action === "edit" && <label>Vencimiento<input type="date" required value={form.expiresAt || ""} onChange={event => setForm({ ...form, expiresAt: event.target.value })} /></label>}
        <label>Situación del pago<select disabled={form.action === "edit" || form.provider === "mercadopago"} value={form.provider === "mercadopago" ? "pending" : form.paymentState} onChange={event => setForm({ ...form, paymentState: event.target.value })}><option value="received">Pago recibido e imputado</option><option value="pending">Pendiente · activar 72 horas</option><option value="unpaid">Crear sin activar ni imputar pago</option></select></label>
        <label>Medio de pago<select value={form.provider} onChange={event => setForm({ ...form, provider: event.target.value })}><option value="manual">Manual</option><option value="transfer">Transferencia</option><option value="mercadopago">Mercado Pago</option></select></label>
        <p className="tags_directory_admin_form_note">Si cambiás de manual a Mercado Pago, se generará una nueva autorización. Si el cliente era gratuito, se conserva su ficha y se activa la misma Web.</p>
        <button type="submit" disabled={busy}>{form.action === "edit" ? "Guardar cambios" : "Crear suscripción"}</button>
    </form>;
}

function DirectoryAutomaticSubscriptions({ data, filters, setFilters, onAction }) {
    const pages = Math.max(1, Math.ceil(Number(data.total || 0) / Number(data.pageSize || 20)));
    const setFilter = (field, value) => setFilters(current => ({ ...current, [field]: value, page: field === "page" ? value : 1 }));
    return <section><SectionHead title="Suscripciones automáticas Mercado Pago" text="Seguimiento exclusivo de autorizaciones, cobros mensuales y sincronización con Mercado Pago." />
        <div className="tags_directory_subscription_kpis"><button type="button" className={filters.status === "all" ? "active" : ""} onClick={() => setFilter("status", "all")}><strong>{Number(data.kpis?.total || 0)}</strong><span>Todas</span></button><button type="button" className={filters.status === "authorized" ? "active" : ""} onClick={() => setFilter("status", "authorized")}><strong>{Number(data.kpis?.authorized || 0)}</strong><span>Autorizadas</span></button><button type="button" className={filters.status === "pending" ? "active" : ""} onClick={() => setFilter("status", "pending")}><strong>{Number(data.kpis?.pending || 0)}</strong><span>Pendientes</span></button><button type="button" className={filters.status === "paused" ? "active" : ""} onClick={() => setFilter("status", "paused")}><strong>{Number(data.kpis?.paused || 0)}</strong><span>Pausadas</span></button><button type="button" className={filters.status === "cancelled" ? "active" : ""} onClick={() => setFilter("status", "cancelled")}><strong>{Number(data.kpis?.cancelled || 0)}</strong><span>Canceladas</span></button></div>
        <div className="tags_directory_subscription_filters"><input value={filters.search} onChange={event => setFilter("search", event.target.value)} placeholder="Buscar cliente, email o ID Mercado Pago" /></div>
        <div className="tags_directory_admin_table"><table><thead><tr><th>Cliente</th><th>Plan</th><th>Estado</th><th>Cobros</th><th>Próximo cobro</th><th>Sincronización</th><th /></tr></thead><tbody>{(data.subscriptions || []).map(item => <tr key={item.subscription_id}><td><strong>{item.business_name}</strong><small>{item.email}</small><small>{item.site_name || "Sin Directorio"}</small></td><td><strong>{item.plan_name}</strong><small>{item.currency} {Number(item.amount || 0).toLocaleString("es-AR")} / mes</small></td><td><span className={`tags_directory_subscription_status ${item.provider_status === "authorized" ? "active" : item.provider_status || "pending"}`}>{item.provider_status || "pending"}</span><small>Local: {item.local_status}</small></td><td><strong>{Number(item.approved_payments || 0)} aprobados</strong><small>{Number(item.rejected_payments || 0)} rechazados</small><small>{item.last_paid_at ? new Date(item.last_paid_at).toLocaleDateString("es-AR") : "Sin cobros"}</small></td><td>{item.provider_next_payment_at ? new Date(item.provider_next_payment_at).toLocaleDateString("es-AR") : "—"}</td><td><small>{item.external_subscription_id || "Sin ID externo"}</small><small>{item.provider_last_synced_at ? new Date(item.provider_last_synced_at).toLocaleString("es-AR") : "Nunca"}</small></td><td><div className="tags_directory_subscription_actions"><button type="button" onClick={() => onAction(item, item.external_subscription_id ? "sync" : "retry")}>{item.external_subscription_id ? "Sincronizar" : "Generar enlace"}</button>{item.provider_init_point && item.provider_status !== "authorized" && <a href={item.provider_init_point} target="_blank" rel="noreferrer">Abrir autorización</a>}</div></td></tr>)}{!data.subscriptions?.length && <tr><td colSpan="7" className="tags_directory_admin_empty">No hay suscripciones automáticas.</td></tr>}</tbody></table></div>
        <div className="tags_directory_subscription_pagination"><button type="button" disabled={Number(data.page || 1) <= 1} onClick={() => setFilter("page", Number(data.page || 1)-1)}>Anterior</button><span>Página {data.page || 1} de {pages} · {data.total || 0} registros</span><button type="button" disabled={Number(data.page || 1) >= pages} onClick={() => setFilter("page", Number(data.page || 1)+1)}>Siguiente</button></div>
    </section>;
}

function PaymentForm({ data, form, setForm, onSubmit, busy }) {
    const selected = (data.subscriptions || []).find(item => String(item.id) === String(form.subscriptionId));
    return <form onSubmit={onSubmit}>
        <label>Suscripción<select required value={form.subscriptionId} onChange={event => { const item=(data.subscriptions || []).find(entry=>String(entry.id)===event.target.value);setForm({ ...form, subscriptionId:event.target.value,amount:item?.amount||"" }); }}><option value="">Seleccionar suscripción</option>{(data.subscriptions || []).map(item => <option value={item.id} key={item.id}>{item.business_name} · {item.plan_name}</option>)}</select></label>
        {selected && <p className="tags_directory_admin_form_note">Vencimiento actual: {selected.expires_at ? new Date(selected.expires_at).toLocaleDateString("es-AR") : "sin vencimiento"}. El pago extenderá {selected.duration_months || 1} mes(es).</p>}
        <div className="two"><label>Importe<input type="number" min="0.01" step="0.01" required value={form.amount} onChange={event => setForm({ ...form, amount: event.target.value })} /></label><label>Fecha de pago<input type="date" required value={form.paidAt} onChange={event => setForm({ ...form, paidAt: event.target.value })} /></label></div>
        <label>Medio<select value={form.provider} onChange={event => setForm({ ...form, provider: event.target.value })}><option value="manual">Manual</option><option value="transfer">Transferencia</option><option value="cash">Efectivo</option><option value="mercadopago">Mercado Pago</option></select></label>
        <label>Observaciones<textarea value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} /></label>
        <button type="submit" disabled={busy}>Imputar pago</button>
    </form>;
}

function DirectoryPayments({ data, filters, setFilters, onCreate, onConfirm, onCancel }) {
    const pages = Math.max(1, Math.ceil(Number(data.total || 0) / Number(data.pageSize || 20)));
    const setFilter = (field, value) => setFilters(current => ({ ...current, [field]: value, page: field === "page" ? value : 1 }));
    return <section>
        <SectionHead title="Pagos" text="Historial e imputación de pagos correspondientes exclusivamente a planes de Directorio." onAdd={() => onCreate()} addText="Imputar pago" />
        {Boolean(data.pendingSubscriptions?.length) && <div className="tags_directory_pending_payments"><h3>Pagos pendientes sin movimiento previo</h3><p>Suscripciones creadas antes de incorporar el registro contable pendiente.</p>{data.pendingSubscriptions.map(item => <article key={item.subscription_id}><div><strong>{item.business_name}</strong><small>{item.business_email} · {item.plan_name} · {item.duration_months || 1} mes(es)</small></div><div><strong>{item.currency} {Number(item.amount || 0).toLocaleString("es-AR")}</strong><button type="button" onClick={() => onConfirm(item)}>Confirmar pago</button></div></article>)}</div>}
        <div className="tags_directory_subscription_filters"><input value={filters.search} onChange={event => setFilter("search", event.target.value)} placeholder="Buscar negocio o email" /><select value={filters.status} onChange={event => setFilter("status", event.target.value)}><option value="all">Todos los estados</option><option value="approved">Aprobados</option><option value="pending">Pendientes</option><option value="rejected">Rechazados</option><option value="cancelled">Anulados</option></select><select value={filters.provider} onChange={event => setFilter("provider", event.target.value)}><option value="all">Todos los medios</option><option value="manual">Manual</option><option value="transfer">Transferencia</option><option value="cash">Efectivo</option><option value="mercadopago">Mercado Pago</option></select></div>
        <div className="tags_directory_admin_table"><table><thead><tr><th>Fecha</th><th>Negocio</th><th>Plan</th><th>Importe</th><th>Período imputado</th><th>Estado</th><th /></tr></thead><tbody>{(data.payments || []).map(item => <tr key={item.id}><td>{item.paid_at ? new Date(item.paid_at).toLocaleDateString("es-AR") : "—"}</td><td><strong>{item.business_name}</strong><small>{item.business_email}</small></td><td>{item.plan_name}<small>{item.provider}</small></td><td>{item.currency} {Number(item.amount || 0).toLocaleString("es-AR")}</td><td><small>{item.period_start ? new Date(item.period_start).toLocaleDateString("es-AR") : "—"} → {item.period_end ? new Date(item.period_end).toLocaleDateString("es-AR") : "—"}</small></td><td><span className={`tags_directory_payment_status ${item.status}`}>{item.status === "approved" ? "Aprobado" : item.status === "cancelled" ? "Anulado" : item.status}</span></td><td>{item.status !== "cancelled" && <button type="button" className="danger" onClick={() => onCancel(item)}>Anular</button>}</td></tr>)}{!data.payments?.length && <tr><td colSpan="7" className="tags_directory_admin_empty">No hay pagos que coincidan con los filtros.</td></tr>}</tbody></table></div>
        <div className="tags_directory_subscription_pagination"><button type="button" disabled={Number(data.page || 1) <= 1} onClick={() => setFilter("page", Number(data.page || 1) - 1)}>Anterior</button><span>Página {data.page || 1} de {pages} · {data.total || 0} pagos</span><button type="button" disabled={Number(data.page || 1) >= pages} onClick={() => setFilter("page", Number(data.page || 1) + 1)}>Siguiente</button></div>
    </section>;
}

function DirectoryManualPayments({ payments, onConfirm }) {
    return <section>
        <SectionHead title="Pagos pendientes" text="Revisá las altas pagas y confirmá manualmente el pago cuando esté acreditado." />
        <div className="tags_directory_admin_table"><table><thead><tr><th>Negocio</th><th>Plan</th><th>Duración</th><th>Importe</th><th>Vencimiento de espera</th><th /></tr></thead><tbody>
            {payments.map(item => <tr key={item.subscription_id}><td><strong>{item.business_name}</strong><small>{item.business_email}{item.site_name ? ` · ${item.site_name}` : ""}</small></td><td>{item.plan_name}</td><td>{item.duration_months} mes(es)</td><td>{item.currency} {Number(item.amount || 0).toLocaleString("es-AR")}</td><td>{item.expires_at ? new Date(item.expires_at).toLocaleString("es-AR") : "—"}</td><td><button type="button" onClick={() => onConfirm(item)}>Confirmar pago</button></td></tr>)}
            {!payments.length && <tr><td colSpan="6" className="tags_directory_admin_empty">No hay altas pagas pendientes de confirmación.</td></tr>}
        </tbody></table></div>
    </section>;
}

function DirectoryPricing({ pricing, onSave }) {
    const [siteId, setSiteId] = useState("");
    const [currency, setCurrency] = useState("ARS");
    const [forms, setForms] = useState({});
    useEffect(() => {
        if (!siteId && pricing.sites?.length) setSiteId(String(pricing.sites[0].id));
    }, [pricing.sites, siteId]);
    useEffect(() => {
        const next = {};
        (pricing.prices || []).forEach(item => { next[`${item.site_id}:${item.plan_id}`] = { ...item }; });
        setForms(next);
    }, [pricing.prices]);
    const site = pricing.sites?.find(item => String(item.id) === String(siteId));
    const rows = pricing.plans || [];
    function edit(plan) {
        const key = `${siteId}:${plan.id}`;
        setForms(current => ({ ...current, [key]: { ...(current[key] || {}), site_id: siteId, plan_id: plan.id, currency } }));
    }
    function update(plan, field, value) {
        const key = `${siteId}:${plan.id}`;
        setForms(current => ({ ...current, [key]: { ...(current[key] || {}), site_id: siteId, plan_id: plan.id, currency, [field]: value } }));
    }
    return <section>
        <SectionHead title="Planes Directorio" text="Configurá precios manuales por período y el precio mensual de Mercado Pago para cada Directorio." />
        <div className="tags_directory_admin_filters"><select value={siteId} onChange={event => setSiteId(event.target.value)}><option value="">Seleccionar Directorio</option>{(pricing.sites || []).map(item => <option key={item.id} value={item.id}>{item.name} · {item.primary_host}</option>)}</select><input value={currency} onChange={event => setCurrency(event.target.value.toUpperCase().slice(0, 10))} placeholder="Moneda" /></div>
        {!pricing.plans?.length && <p className="tags_directory_admin_empty">Ejecutá primero la migración de planes Directorio en desarrollo.</p>}
        {site && rows.map(plan => { const key = `${siteId}:${plan.id}`; const form = forms[key] || { site_id: siteId, plan_id: plan.id, currency }; return <article className="tags_directory_pricing_card" key={plan.id}><div className="tags_directory_pricing_head"><div><h3>{plan.name}</h3><p>{plan.description}</p></div><button type="button" onClick={() => onSave(form)}>Guardar precios</button></div><div className="tags_directory_pricing_grid">{PRICE_FIELDS.map(([field, label]) => <label key={field}>{label}<input type="number" min="0" step="0.01" value={form[field] ?? ""} onFocus={() => edit(plan)} onChange={event => update(plan, field, event.target.value)} placeholder="0" /></label>)}</div></article>; })}
    </section>;
}
