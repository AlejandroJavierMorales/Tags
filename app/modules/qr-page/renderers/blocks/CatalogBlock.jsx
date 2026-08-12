"use client";

import { useMemo, useState } from "react";
import { FaChevronLeft, FaChevronRight, FaMagnifyingGlass, FaShareNodes, FaWhatsapp } from "react-icons/fa6";
import TagsSelect from "@/app/components/ui/TagsSelect";
import getTypographyStyle from "../../lib/getTypographyStyle";
import "./CatalogBlock.css";

function normalizeWhatsapp(value) {
    let digits = String(value || "").replace(/\D/g, "");
    if (!digits) return "";
    if (digits.startsWith("00")) digits = digits.slice(2);
    if (!digits.startsWith("54")) digits = `54${digits.replace(/^0/, "")}`;
    return digits;
}

function productImages(product) {
    const images = Array.isArray(product.images_json) ? product.images_json.filter(image => image?.url).slice(0, 12) : [];
    return images.length ? images : (product.image_url ? [{ url: product.image_url, alt: product.title }] : []);
}

function ProductCard({ product, page, styles }) {
    const [active, setActive] = useState(0);
    const images = productImages(product);
    const phone = normalizeWhatsapp(page?.whatsapp || page?.phone);
    const message = product.whatsapp_text || `Hola, quiero consultar por ${product.title}`;
    const whatsappUrl = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : "";

    async function share() {
        const url = `${window.location.href.split("#")[0]}#qr-catalog-product-${product.id}`;
        if (navigator.share) {
            await navigator.share({ title: product.title, text: product.description || product.title, url }).catch(() => null);
            return;
        }
        await navigator.clipboard?.writeText(url).catch(() => null);
    }

    return <article className="tags_qr_catalog_product" id={`qr-catalog-product-${product.id}`}>
        {images.length > 0 && <div className="tags_qr_catalog_media">
            <img src={images[active]?.url} alt={images[active]?.alt || product.title} loading="lazy" />
            {images.length > 1 && <><button type="button" className="previous" onClick={() => setActive(index => (index - 1 + images.length) % images.length)} aria-label="Imagen anterior"><FaChevronLeft /></button><button type="button" className="next" onClick={() => setActive(index => (index + 1) % images.length)} aria-label="Imagen siguiente"><FaChevronRight /></button><small>{active + 1}/{images.length}</small></>}
        </div>}
        <div className="tags_qr_catalog_body">
            <span>{product.category || "General"}</span>
            <h3 style={getTypographyStyle(styles, "title")}>{product.title}</h3>
            {product.description && <p style={getTypographyStyle(styles, "text")}>{product.description}</p>}
            {(product.old_price || product.discount_label) && <div className="tags_qr_catalog_offer">{product.old_price && <del style={getTypographyStyle(styles, "oldPrice")}>{product.currency || "ARS"} {product.old_price}</del>}{product.discount_label && <em style={getTypographyStyle(styles, "meta")}>{product.discount_label}</em>}</div>}
            {product.price !== null && product.price !== undefined && product.price !== "" && <strong style={getTypographyStyle(styles, "price")}>{product.currency || "ARS"} {product.price}</strong>}
            <div className="tags_qr_catalog_actions">{whatsappUrl && <a href={whatsappUrl} target="_blank" rel="noreferrer" aria-label={`Consultar ${product.title} por WhatsApp`} title="Consultar por WhatsApp"><FaWhatsapp /></a>}<button type="button" onClick={share} aria-label={`Compartir ${product.title}`} title="Compartir producto"><FaShareNodes /></button></div>
        </div>
    </article>;
}

export default function CatalogBlock({ products = [], productCategory = "all", content = {}, page, styles = {} }) {
    const [query, setQuery] = useState("");
    const [category, setCategory] = useState("all");
    const selectedCategory = content.category || content.productCategory || productCategory || "all";
    const visibleProducts = useMemo(() => products.filter(product => Number(product.is_visible) !== 0 && (selectedCategory === "all" || (product.category || "products") === selectedCategory)), [products, selectedCategory]);
    const categories = useMemo(() => [...new Set(visibleProducts.map(product => String(product.category || "General").trim()).filter(Boolean))], [visibleProducts]);
    const filtered = useMemo(() => {
        const term = query.trim().toLocaleLowerCase("es");
        return visibleProducts.filter(product => (category === "all" || String(product.category || "General") === category) && (!term || `${product.title || ""} ${product.description || ""} ${product.category || ""}`.toLocaleLowerCase("es").includes(term)));
    }, [visibleProducts, category, query]);
    if (!visibleProducts.length) return null;
    const paragraphs = Array.isArray(content.paragraphs) ? content.paragraphs.filter(Boolean) : [];
    const showHeader = content.eyebrow !== "" || content.title !== "" || content.subtitle || content.highlightedText || paragraphs.length;

    return <section className="tags_qr_catalog" style={{ textAlign: styles.alignment || "left" }}>
        {showHeader && <header>{content.eyebrow !== "" && <span>{content.eyebrow || "CATÁLOGO"}</span>}{content.title !== "" && <h2>{content.title || "Productos y servicios"}</h2>}{content.subtitle && <h3>{content.subtitle}</h3>}{content.highlightedText && <p className="highlight">{content.highlightedText}</p>}{paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</header>}
        <div className="tags_qr_catalog_filters"><label><FaMagnifyingGlass /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={content.searchPlaceholder || "Buscar por producto o categoría"} /></label>{selectedCategory === "all" && categories.length > 1 && <TagsSelect value={category} onChange={setCategory} className="tags_qr_catalog_category_select" placeholder="Seleccionar categoría" options={[{ value: "all", label: content.allCategoriesLabel || "Todos" }, ...categories.map(item => ({ value: item, label: item }))]} />}</div>
        {filtered.length ? <div className="tags_qr_catalog_grid">{filtered.map(product => <ProductCard product={product} page={page} styles={styles} key={product.id} />)}</div> : <p className="tags_qr_catalog_empty">No encontramos productos para esa búsqueda.</p>}
    </section>;
}
