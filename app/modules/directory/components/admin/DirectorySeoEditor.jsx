"use client";

import { useEffect, useState } from "react";
import { FaGoogle, FaImage, FaShareNodes } from "react-icons/fa6";
import MediaUploader from "@/app/components/MediaUploader";
import TagsSpinner from "@/app/components/TagsSpinner";
import showAlert from "@/app/components/showAlert";
import "./DirectorySeoEditor.css";

export default function DirectorySeoEditor({ businessId, page, business, publicUrl, onReload }) {
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => setForm({
    seoTitle: page?.seo_title || "",
    seoDescription: page?.seo_description || "",
    seoKeywords: page?.seo_keywords || "",
    seoImageUrl: page?.seo_image_og_url || page?.seo_image_url || "",
    robotsIndex: page?.robots_index == null ? true : Number(page.robots_index) === 1,
    robotsFollow: page?.robots_follow == null ? true : Number(page.robots_follow) === 1
  }), [page]);
  const set = (field, value) => setForm(current => ({ ...current, [field]: value }));
  const previewTitle = form.seoTitle || business?.display_name || business?.name || "Nombre del negocio";
  const previewDescription = form.seoDescription || business?.description || "Descripción pública del negocio.";
  const previewUrl = publicUrl || `/${page?.slug || "mi-negocio"}`;

  async function save() {
    setBusy(true);
    try {
      const response = await fetch("/api/directory/client/seo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, pageId: page.id, ...form }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "No se pudo guardar el SEO");
      await onReload();
      await showAlert({ title: "SEO actualizado", text: "Los metadatos públicos fueron guardados.", icon: "success", timer: 1400 });
    } catch (error) {
      await showAlert({ title: "No se pudo guardar", text: error.message, icon: "error" });
    } finally { setBusy(false); }
  }

  return <div className="tags_directory_seo">
    {busy && <div className="tags_directory_seo_busy"><TagsSpinner /></div>}
    <header><div><span>POSICIONAMIENTO</span><h2>SEO de la Web</h2><p>Configurá cómo se presenta esta página en Google y cuando se comparte.</p></div><button type="button" onClick={save}>Guardar SEO</button></header>
    <div className="tags_directory_seo_grid">
      <section><h3>Información para buscadores</h3><label>Título SEO <small>{String(form.seoTitle || "").length}/60</small><input value={form.seoTitle || ""} maxLength={255} onChange={event => set("seoTitle", event.target.value)} placeholder={business?.display_name || business?.name || "Nombre del negocio"} /></label><label>Descripción SEO <small>{String(form.seoDescription || "").length}/160</small><textarea value={form.seoDescription || ""} maxLength={500} onChange={event => set("seoDescription", event.target.value)} placeholder="Explicá claramente qué ofrece el negocio y dónde se encuentra." /></label><label>Palabras y frases relacionadas<textarea value={form.seoKeywords || ""} maxLength={1000} onChange={event => set("seoKeywords", event.target.value)} placeholder="asesoría previsional, jubilaciones, moratorias, Villa General Belgrano" /><small>Separalas con comas. También ayudan a las búsquedas internas de la plataforma.</small></label><div className="tags_directory_seo_checks"><label><input type="checkbox" checked={form.robotsIndex !== false} onChange={event => set("robotsIndex", event.target.checked)} />Permitir que Google indexe esta página</label><label><input type="checkbox" checked={form.robotsFollow !== false} onChange={event => set("robotsFollow", event.target.checked)} />Permitir que siga sus enlaces</label></div></section>
      <section><h3>Imagen para compartir</h3><p>Se utiliza al compartir la Web en redes y servicios compatibles.</p><MediaUploader businessId={businessId} value="" module="qr-page" variant="hero" entityId={page?.id} accept="image/*" label={form.seoImageUrl ? "Cambiar imagen" : "Cargar imagen"} onChange={media => { if (media?.url) set("seoImageUrl", media.url); }} />{form.seoImageUrl ? <div className="tags_directory_seo_image"><img src={form.seoImageUrl} alt="Vista previa para compartir" /><button type="button" onClick={() => set("seoImageUrl", "")}>Quitar imagen</button></div> : <div className="tags_directory_seo_image_empty"><FaImage /><span>Recomendado: imagen horizontal de 1200 × 630 px.</span></div>}</section>
    </div>
    <section className="tags_directory_seo_previews"><div><h3><FaGoogle /> Vista previa en Google</h3><article className="is_google"><small>{previewUrl}</small><strong>{previewTitle}</strong><p>{previewDescription}</p></article></div><div><h3><FaShareNodes /> Vista previa al compartir</h3><article className="is_social">{form.seoImageUrl && <img src={form.seoImageUrl} alt="" />}<div><small>{previewUrl}</small><strong>{previewTitle}</strong><p>{previewDescription}</p></div></article></div></section>
  </div>;
}
