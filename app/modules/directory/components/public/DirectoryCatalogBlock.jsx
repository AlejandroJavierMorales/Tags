"use client";

import { useEffect, useMemo, useState } from "react";
import { FaChevronLeft, FaChevronRight, FaMagnifyingGlass, FaShareNodes, FaWhatsapp, FaXmark } from "react-icons/fa6";
import TagsSelect from "@/app/components/ui/TagsSelect";
import { directoryWhatsappUrl } from "../../lib/directoryPublicFormatting";
import "./DirectoryCatalogBlock.css";

function normalized(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function hasPrice(value) {
  if (value === null || value === undefined || String(value).trim() === "") return false;
  const number = Number(value);
  return Number.isFinite(number) && number > 0;
}

function formatCatalogPrice(value, currency) {
  if (!hasPrice(value)) return "";
  const label = String(currency || "ARS").toUpperCase() === "ARS" ? "$" : String(currency || "").toUpperCase() === "USD" ? "US$" : String(currency || "").toUpperCase();
  return `${label} ${Number(value).toLocaleString("es-AR", { maximumFractionDigits: 2 })}`;
}

function productImages(product) {
  const images = (Array.isArray(product.images_json) ? product.images_json : []).filter(item => item?.url).slice(0, 12);
  if (!images.length && product.image_url) images.push({ url: product.image_url, alt: product.title });
  return images;
}

async function shareProduct(product) {
  const url = window.location.href.split("#")[0] + "#catalog-product-" + product.id;
  if (navigator.share) await navigator.share({ title: product.title, text: product.description || product.title, url }).catch(() => null);
  else await navigator.clipboard?.writeText(url).catch(() => null);
}

function ProductCard({ product, page, onDetail }) {
  const images = productImages(product);
  const [active, setActive] = useState(0);
  const message = product.whatsapp_text || "Hola, quiero consultar por " + product.title;
  const whatsapp = directoryWhatsappUrl(page?.whatsapp || page?.phone, message);

  return <article className="tags_directory_catalog_product" id={"catalog-product-" + product.id}>
    {images.length > 0 && <div className="tags_directory_catalog_media">
      <img src={images[active]?.url} alt={images[active]?.alt || product.title} loading="lazy" />
      {images.length > 1 && <>
        <button type="button" className="prev" onClick={() => setActive(index => (index - 1 + images.length) % images.length)} aria-label="Imagen anterior"><FaChevronLeft /></button>
        <button type="button" className="next" onClick={() => setActive(index => (index + 1) % images.length)} aria-label="Imagen siguiente"><FaChevronRight /></button>
        <small>{active + 1}/{images.length}</small>
      </>}
    </div>}
    <div className="tags_directory_catalog_body">
      <span>{product.category || "General"}</span>
      <h3>{product.title}</h3>
      {product.description && <p>{product.description}</p>}
      {hasPrice(product.price) && <strong>{formatCatalogPrice(product.price, product.currency)}</strong>}
      <div className="tags_directory_catalog_actions">
        <button type="button" className="detail" onClick={() => onDetail(product)} aria-label={"Ver detalle de " + product.title} title="Ver detalle"><FaMagnifyingGlass /><span>Ver detalle</span></button>
        {whatsapp && <a href={whatsapp} target="_blank" rel="noreferrer" aria-label={"Consultar " + product.title + " por WhatsApp"} title="Consultar por WhatsApp"><FaWhatsapp /></a>}
        <button type="button" onClick={() => shareProduct(product)} aria-label={"Compartir " + product.title} title="Compartir producto"><FaShareNodes /></button>
      </div>
    </div>
  </article>;
}

function ProductDetailModal({ product, page, onClose }) {
  const images = productImages(product);
  const [active, setActive] = useState(0);
  const message = product.whatsapp_text || "Hola, quiero consultar por " + product.title;
  const whatsapp = directoryWhatsappUrl(page?.whatsapp || page?.phone, message);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = event => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  return <div className="tags_directory_catalog_modal_overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="tags_directory_catalog_modal" role="dialog" aria-modal="true" aria-labelledby={"catalog-modal-title-" + product.id}>
      <header>
        <div><span>{product.category || "General"}</span><h2 id={"catalog-modal-title-" + product.id}>{product.title}</h2></div>
        <button type="button" onClick={onClose} aria-label="Cerrar detalle"><FaXmark /></button>
      </header>
      <div className="tags_directory_catalog_modal_body">
        {images.length > 0 && <div className="tags_directory_catalog_modal_gallery">
          <div className="main">
            <img src={images[active]?.url} alt={images[active]?.alt || product.title} />
            {images.length > 1 && <>
              <button type="button" className="prev" onClick={() => setActive(index => (index - 1 + images.length) % images.length)} aria-label="Imagen anterior"><FaChevronLeft /></button>
              <button type="button" className="next" onClick={() => setActive(index => (index + 1) % images.length)} aria-label="Imagen siguiente"><FaChevronRight /></button>
            </>}
          </div>
          {images.length > 1 && <div className="thumbs">{images.map((image, index) =>
            <button type="button" className={index === active ? "active" : ""} onClick={() => setActive(index)} key={image.url + "-" + index}>
              <img src={image.url} alt={image.alt || product.title + " " + (index + 1)} />
            </button>
          )}</div>}
        </div>}
        <div className="tags_directory_catalog_modal_info">
          {product.description && <p>{product.description}</p>}
          {(product.old_price || product.discount_label) && <div className="offer">
            {hasPrice(product.old_price) && <del>{formatCatalogPrice(product.old_price, product.currency)}</del>}
            {product.discount_label && <em>{product.discount_label}</em>}
          </div>}
          {hasPrice(product.price) && <strong>{formatCatalogPrice(product.price, product.currency)}</strong>}
          <div className="actions">
            {whatsapp && <a href={whatsapp} target="_blank" rel="noreferrer"><FaWhatsapp /><span>Consultar por WhatsApp</span></a>}
            <button type="button" onClick={() => shareProduct(product)}><FaShareNodes /><span>Compartir</span></button>
          </div>
        </div>
      </div>
    </section>
  </div>;
}

export default function DirectoryCatalogBlock({ products = [], page, content = {}, styles = {} }) {
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [detailProduct, setDetailProduct] = useState(null);
  const visible = products.filter(product => Number(product.is_visible));
  const categories = useMemo(() => [...new Set(visible.map(product => String(product.category || "General").trim()).filter(Boolean))], [products]);
  const filtered = visible.filter(product => (category === "all" || String(product.category || "General") === category) && (!query || normalized(product.title + " " + product.category + " " + product.description).includes(normalized(query))));
  if (!visible.length) return null;

  return <div className="tags_directory_catalog" style={{ textAlign: styles.alignment || "left" }}>
    <header>
      {content.eyebrow !== "" && <span>{content.eyebrow || "CATÁLOGO"}</span>}
      {content.title !== "" && <h2 style={styles.typography?.title || {}}>{content.title || "Productos y servicios"}</h2>}
      {content.subtitle && <h3 style={styles.typography?.subtitle || {}}>{content.subtitle}</h3>}
      {content.highlightedText && <p className="highlight" style={styles.typography?.highlight || {}}>{content.highlightedText}</p>}
      {Array.isArray(content.paragraphs) && content.paragraphs.filter(Boolean).map((paragraph, index) => <p style={styles.typography?.text || {}} key={index}>{paragraph}</p>)}
    </header>
    <div className="tags_directory_catalog_filters">
      <label><FaMagnifyingGlass /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={content.searchPlaceholder || "Buscar por producto o categoría"} /></label>
      {categories.length > 1 && <TagsSelect value={category} onChange={setCategory} className="tags_directory_catalog_category_select" placeholder="Seleccionar categoría" options={[{ value: "all", label: content.allCategoriesLabel || "Todos" }, ...categories.map(item => ({ value: item, label: item }))]} />}
    </div>
    {filtered.length
      ? <div className="tags_directory_catalog_grid">{filtered.map(product => <ProductCard product={product} page={page} onDetail={setDetailProduct} key={product.id} />)}</div>
      : <p className="tags_directory_catalog_empty">No encontramos productos para esa búsqueda.</p>}
    {detailProduct && <ProductDetailModal product={detailProduct} page={page} onClose={() => setDetailProduct(null)} />}
  </div>;
}
