"use client";

import { useEffect, useMemo, useState } from "react";
import {
    FaArrowDown,
    FaArrowUp,
    FaCheck,
    FaChevronDown,
    FaCog,
    FaExternalLinkAlt,
    FaGlobe,
    FaHome,
    FaLink,
    FaPen,
    FaPowerOff,
    FaQrcode,
    FaWhatsapp
} from "react-icons/fa";
import TagsSpinner from "@/app/components/TagsSpinner";
import showAlert from "@/app/components/showAlert";
import { tagsSiteConfig } from "@/app/config/configSite";
import "./BusinessWorkspaceOverview.css";

const APP_ICONS = {
    directory: FaGlobe,
    portal_public: FaGlobe,
    qr_page: FaQrcode,
    store: FaGlobe,
    resto: FaGlobe,
    turnos: FaGlobe,
    guest_experience: FaGlobe,
    qr_agency: FaQrcode,
    tags_id: FaGlobe,
    client_reviews: FaGlobe
};

const STATUS_LABELS = {
    active: "Activo",
    trial: "Prueba",
    past_due: "Pago pendiente",
    inactive: "Inactivo",
    cancelled: "Cancelado",
    published: "Publicado",
    draft: "Borrador",
    disabled: "Desactivado"
};

const PAGE_TYPE_LABELS = {
    directory: "Web del negocio",
    qr_page: "QR-Page",
    tags_id: "Tags ID",
    store: "Tags Store",
    resto: "Tags Resto",
    turnos: "Tags Turnos",
    client_reviews: "Tags Reviews"
    ,qr_agency: "Tags QR Agency"
};

function statusLabel(value) {
    return STATUS_LABELS[String(value || "").toLowerCase()] || value || "Sin definir";
}

function formatDate(value) {
    if (!value) return "Sin vencimiento";
    return new Date(value).toLocaleDateString("es-AR");
}

async function readPayload(response) {
    const text = await response.text();
    if (!text) return {};
    try {
        return JSON.parse(text);
    } catch {
        return {};
    }
}

export default function BusinessWorkspaceOverview({
    business,
    subscriptionSummary,
    portal,
    portalRoutes = [],
    portalPages = [],
    activeFeatures = [],
    inactiveFeatures = [],
    businessId,
    isAdmin,
    onReloadPortal
}) {
    const [showAvailable, setShowAvailable] = useState(false);
    const [publicBase, setPublicBase] = useState(process.env.NEXT_PUBLIC_BASE_URL_PROD || "");
    const [busy, setBusy] = useState("");
    const [portalSlugOpen, setPortalSlugOpen] = useState(false);
    const [portalSlug, setPortalSlug] = useState(portal?.slug || "");
    const [pageSlugEditor, setPageSlugEditor] = useState(null);
    const [pageSlug, setPageSlug] = useState("");
    const [labels, setLabels] = useState({});

    useEffect(() => setPortalSlug(portal?.slug || ""), [portal?.slug]);
    useEffect(() => setPublicBase(window.location.origin), []);

    useEffect(() => {
        const next = {};
        portalRoutes.forEach((route) => {
            next[route.id] = route.nav_label || route.label || route.page_title || "";
        });
        setLabels(next);
    }, [portalRoutes]);

    const portalFeature = activeFeatures.find((item) => item.key === "portal_public")
        || inactiveFeatures.find((item) => item.key === "portal_public");
    const contractedApps = activeFeatures.filter((item) => item.key !== "portal_public");
    const availableApps = inactiveFeatures.filter((item) => item.key !== "portal_public");
    const portalActive = portal?.status === "published";

    const pageRows = useMemo(() => {
        const routeByPage = new Map(
            portalRoutes.filter((route) => route.page_id).map((route) => [Number(route.page_id), route])
        );
        const rows = portalPages.map((page) => ({
            ...page,
            route: routeByPage.get(Number(page.id)) || null
        }));
        const known = new Set(portalPages.map((page) => Number(page.id)));
        portalRoutes.forEach((route) => {
            if (route.page_id && !known.has(Number(route.page_id))) {
                rows.push({
                    id: route.page_id,
                    title: route.page_title,
                    slug: route.page_slug,
                    page_type: route.page_type,
                    status: route.page_status,
                    qr_code: route.qr_code,
                    qr_label: route.qr_label,
                    route
                });
            }
        });
        return rows.sort((a, b) => {
            const ar = a.route;
            const br = b.route;
            const aIncluded = Number(ar?.is_visible) === 1;
            const bIncluded = Number(br?.is_visible) === 1;
            if (aIncluded !== bIncluded) return aIncluded ? -1 : 1;
            return Number(ar?.sort_order || 9999) - Number(br?.sort_order || 9999);
        });
    }, [portalPages, portalRoutes]);

    const usage = subscriptionSummary?.usage || {};
    const usageItems = [
        ["QR", usage.qrs_used, usage.qrs_total],
        ["QR-Page", usage.qr_pages_used, usage.qr_pages_total],
        ["Tags ID", usage.tags_id_used, usage.tags_id_total],
        ["Tienda", usage.store_used, usage.store_total],
        ["Resto", usage.resto_used, usage.resto_total],
        ["Turnos", usage.turnos_used, usage.turnos_total],
        ["Reseñas", usage.reviews_used, usage.reviews_total]
    ];

    async function reloadPortal() {
        if (onReloadPortal) await onReloadPortal();
    }

    async function changePortalStatus() {
        const nextActive = !portalActive;
        const confirmed = await showAlert({
            title: nextActive ? "¿Activar el Portal?" : "¿Desactivar el Portal?",
            text: nextActive
                ? "La URL principal comenzará a mostrar la Home configurada."
                : "El sitio unificado dejará de estar público. Las páginas y configuraciones no se eliminarán.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: nextActive ? "Activar Portal" : "Desactivar Portal",
            cancelButtonText: "Cancelar"
        });
        if (!confirmed) return;

        setBusy("portal-status");
        try {
            const response = await fetch("/api/portal/admin/status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ businessId, active: nextActive })
            });
            const payload = await readPayload(response);
            if (!response.ok) throw new Error(payload.error || "No se pudo cambiar el estado del Portal");
            await reloadPortal();
            await showAlert({
                title: nextActive ? "Portal activado" : "Portal desactivado",
                icon: "success",
                timer: 1400
            });
        } catch (error) {
            await showAlert({ title: "No se pudo completar", text: error.message, icon: "error" });
        } finally {
            setBusy("");
        }
    }

    async function savePortalSlug() {
        const confirmed = await showAlert({
            title: "¿Cambiar la URL principal?",
            text: "Los enlaces que usen la URL anterior dejarán de dirigir al Portal.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Cambiar URL",
            cancelButtonText: "Cancelar"
        });
        if (!confirmed) return;

        setBusy("portal-slug");
        try {
            const response = await fetch("/api/portal/admin/slug", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ businessId, slug: portalSlug })
            });
            const payload = await readPayload(response);
            if (!response.ok) throw new Error(payload.error || "No se pudo cambiar la URL");
            setPortalSlugOpen(false);
            await reloadPortal();
            await showAlert({ title: "URL principal actualizada", icon: "success", timer: 1400 });
        } catch (error) {
            await showAlert({ title: "No se pudo guardar", text: error.message, icon: "error" });
        } finally {
            setBusy("");
        }
    }

    async function updateRoute(page, changes) {
        if (!portal) return;
        setBusy(`route-${page.id}`);
        try {
            const route = page.route;
            const response = await fetch("/api/portal/admin/routes/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    businessId,
                    portalId: portal.id,
                    routeId: route?.id || null,
                    pageId: page.id,
                    isVisible: changes.isVisible ?? Number(route?.is_visible || 0),
                    showInNav: changes.showInNav ?? Number(route?.show_in_nav || 0),
                    navLabel: changes.navLabel ?? labels[route?.id] ?? route?.nav_label ?? page.title
                })
            });
            const payload = await readPayload(response);
            if (!response.ok) throw new Error(payload.error || "No se pudo actualizar la página");
            await reloadPortal();
        } catch (error) {
            await showAlert({ title: "No se pudo actualizar", text: error.message, icon: "error" });
        } finally {
            setBusy("");
        }
    }

    async function setHome(page) {
        if (!page.route || Number(page.route.is_visible) !== 1) {
            await showAlert({ title: "Página fuera del Portal", text: "Incorporala al sitio antes de definirla como Home.", icon: "info" });
            return;
        }
        const confirmed = await showAlert({
            title: "¿Definir como Home?",
            text: `${page.title || page.slug} será la página inicial del Portal.`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Definir Home",
            cancelButtonText: "Cancelar"
        });
        if (!confirmed) return;

        setBusy(`route-${page.id}`);
        try {
            const response = await fetch("/api/portal/admin/routes/home", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ portalId: portal.id, routeId: page.route.id, businessId })
            });
            const payload = await readPayload(response);
            if (!response.ok) throw new Error(payload.error || "No se pudo definir la Home");
            await reloadPortal();
        } catch (error) {
            await showAlert({ title: "No se pudo completar", text: error.message, icon: "error" });
        } finally {
            setBusy("");
        }
    }

    async function moveRoute(page, direction) {
        if (!page.route) return;
        const ordered = portalRoutes
            .filter((route) => Number(route.is_visible) === 1)
            .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
        const index = ordered.findIndex((route) => Number(route.id) === Number(page.route.id));
        const target = index + direction;
        if (index < 0 || target < 0 || target >= ordered.length) return;
        [ordered[index], ordered[target]] = [ordered[target], ordered[index]];

        setBusy(`route-${page.id}`);
        try {
            const response = await fetch("/api/portal/admin/routes/reorder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ businessId, portalId: portal.id, routeIds: ordered.map((route) => route.id) })
            });
            const payload = await readPayload(response);
            if (!response.ok) throw new Error(payload.error || "No se pudo cambiar el orden");
            await reloadPortal();
        } catch (error) {
            await showAlert({ title: "No se pudo ordenar", text: error.message, icon: "error" });
        } finally {
            setBusy("");
        }
    }

    async function savePageSlug() {
        if (!pageSlugEditor) return;
        const confirmed = await showAlert({
            title: "¿Cambiar la ruta pública?",
            text: "Esta modificación puede afectar enlaces compartidos o posicionados. La instancia seguirá siendo la misma.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Cambiar ruta",
            cancelButtonText: "Cancelar"
        });
        if (!confirmed) return;

        setBusy(`route-${pageSlugEditor.id}`);
        try {
            const response = await fetch("/api/portal/admin/pages/slug", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ businessId, pageId: pageSlugEditor.id, slug: pageSlug, confirmed: true })
            });
            const payload = await readPayload(response);
            if (!response.ok) throw new Error(payload.error || "No se pudo cambiar la ruta");
            setPageSlugEditor(null);
            await reloadPortal();
            await showAlert({ title: "Ruta actualizada", icon: "success", timer: 1300 });
        } catch (error) {
            await showAlert({ title: "No se pudo guardar", text: error.message, icon: "error" });
        } finally {
            setBusy("");
        }
    }

    function openUpgradePlan() {
        const phone = String(tagsSiteConfig.contact.phone || "").replace(/\D/g, "");
        const name = business?.name || subscriptionSummary?.business?.name || "mi negocio";
        const message = encodeURIComponent(`Hola, quiero consultar opciones para mejorar el plan de ${name}.`);
        window.open(`https://wa.me/${phone}?text=${message}`, "_blank", "noopener,noreferrer");
    }

    async function copyPortalUrl() {
        const url = `${publicBase}/${portal.slug}`;
        await navigator.clipboard.writeText(url);
        await showAlert({ title: "URL copiada", text: url, icon: "success", timer: 1300 });
    }

    return (
        <div className="tags_workspace_overview">
            <section className="tags_workspace_account">
                <div className="tags_workspace_account_identity">
                    <span>Mi negocio</span>
                    <h2>{business?.name || subscriptionSummary?.business?.name || "Cliente"}</h2>
                    <p>{business?.email || subscriptionSummary?.business?.email || ""}</p>
                </div>
                <div className="tags_workspace_plan_summary">
                    <div><span>Plan</span><strong>{subscriptionSummary?.plan?.name || "Sin plan"}</strong></div>
                    <div><span>Estado</span><strong className="is_green">{statusLabel(subscriptionSummary?.subscription?.status)}</strong></div>
                    <div><span>Vigencia</span><strong>{formatDate(subscriptionSummary?.subscription?.expires_at)}</strong></div>
                    <div><span>Último pago</span><strong>{subscriptionSummary?.lastPayment ? `${subscriptionSummary.lastPayment.currency} ${Number(subscriptionSummary.lastPayment.amount || 0).toLocaleString("es-AR")}` : "Sin pagos registrados"}</strong></div>
                </div>
                <button type="button" className="tags_workspace_upgrade" onClick={openUpgradePlan}>
                    <FaWhatsapp /> Mejorar Plan
                </button>
                {isAdmin && <span className="tags_workspace_admin_note">Vista administrativa del cliente</span>}
            </section>

            <section className="tags_workspace_usage" aria-label="Consumo del plan">
                {usageItems.map(([label, used, total]) => {
                    const numericTotal = Number(total || 0);
                    const numericUsed = Number(used || 0);
                    const percent = numericTotal > 0 ? Math.min(100, (numericUsed / numericTotal) * 100) : 0;
                    return (
                        <div className="tags_workspace_usage_item" key={label}>
                            <div><span>{label}</span><strong>{numericUsed} de {numericTotal}</strong></div>
                            <span className="tags_workspace_usage_track"><i style={{ width: `${percent}%` }} /></span>
                        </div>
                    );
                })}
            </section>

            <section className={`tags_workspace_portal ${portalActive ? "is_active" : ""}`}>
                <div className="tags_workspace_portal_heading">
                    <div className="tags_workspace_portal_icon"><FaGlobe /></div>
                    <div>
                        <span>Mi sitio público</span>
                        <h2>{portal?.title || "Portal del negocio"}</h2>
                        <p>{portal ? "Unificá la navegación de tus páginas y aplicaciones públicas." : "Activá un sitio único para reunir tus páginas contratadas."}</p>
                    </div>
                </div>

                {portal ? (
                    <>
                        <div className="tags_workspace_portal_status">
                            <span className={portalActive ? "active" : "inactive"}>{statusLabel(portal.status)}</span>
                            <button type="button" className={portalActive ? "danger" : "primary"} disabled={busy === "portal-status"} onClick={changePortalStatus}>
                                {busy === "portal-status" ? <TagsSpinner /> : <FaPowerOff />}
                                {portalActive ? "Desactivar Portal" : "Activar Portal"}
                            </button>
                        </div>

                        <div className="tags_workspace_portal_url">
                            <div>
                                <span>URL principal del negocio</span>
                                <strong>{publicBase}/{portal.slug}</strong>
                                <small>Abre la página definida como Home.</small>
                            </div>
                            <div className="tags_workspace_inline_actions">
                                <button type="button" onClick={copyPortalUrl}><FaLink /> Copiar</button>
                                <button type="button" onClick={() => setPortalSlugOpen(true)}><FaPen /> Cambiar URL</button>
                                {portalActive && <button type="button" onClick={() => window.open(`/${portal.slug}`, "_blank")}><FaExternalLinkAlt /> Ver sitio</button>}
                            </div>
                        </div>

                        <div className="tags_workspace_portal_kpis">
                            <div><span>Home</span><strong>{portalRoutes.find((route) => Number(route.is_home) === 1)?.nav_label || "Sin definir"}</strong></div>
                            <div><span>Páginas incorporadas</span><strong>{portalRoutes.filter((route) => Number(route.is_visible) === 1).length}</strong></div>
                            <div><span>En el menú</span><strong>{portalRoutes.filter((route) => Number(route.is_visible) === 1 && Number(route.show_in_nav) === 1).length}</strong></div>
                        </div>

                        <button type="button" className="tags_workspace_configure_portal" onClick={portalFeature?.onClick}>
                            <FaCog /> Configurar apariencia del Portal
                        </button>
                    </>
                ) : (
                    <button type="button" className="tags_workspace_activate_portal" disabled={!portalFeature?.active} onClick={portalFeature?.onClick}>
                        <FaGlobe /> {portalFeature?.active ? "Activar Portal" : "Portal no contratado"}
                    </button>
                )}
            </section>

            <section className="tags_workspace_section">
                <div className="tags_workspace_section_heading">
                    <div><span>Aplicaciones</span><h2>Mis funcionalidades contratadas</h2></div>
                </div>
                <div className="tags_workspace_apps">
                    {contractedApps.map((feature) => {
                        const Icon = APP_ICONS[feature.key] || FaGlobe;
                        return (
                            <article className="tags_workspace_app" key={feature.key}>
                                <div className="tags_workspace_app_icon"><Icon /></div>
                                <div className="tags_workspace_app_content">
                                    <h3>{feature.title}</h3>
                                    <p>{feature.description}</p>
                                    <span>{feature.status || "Contratado"}</span>
                                </div>
                                <div className="tags_workspace_app_actions">
                                    <button type="button" onClick={feature.onClick}>{feature.actionLabel}</button>
                                    {feature.secondaryActionLabel && feature.onSecondaryClick && <button type="button" className="secondary" onClick={feature.onSecondaryClick}>{feature.secondaryActionLabel}</button>}
                                </div>
                            </article>
                        );
                    })}
                </div>
            </section>

            {portal && (
                <section className="tags_workspace_section">
                    <div className="tags_workspace_section_heading">
                        <div><span>Composición del sitio</span><h2>Páginas y navegación del Portal</h2><p>Incorporá páginas, definí el menú, su orden, la Home y revisá el QR asociado.</p></div>
                    </div>
                    <div className="tags_workspace_pages">
                        <div className="tags_workspace_pages_header">
                            <span>Página</span><span>En el sitio</span><span>En el menú</span><span>Nombre del menú</span><span>Ruta y QR</span><span>Home y orden</span>
                        </div>
                        {pageRows.map((page) => {
                            const route = page.route;
                            const included = Number(route?.is_visible) === 1;
                            const inMenu = included && Number(route?.show_in_nav) === 1;
                            const isHome = Number(route?.is_home) === 1;
                            const rowBusy = busy === `route-${page.id}`;
                            return (
                                <article className={`tags_workspace_page_row ${included ? "included" : ""}`} key={page.id}>
                                    {rowBusy && <div className="tags_workspace_row_busy"><TagsSpinner /></div>}
                                    <div className="tags_workspace_page_identity" data-label="Página">
                                        <strong>{page.title || page.addon_name || PAGE_TYPE_LABELS[page.page_type] || page.page_type}</strong>
                                        <span>{PAGE_TYPE_LABELS[page.page_type] || page.page_type || "Página"}</span>
                                        <small>{statusLabel(page.status)} · /{page.slug}</small>
                                    </div>
                                    <label className="tags_workspace_switch_cell" data-label="En el sitio"><input type="checkbox" checked={included} onChange={(event) => updateRoute(page, { isVisible: event.target.checked ? 1 : 0, showInNav: event.target.checked ? 1 : 0 })} /><span /></label>
                                    <label className="tags_workspace_switch_cell" data-label="En el menú"><input type="checkbox" checked={inMenu} disabled={!included} onChange={(event) => updateRoute(page, { showInNav: event.target.checked ? 1 : 0 })} /><span /></label>
                                    <div className="tags_workspace_menu_name" data-label="Nombre del menú">
                                        <input value={labels[route?.id] ?? route?.nav_label ?? page.title ?? ""} disabled={!route} onChange={(event) => route && setLabels((current) => ({ ...current, [route.id]: event.target.value }))} />
                                        <button type="button" disabled={!route || !included} onClick={() => updateRoute(page, { navLabel: labels[route.id] })}><FaCheck /></button>
                                    </div>
                                    <div className="tags_workspace_route_meta" data-label="Ruta y QR">
                                        <button type="button" className="tags_workspace_slug_button" onClick={() => { setPageSlugEditor(page); setPageSlug(page.slug || ""); }}><span>/p/{page.slug}</span><FaPen /></button>
                                        <small><FaQrcode /> {page.qr_label || page.qr_code || route?.qr_label || route?.qr_code || "Sin QR asociado"}</small>
                                    </div>
                                    <div className="tags_workspace_route_actions" data-label="Home y orden">
                                        <button type="button" className={isHome ? "home active" : "home"} disabled={!included || isHome} onClick={() => setHome(page)}><FaHome /> {isHome ? "Home" : "Hacer Home"}</button>
                                        <button type="button" aria-label="Subir" disabled={!included || !route} onClick={() => moveRoute(page, -1)}><FaArrowUp /></button>
                                        <button type="button" aria-label="Bajar" disabled={!included || !route} onClick={() => moveRoute(page, 1)}><FaArrowDown /></button>
                                    </div>
                                </article>
                            );
                        })}
                        {!pageRows.length && <p className="tags_workspace_empty">Todavía no hay páginas activadas para administrar.</p>}
                    </div>
                </section>
            )}

            {!!availableApps.length && (
                <section className="tags_workspace_available">
                    <button type="button" className="tags_workspace_available_toggle" onClick={() => setShowAvailable((value) => !value)} aria-expanded={showAvailable}>
                        <span>Ver otras funcionalidades disponibles ({availableApps.length})</span>
                        <FaChevronDown className={showAvailable ? "open" : ""} />
                    </button>
                    {showAvailable && <div className="tags_workspace_available_grid">{availableApps.map((feature) => <article key={feature.key}><h3>{feature.title}</h3><p>{feature.description}</p><button type="button" disabled={!feature.active} onClick={feature.onClick}>Consultar funcionalidad</button></article>)}</div>}
                </section>
            )}

            {portalSlugOpen && (
                <div className="tags_workspace_modal_backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setPortalSlugOpen(false)}>
                    <div className="tags_workspace_modal" role="dialog" aria-modal="true" aria-labelledby="portal-slug-title">
                        <button type="button" className="tags_workspace_modal_close" onClick={() => setPortalSlugOpen(false)}>×</button>
                        <h2 id="portal-slug-title">Cambiar URL principal</h2>
                        <p>Esta es la dirección que abre la Home del Portal.</p>
                        <label><span>Ruta pública</span><div className="tags_workspace_slug_input"><strong>/</strong><input value={portalSlug} onChange={(event) => setPortalSlug(event.target.value)} /></div></label>
                        <div className="tags_workspace_modal_actions"><button type="button" className="secondary" onClick={() => setPortalSlugOpen(false)}>Cancelar</button><button type="button" disabled={busy === "portal-slug"} onClick={savePortalSlug}>{busy === "portal-slug" ? <TagsSpinner /> : "Guardar URL"}</button></div>
                    </div>
                </div>
            )}

            {pageSlugEditor && (
                <div className="tags_workspace_modal_backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setPageSlugEditor(null)}>
                    <div className="tags_workspace_modal" role="dialog" aria-modal="true" aria-labelledby="page-slug-title">
                        <button type="button" className="tags_workspace_modal_close" onClick={() => setPageSlugEditor(null)}>×</button>
                        <h2 id="page-slug-title">Ruta de {pageSlugEditor.title || pageSlugEditor.page_type}</h2>
                        <p>La ruta pertenece a esta página y no modifica su contenido ni su QR asociado.</p>
                        <label><span>Ruta pública</span><div className="tags_workspace_slug_input"><strong>/p/</strong><input value={pageSlug} onChange={(event) => setPageSlug(event.target.value)} /></div></label>
                        <div className="tags_workspace_modal_actions"><button type="button" className="secondary" onClick={() => setPageSlugEditor(null)}>Cancelar</button><button type="button" disabled={busy === `route-${pageSlugEditor.id}`} onClick={savePageSlug}>{busy === `route-${pageSlugEditor.id}` ? <TagsSpinner /> : "Guardar ruta"}</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}
