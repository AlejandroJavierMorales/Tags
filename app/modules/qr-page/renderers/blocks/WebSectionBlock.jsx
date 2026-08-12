"use client";

import { useState } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import "./WebSectionBlock.css";

export default function WebSectionBlock({ content = {} }) {
    const [active, setActive] = useState(0);
    const paragraphs = Array.isArray(content.paragraphs) ? content.paragraphs.filter(Boolean) : [];
    const images = Array.isArray(content.images) ? content.images.filter(item => item?.url).slice(0, 10) : [];
    const carousel = content.imageLayout === "carousel";
    return <div className="tags_qr_web_section_block">
        {(content.title || content.subtitle) && <header>{content.title && <h2>{content.title}</h2>}{content.subtitle && <h3>{content.subtitle}</h3>}</header>}
        {content.highlightedText && <p className="tags_qr_web_section_highlight">{content.highlightedText}</p>}
        {paragraphs.length > 0 && <div className="tags_qr_web_section_paragraphs">{paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>}
        {images.length > 0 && (carousel
            ? <div className="tags_qr_web_section_carousel"><img src={images[active]?.url} alt={images[active]?.alt || `${content.title || "Sección"} ${active + 1}`} />{images.length > 1 && <><button type="button" className="is_previous" onClick={() => setActive(index => (index - 1 + images.length) % images.length)} aria-label="Imagen anterior"><FaChevronLeft /></button><button type="button" className="is_next" onClick={() => setActive(index => (index + 1) % images.length)} aria-label="Imagen siguiente"><FaChevronRight /></button><div className="tags_qr_web_section_dots">{images.map((_, index) => <button type="button" className={index === active ? "is_active" : ""} onClick={() => setActive(index)} aria-label={`Ver imagen ${index + 1}`} key={index} />)}</div></>}</div>
            : <div className="tags_qr_web_section_grid">{images.map((image, index) => <img src={image.url} alt={image.alt || `${content.title || "Sección"} ${index + 1}`} loading="lazy" key={`${image.url}-${index}`} />)}</div>)}
    </div>;
}
