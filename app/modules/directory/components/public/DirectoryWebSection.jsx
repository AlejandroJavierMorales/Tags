"use client";

import { useRef } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import "./DirectoryWebSection.css";

function typography(styles, part) {
  return { ...(styles?.typography?.[part] || {}), color: styles?.typography?.[part]?.color || undefined };
}

export default function DirectoryWebSection({ content = {}, styles = {} }) {
  const carouselRef = useRef(null);
  const normalizeText = value => String(value || "").replace(/\s+/g, " ").trim().toLocaleLowerCase();
  const highlightedKey = normalizeText(content.highlightedText);
  const paragraphs = (Array.isArray(content.paragraphs) ? content.paragraphs : [])
    .filter(Boolean)
    .filter(paragraph => normalizeText(typeof paragraph === "string" ? paragraph : paragraph?.text) !== highlightedKey);
  const images = Array.isArray(content.images) ? content.images.filter(item => item?.url).slice(0, 12) : [];
  const carousel = content.imageLayout === "carousel";
  const moveCarousel = direction => {
    const element = carouselRef.current;
    if (!element) return;
    element.scrollBy({ left: direction * Math.max(240, element.clientWidth * 0.82), behavior: "smooth" });
  };

  return <div className="tags_directory_web_section" style={{ textAlign: styles.alignment || "left" }}>
    {(content.eyebrow || content.title || content.subtitle) && <header>{content.eyebrow && <span>{content.eyebrow}</span>}{content.title && <h2 style={typography(styles,"title")}>{content.title}</h2>}{content.subtitle && <h3 style={typography(styles,"subtitle")}>{content.subtitle}</h3>}</header>}
    {content.highlightedText && <p className="tags_directory_web_section_highlight" style={typography(styles,"highlight")}>{content.highlightedText}</p>}
    {paragraphs.length > 0 && <div className="tags_directory_web_section_paragraphs" style={typography(styles,"text")}>{paragraphs.map((paragraph,index)=><p key={index}>{typeof paragraph === "string" ? paragraph : paragraph?.text}</p>)}</div>}
    {images.length > 0 && (carousel
      ? <div className="tags_directory_web_section_carousel_shell">
          <div className="tags_directory_web_section_carousel" ref={carouselRef}>
            {images.map((image,index)=><figure key={`${image.url}-${index}`}><img src={image.url} alt={image.alt || content.title || `Imagen ${index+1}`} loading="lazy" /></figure>)}
          </div>
          {images.length > 1 && <><button type="button" className="prev" onClick={()=>moveCarousel(-1)} aria-label="Imágenes anteriores"><FaChevronLeft /></button><button type="button" className="next" onClick={()=>moveCarousel(1)} aria-label="Imágenes siguientes"><FaChevronRight /></button></>}
        </div>
      : <div className="tags_directory_web_section_grid">{images.map((image,index)=><img src={image.url} alt={image.alt || content.title || `Imagen ${index+1}`} loading="lazy" key={`${image.url}-${index}`} />)}</div>)}
  </div>;
}
