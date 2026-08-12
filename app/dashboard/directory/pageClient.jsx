"use client";

import { useEffect, useState } from "react";
import { FaBuilding, FaFolderTree, FaGlobe, FaLocationDot, FaPen, FaPlus, FaTrash } from "react-icons/fa6";
import TagsSpinner from "@/app/components/TagsSpinner";
import MediaUploader from "@/app/components/MediaUploader";
import showAlert from "@/app/components/showAlert";
import "./directoryAdmin.css";

const EMPTY_SITE = { name: "", code: "", primaryHost: "", territoryPlaceId: "", isActive: true };
const EMPTY_TAXONOMY = { parentId: "", name: "", slug: "", imageUrl: "", description: "", sortOrder: 0, isActive: true };
const EMPTY_PLACE = { parentId: "", placeType: "locality", name: "", slug: "", countryCode: "AR", latitude: "", longitude: "", isActive: true };
const EMPTY_LISTING = { listingId: "", businessId: "", slug: "", siteIds: [], lockedSiteIds: [], taxonomyIds: [], placeId: "", isPublished: false };
const PLACE_TYPES = [["country", "País"], ["province", "Provincia"], ["state", "Estado"], ["department", "Departamento"], ["region", "Región"], ["valley", "Valle"], ["locality", "Localidad"], ["neighborhood", "Barrio"], ["other", "Otro"]];
const placeTypeLabel = value => PLACE_TYPES.find(item => item[0] === value)?.[1] || value;

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
    const [tab, setTab] = useState("listings");
    const [busy, setBusy] = useState(false);
    const [modal, setModal] = useState(null);
    const [form, setForm] = useState({});

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

    useEffect(() => { load(); }, []);

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

    function openEntity(entity, item = null) {
        if (entity === "site") {
            const config = parseConfig(item?.directory_config);
            setForm(item ? { id: item.id, name: item.name, code: item.code, primaryHost: item.primary_host, territoryPlaceId: config.territoryPlaceId || "", isActive: Boolean(Number(item.is_active)) } : EMPTY_SITE);
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

    const tabs = [
        ["listings", FaBuilding, "Clientes y fichas"],
        ["sites", FaGlobe, "Directorios"],
        ["taxonomy", FaFolderTree, "Rubros"],
        ["places", FaLocationDot, "Ubicaciones"]
    ];

    return <main className="tags_directory_admin">
        <header><div><span>ADMINISTRACIÓN DE PLATAFORMA</span><h1><FaGlobe />Directorios</h1><p>Canales, clientes, rubros y ubicación.</p></div></header>
        <nav>{tabs.map(([key, Icon, label]) => <button type="button" className={tab === key ? "active" : ""} onClick={() => setTab(key)} key={key}><Icon />{label}</button>)}</nav>
        {busy && <div className="tags_directory_admin_busy"><TagsSpinner /></div>}

        {tab === "listings" && <section>
            <SectionHead title="Clientes y fichas" text="Vinculá un cliente Tags con su Web y uno o varios Directorios." onAdd={() => openListing()} addText="Asignar cliente" />
            <div className="tags_directory_admin_table"><table><thead><tr><th>Cliente/Ficha</th><th>Estado</th><th>Directorios y rutas</th><th /></tr></thead><tbody>
                {data.listings.map(item => <tr key={item.id}><td><strong>{item.display_name}</strong><small>{item.business_email || "Sin cliente Tags vinculado"}</small></td><td>{item.qr_page_id ? "Web activada" : Number(item.is_free) === 1 ? "Tarjeta gratuita" : item.status}</td><td>{String(item.channels || "").split(";;").filter(Boolean).map(value => <span key={value}>{value.replace("|", " · /")}</span>)}</td><td><button type="button" onClick={() => openListing(item)} title="Editar asignación"><FaPen /></button></td></tr>)}
            </tbody></table></div>
        </section>}

        {tab === "sites" && <EntitySection title="Directorios o canales" text="Cada canal define su territorio y dominio público." items={data.sites} onAdd={() => openEntity("site")} render={item => <><div><strong>{item.name}</strong><small>{item.code} · {item.primary_host}</small></div><Actions onEdit={() => openEntity("site", item)} onDelete={() => remove("site", item)} /></>} />}
        {tab === "taxonomy" && <EntitySection title="Rubros" text="Árbol global de rubros disponible para todos los Directorios." items={data.taxonomy} onAdd={() => openEntity("taxonomy")} render={item => <><div style={{ paddingLeft: `${Math.min(Number(item.depth), 5) * 14}px` }}><strong>{item.name}</strong><small>{item.parent_name ? `${item.parent_name} · ` : ""}{item.listing_count} fichas</small></div><Actions onEdit={() => openEntity("taxonomy", item)} onDelete={() => remove("taxonomy", item)} /></>} />}
        {tab === "places" && <EntitySection title="Países, provincias, regiones y localidades" text="Ubicación jerárquica de los clientes." items={data.places} onAdd={() => openEntity("place")} render={item => <><div><strong>{item.name}</strong><small>{placeTypeLabel(item.place_type)}{item.parent_name ? ` · ${item.parent_name}` : ""} · {item.listing_count} fichas</small></div><Actions onEdit={() => openEntity("place", item)} onDelete={() => remove("place", item)} /></>} />}

        {modal && <div className="tags_directory_admin_overlay"><div className="tags_directory_admin_modal">
            <button type="button" className="close" onClick={() => setModal(null)}>×</button>
            <h2>{form.id || form.listingId ? "Editar" : "Crear"} {modal === "listing" ? "asignación" : modal === "site" ? "Directorio" : modal === "taxonomy" ? "rubro" : "ubicación"}</h2>
            {modal === "listing" ? <ListingForm data={data} form={form} setForm={setForm} toggleArray={toggleArray} onSubmit={listingSubmit} busy={busy} /> : <EntityForm modal={modal} data={data} form={form} setForm={setForm} onSubmit={entitySubmit} busy={busy} />}
        </div></div>}
    </main>;
}

function SectionHead({ title, text, onAdd, addText = "Agregar" }) {
    return <div className="tags_directory_admin_section_head"><div><h2>{title}</h2><p>{text}</p></div><button type="button" onClick={onAdd}><FaPlus />{addText}</button></div>;
}

function EntitySection({ title, text, items, onAdd, render }) {
    return <section><SectionHead title={title} text={text} onAdd={onAdd} /><div className="tags_directory_admin_rows">{items.map(item => <article key={item.id}>{render(item)}</article>)}</div></section>;
}

function Actions({ onEdit, onDelete }) {
    return <div className="actions"><button type="button" onClick={onEdit} title="Editar"><FaPen /></button><button type="button" onClick={onDelete} className="danger" title="Eliminar"><FaTrash /></button></div>;
}

function ListingForm({ data, form, setForm, toggleArray, onSubmit, busy }) {
    return <form onSubmit={onSubmit}>
        <label>Cliente Tags<select required value={form.businessId} onChange={event => setForm({ ...form, businessId: event.target.value })}><option value="">Seleccionar</option>{data.businesses.map(item => <option value={item.id} key={item.id}>{item.name} · {item.email}</option>)}</select></label>
        <label>Ficha migrada o existente<select value={form.listingId} onChange={event => setForm({ ...form, listingId: event.target.value })}><option value="">Crear ficha nueva</option>{data.listings.filter(item => !item.business_id || String(item.business_id) === String(form.businessId)).map(item => <option value={item.id} key={item.id}>{item.display_name}</option>)}</select></label>
        <label>Slug para fichas nuevas<input value={form.slug} onChange={event => setForm({ ...form, slug: event.target.value })} placeholder="nombre-del-negocio" /><small>Las rutas históricas existentes no se reemplazan.</small></label>
        <fieldset><legend>Directorios</legend>{data.sites.map(item => { const locked=(form.lockedSiteIds||[]).includes(String(item.id));return <label className="check" key={item.id}><input type="checkbox" disabled={locked} checked={(form.siteIds || []).includes(String(item.id))} onChange={() => toggleArray("siteIds", item.id)} />{item.name}{locked ? " · ruta conservada" : ""}</label>; })}<small>Las rutas ya asignadas se conservan; podés sumar nuevos Directorios.</small></fieldset>
        <label>Ubicación<select value={form.placeId} onChange={event => setForm({ ...form, placeId: event.target.value })}><option value="">Sin ubicación</option>{data.places.map(item => <option value={item.id} key={item.id}>{item.name} · {placeTypeLabel(item.place_type)}</option>)}</select></label>
        <fieldset><legend>Rubros globales</legend><div className="tags_directory_admin_checks">{data.taxonomy.map(item => <label className="check" key={item.id}><input type="checkbox" checked={(form.taxonomyIds || []).includes(String(item.id))} onChange={() => toggleArray("taxonomyIds", item.id)} />{item.name}</label>)}</div></fieldset>
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
