"use client";

import { useEffect, useRef, useState } from "react";
import { FaArrowRight, FaChevronLeft, FaChevronRight, FaCircleCheck, FaRegStar, FaStar, FaStarHalfStroke, FaXmark } from "react-icons/fa6";
import ClientReviewsPublicRenderer from "@/app/modules/client-reviews/renderers/ClientReviewsPublicRenderer";
import "./DirectoryReviewsModule.css";

function dateLabel(value) {
    if (!value) return "";
    return new Date(value).toLocaleDateString("es-AR", { month: "short", year: "numeric" });
}

function Stars({ value }) {
    const rating = Math.max(0, Math.min(5, Number(value || 0)));
    return <span className="tags_directory_review_stars" aria-label={`${rating.toFixed(1)} de 5 estrellas`}>
        {[1, 2, 3, 4, 5].map(star => {
            if (rating >= star) return <FaStar key={star} />;
            if (rating >= star - 0.5) return <FaStarHalfStroke key={star} />;
            return <FaRegStar key={star} />;
        })}
    </span>;
}

export default function DirectoryReviewsModule({ variant, data, content = {}, useOwnTheme = false, directoryThemeTokens = {} }) {
    const slider = useRef(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        if (!modalOpen) return undefined;
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = previous; };
    }, [modalOpen]);

    if (!data?.form) return null;
    const ownThemeStyle = useOwnTheme ? data.theme?.css_tokens || undefined : undefined;
    function closeModal() { setModalOpen(false); setSubmitted(false); }

    if (variant === "invitation") {
        return <div className="tags_directory_reviews_module is_invitation" style={ownThemeStyle}>
            <div className="tags_directory_reviews_invitation">
                <div>{content.eyebrow && <span>{content.eyebrow}</span>}<h2>{content.title || "¿Cómo fue tu experiencia?"}</h2>{content.text && <p>{content.text}</p>}</div>
                <button type="button" onClick={() => setModalOpen(true)}>{content.buttonLabel || "Dejar una reseña"}<FaArrowRight /></button>
            </div>
            {modalOpen && <div className="tags_directory_reviews_modal_backdrop" onMouseDown={closeModal}>
                <section className="tags_directory_reviews_modal" onMouseDown={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Dejar una reseña">
                    <header><div><small>TAGS REVIEWS</small><strong>Compartí tu experiencia</strong></div><button type="button" onClick={closeModal} aria-label="Cerrar"><FaXmark /></button></header>
                    <div className="tags_directory_reviews_modal_body">
                        <ClientReviewsPublicRenderer
                            slug={data.form.slug}
                            portalThemeTokens={directoryThemeTokens}
                            inheritPortalTheme={!useOwnTheme}
                            embedded
                            disableGoogleThreshold={content.disableGoogleThreshold === true}
                            onSubmitted={() => setSubmitted(true)}
                        />
                    </div>
                    <footer><button type="button" onClick={closeModal}>{submitted ? "<- Volver" : "Cerrar"}</button></footer>
                </section>
            </div>}
        </div>;
    }

    const reviews = (data.reviews || []).slice(0, Math.max(1, Number(content.limit || 10)));
    function move(direction) {
        const card = slider.current?.querySelector("article");
        slider.current?.scrollBy({ left: direction * ((card?.getBoundingClientRect().width || 300) + 14), behavior: "smooth" });
    }

    return <div className="tags_directory_reviews_module is_slider" style={ownThemeStyle}>
        <header><div>{content.eyebrow && <span>{content.eyebrow}</span>}<h2>{content.title || "Lo que cuentan nuestros clientes"}</h2>{content.description && <p>{content.description}</p>}</div>
            {reviews.length > 1 && <nav aria-label="Navegación de reseñas"><button type="button" onClick={() => move(-1)} aria-label="Reseñas anteriores"><FaChevronLeft /></button><button type="button" onClick={() => move(1)} aria-label="Reseñas siguientes"><FaChevronRight /></button></nav>}
        </header>
        {reviews.length ? <div className="tags_directory_reviews_track" ref={slider}>{reviews.map(review => <article key={review.id}>
            <div className="tags_directory_review_rating"><Stars value={review.average_rating} /><b>{Number(review.average_rating || 0).toFixed(1)}</b></div>
            <blockquote>{review.general_comment || "Compartió su valoración de la experiencia."}</blockquote>
            <footer><div><strong>{review.customer_name || "Cliente"}</strong>{content.showDate !== false && <time>{dateLabel(review.created_at)}</time>}</div>{content.showVerified !== false && review.verified_purchase && <span><FaCircleCheck /> Verificada</span>}</footer>
        </article>)}</div> : <p className="tags_directory_reviews_empty">Todavía no hay reseñas públicas para mostrar.</p>}
    </div>;
}
