"use client";

import { useEffect, useState } from "react";
import { FaArrowUpRightDots, FaFloppyDisk, FaLocationDot, FaWhatsapp } from "react-icons/fa6";
import MediaUploader from "@/app/components/MediaUploader";
import TagsSpinner from "@/app/components/TagsSpinner";
import showAlert from "@/app/components/showAlert";
import "./BasicDirectoryProfile.css";

async function readPayload(response) {
  const text = await response.text();
  try { return text ? JSON.parse(text) : {}; } catch { return {}; }
}

function taxonomyLabel(item, all) {
  const byId = new Map(all.map(node => [String(node.id), node]));
  const labels = [];
  let current = item;
  while (current) {
    labels.unshift(current.name);
    current = current.parent_id ? byId.get(String(current.parent_id)) : null;
  }
  return labels.join(" › ");
}

export default function BasicDirectoryProfile({ businessId, planName }) {
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(true);
  const update = (field, value) => setForm(current => ({ ...current, [field]: value }));
  const taxonomy = data?.taxonomy || [];
  const taxonomyLeaves = taxonomy.filter(item => Number(item.is_leaf) === 1).sort((a, b) => taxonomyLabel(a, taxonomy).localeCompare(taxonomyLabel(b, taxonomy), "es"));
  const updateTaxonomy = (index, value) => setForm(current => {
    const taxonomyIds = [...(current.taxonomyIds || [])];
    taxonomyIds[index] = value;
    return { ...current, taxonomyIds: taxonomyIds.filter(Boolean) };
  });

  async function load() {
    setBusy(true);
    try {
      const response = await fetch(`/api/directory/client/basic-profile?businessId=${businessId}`, { cache: "no-store" });
      const result = await readPayload(response);
      if (!response.ok) throw new Error(result.error || "No se pudo cargar la ficha");
      setData(result);
      setForm(result.profile);
    } catch (error) {
      await showAlert({ title: "No se pudo cargar", text: error.message, icon: "error" });
    } finally { setBusy(false); }
  }

  useEffect(() => { load(); }, [businessId]);

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch("/api/directory/client/basic-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, ...form })
      });
      const result = await readPayload(response);
      if (!response.ok) throw new Error(result.error || "No se pudieron guardar los cambios");
      setData(result);
      setForm(result.profile);
      await showAlert({ title: "Ficha actualizada", text: "Los cambios ya están disponibles en el Directorio.", icon: "success", timer: 1600 });
    } catch (error) {
      await showAlert({ title: "No se pudo guardar", text: error.message, icon: "error" });
    } finally { setBusy(false); }
  }

  if (busy && !form) return <main className="tags_basic_profile_loading"><TagsSpinner /></main>;
  if (!form) return null;

  return <main className="tags_basic_profile_page">
    <section className="tags_basic_profile_upgrade">
      <div><span>PLAN {planName || "BASIC"}</span><h1>Tu Negocio ya forma parte de {data?.directoryName || "la plataforma"}</h1><p>Actualizá tu suscripción. Generamos la página web de tu negocio, cargá tu catálogo de productos y creamos y optimizamos tu Perfil de Empresa en Google Maps.</p><strong>¡Vendé y hacete visible en Internet!</strong></div>
      <a href={`https://wa.me/5493546562855?text=${encodeURIComponent("Hola, quiero actualizar mi Plan Basic y conocer las herramientas para mi negocio")}`} target="_blank" rel="noreferrer"><FaArrowUpRightDots /> Actualizar mi suscripción</a>
    </section>
    <section className="tags_basic_profile_card">
      <header><div><small>FICHA GRATUITA</small><h2>Datos visibles de tu negocio</h2><p>Estos datos se muestran en tu tarjeta dentro del Directorio.</p></div>{data?.publicUrl && <a href={data.publicUrl} target="_blank" rel="noreferrer">Ver publicación</a>}</header>
      <form onSubmit={save}>
        <div className="tags_basic_profile_logo"><span>Logo</span><MediaUploader businessId={businessId} value={form.logoUrl || ""} module="directory" variant="logo" entityId={businessId} accept="image/*" label="Cargar o cambiar logo" onChange={media => update("logoUrl", media?.url || "")} /></div>
        <label>Email de acceso<input type="email" required value={form.email || ""} onChange={event => update("email", event.target.value)} /><small>Este email también se utiliza para ingresar a la plataforma.</small></label>
        <label>Teléfono<input type="tel" value={form.phone || ""} onChange={event => update("phone", event.target.value)} placeholder="Ej.: 3546 778899" /></label>
        <label><FaWhatsapp /> WhatsApp<input type="tel" value={form.whatsapp || ""} onChange={event => update("whatsapp", event.target.value)} placeholder="Ej.: 3546 778899" /></label>
        <label className="is_wide">Descripción<textarea required maxLength="1000" value={form.description || ""} onChange={event => update("description", event.target.value)} /></label>
        <label className="is_wide"><FaLocationDot /> Domicilio<input value={form.address || ""} onChange={event => update("address", event.target.value)} /></label>
        <label>Localidad<select required value={form.placeId || ""} onChange={event => update("placeId", event.target.value)}><option value="">Seleccioná una localidad</option>{(data?.places || []).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <div className="tags_basic_profile_taxonomy">
          {[0, 1, 2].map(index => <label key={index}>{index === 0 ? "Rubro principal" : `Rubro adicional ${index}`}
            <select required={index === 0} value={form.taxonomyIds?.[index] || ""} onChange={event => updateTaxonomy(index, event.target.value)}>
              <option value="">{index === 0 ? "Seleccioná un rubro" : "Sin asignar"}</option>
              {taxonomyLeaves.map(item => <option key={item.id} value={item.id} disabled={(form.taxonomyIds || []).some((selected, selectedIndex) => selectedIndex !== index && String(selected) === String(item.id))}>{taxonomyLabel(item, taxonomy)}</option>)}
            </select>
          </label>)}
          <small>Podés asignar hasta tres rubros. El primero será el principal.</small>
        </div>
        <div className="tags_basic_profile_coordinates"><label>Latitud<input type="number" step="any" value={form.latitude ?? ""} onChange={event => update("latitude", event.target.value)} /></label><label>Longitud<input type="number" step="any" value={form.longitude ?? ""} onChange={event => update("longitude", event.target.value)} /></label></div>
        <button type="submit" disabled={busy}><FaFloppyDisk /> {busy ? "Guardando…" : "Guardar cambios"}</button>
      </form>
    </section>
  </main>;
}
