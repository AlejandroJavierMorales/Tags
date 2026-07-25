// =====================================
// Archivo:
// /app/modules/resto/components/blocks/RestoReviewsBlock.jsx
//
// Descripción:
// Bloque público de reseñas para Tags Resto.
//
// Muestra reseñas de experiencia,
// platos/productos o ambas.
//
// Soporta:
// - presentación slider o grid;
// - límite y orden;
// - tipografías del Builder;
// - estilos visuales del Builder;
// - estrellas configurables;
// - reseñas verificadas;
// - soporte futuro para platos/productos.
//
// Contexto:
// resto / commerce-reviews
// =====================================

"use client";

import {
    useEffect,
    useRef,
    useState
}
    from "react";

import {
    FaStar,
    FaCheckCircle,
    FaBoxOpen,
    FaCommentDots,
    FaChevronLeft,
    FaChevronRight
}
    from "react-icons/fa";

import "../../styles/resto-reviews.css";

function getTypographyStyle(
    styles,
    part
) {

    const typography =
        styles?.typography?.[part] || {};

    return {
        color:
            typography.color || undefined,

        fontFamily:
            typography.fontFamily || undefined,

        fontSize:
            typography.fontSize || undefined,

        fontWeight:
            typography.fontWeight || undefined,

        fontStyle:
            typography.fontStyle || undefined,

        textDecoration:
            typography.textDecoration || undefined,

        lineHeight:
            typography.lineHeight || undefined,

        letterSpacing:
            typography.letterSpacing || undefined,

        textAlign:
            typography.textAlign || undefined
    };

}

export default function RestoReviewsBlock({
    entity,
    block,
    content = {},
    styles = {}
}) {

    const finalContent =
        Object.keys(
            content || {}
        ).length
            ? content
            : block?.content_json || {};

    const finalStyles =
        Object.keys(
            styles || {}
        ).length
            ? styles
            : block?.styles_json || {};

    const {
        source = "both",
        layout = "slider",
        limit = 10,
        order = "newest",

        showBadge = true,
        badge = "Opiniones",

        showTitle = true,
        title = "Nuestros clientes opinan",

        showDescription = true,
        description = "",

        showStars = true,
        showCustomerName = true,
        showDate = true,
        showReviewTitle = true,
        showComment = true,
        showProductName = true,
        showVerifiedBadge = true,
        showReviewType = true,
        showNavigation = true,

        productLabel = "Plato o producto",
        experienceLabel = "Experiencia",
        verifiedLabel = "Experiencia verificada",
        emptyText = "No hay reseñas públicas disponibles."
    } = finalContent;

    const [
        loading,
        setLoading
    ] = useState(true);

    const [
        reviews,
        setReviews
    ] = useState([]);

    const sliderRef =
        useRef(null);

    const restoId =
        Number(
            entity?.id || 0
        );

    useEffect(() => {

        let cancelled =
            false;

        async function loadReviews() {

            try {

                setLoading(true);

                if (!restoId) {

                    if (!cancelled) {
                        setReviews([]);
                    }

                    return;

                }

                const params =
                    new URLSearchParams({
                        storeId:
                            String(restoId),

                        type:
                            "resto",

                        source:
                            String(source),

                        limit:
                            String(limit),

                        order:
                            String(order)
                    });

                const response =
                    await fetch(
                        `/api/store/public/reviews/list?${params.toString()}`,
                        {
                            cache:
                                "no-store"
                        }
                    );

                const result =
                    await response
                        .json()
                        .catch(() => ({}));

                if (!response.ok) {

                    throw new Error(
                        result?.error ||
                        "No se pudieron cargar las reseñas"
                    );

                }

                if (!cancelled) {

                    setReviews(
                        Array.isArray(
                            result?.data
                        )
                            ? result.data
                            : []
                    );

                }

            } catch (error) {

                console.error(
                    "RESTO REVIEWS BLOCK ERROR:",
                    error
                );

                if (!cancelled) {
                    setReviews([]);
                }

            } finally {

                if (!cancelled) {
                    setLoading(false);
                }

            }

        }

        loadReviews();

        return () => {

            cancelled =
                true;

        };

    }, [
        restoId,
        source,
        limit,
        order
    ]);

    const sectionStyle = {
        background:
            finalStyles.backgroundColor ||
            undefined,

        color:
            finalStyles.textColor ||
            undefined,

        textAlign:
            finalStyles.alignment ||
            undefined,

        marginTop:
            finalStyles.marginTop ||
            undefined,

        marginBottom:
            finalStyles.marginBottom ||
            undefined,

        padding:
            finalStyles.padding ||
            undefined
    };

    const titleTypography =
        getTypographyStyle(
            finalStyles,
            "title"
        );

    const textTypography =
        getTypographyStyle(
            finalStyles,
            "text"
        );

    const metaTypography =
        getTypographyStyle(
            finalStyles,
            "meta"
        );

    const titleStyle = {
        ...titleTypography,

        color:
            titleTypography.color ||
            finalStyles.textColor ||
            undefined,

        textAlign:
            titleTypography.textAlign ||
            finalStyles.alignment ||
            undefined
    };

    const textStyle = {
        ...textTypography,

        color:
            textTypography.color ||
            finalStyles.textColor ||
            undefined,

        textAlign:
            textTypography.textAlign ||
            finalStyles.alignment ||
            undefined
    };

    const metaStyle = {
        ...metaTypography,

        color:
            metaTypography.color ||
            finalStyles.textColor ||
            undefined,

        textAlign:
            metaTypography.textAlign ||
            finalStyles.alignment ||
            undefined
    };

    const cardStyle = {
        background:
            finalStyles.cardBackgroundColor ||
            undefined,

        borderColor:
            finalStyles.cardBorderColor ||
            undefined,

        borderRadius:
            finalStyles.cardRadius ||
            undefined,

        boxShadow:
            finalStyles.cardShadow ||
            undefined
    };

    const starColor =
        finalStyles.starColor ||
        "var(--qr-primary)";

    const inactiveStarColor =
        finalStyles.inactiveStarColor ||
        undefined;

    function moveSlider(direction) {

        const slider =
            sliderRef.current;

        if (!slider) {
            return;
        }

        const firstCard =
            slider.querySelector(
                ".resto_review_card"
            );

        const cardWidth =
            firstCard?.getBoundingClientRect()
                ?.width || 320;

        slider.scrollBy({
            left:
                direction * (cardWidth + 20),

            behavior:
                "smooth"
        });

    }

    if (loading) {
        return null;
    }

    const headerVisible =
        showBadge ||
        showTitle ||
        (
            showDescription &&
            description
        );

    return (
        <section
            className={
                `resto_reviews resto_reviews_${layout}`
            }
            style={sectionStyle}
        >

            <div className="container">

                {
                    headerVisible && (

                        <div className="resto_reviews_header">

                            <div className="resto_reviews_header_content">

                                {
                                    showBadge &&
                                    badge && (

                                        <span
                                            className="resto_reviews_badge"
                                            style={metaStyle}
                                        >
                                            {badge}
                                        </span>

                                    )
                                }

                                {
                                    showTitle &&
                                    title && (

                                        <h2 style={titleStyle}>
                                            {title}
                                        </h2>

                                    )
                                }

                                {
                                    showDescription &&
                                    description && (

                                        <p style={textStyle}>
                                            {description}
                                        </p>

                                    )
                                }

                            </div>

                            {
                                layout === "slider" &&
                                showNavigation &&
                                reviews.length > 1 && (

                                    <div className="resto_reviews_navigation">

                                        <button
                                            type="button"
                                            onClick={() =>
                                                moveSlider(-1)
                                            }
                                            aria-label="Reseñas anteriores"
                                        >
                                            <FaChevronLeft />
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                moveSlider(1)
                                            }
                                            aria-label="Reseñas siguientes"
                                        >
                                            <FaChevronRight />
                                        </button>

                                    </div>

                                )
                            }

                        </div>

                    )
                }

                {
                    !reviews.length
                        ? (

                            <div className="resto_reviews_empty">

                                <FaCommentDots />

                                <p style={textStyle}>
                                    {emptyText}
                                </p>

                            </div>

                        )
                        : (

                            <div
                                ref={
                                    layout === "slider"
                                        ? sliderRef
                                        : null
                                }
                                className={
                                    `resto_reviews_items resto_reviews_items_${layout}`
                                }
                            >

                                {
                                    reviews.map(review => {

                                        const rating =
                                            Math.max(
                                                0,
                                                Math.min(
                                                    5,
                                                    Number(
                                                        review.rating || 0
                                                    )
                                                )
                                            );

                                        const activeStars =
                                            Math.round(
                                                rating
                                            );

                                        const isCommerce =
                                            review.type ===
                                            "commerce";

                                        return (
                                            <article
                                                key={review.id}
                                                className="resto_review_card"
                                                style={cardStyle}
                                            >

                                                {
                                                    showStars && (

                                                        <div className="resto_review_rating">

                                                            <div
                                                                className="resto_review_stars"
                                                                aria-label={
                                                                    `${rating.toFixed(1)} de 5 estrellas`
                                                                }
                                                            >

                                                                {
                                                                    [...Array(5)]
                                                                        .map((_, index) => {

                                                                            const starNumber =
                                                                                index + 1;

                                                                            const isActive =
                                                                                starNumber <=
                                                                                activeStars;

                                                                            return (
                                                                                <FaStar
                                                                                    key={starNumber}
                                                                                    className={
                                                                                        isActive
                                                                                            ? "active"
                                                                                            : ""
                                                                                    }
                                                                                    style={{
                                                                                        color:
                                                                                            isActive
                                                                                                ? starColor
                                                                                                : inactiveStarColor
                                                                                    }}
                                                                                />
                                                                            );

                                                                        })
                                                                }

                                                            </div>

                                                            <span
                                                                className="resto_review_rating_value"
                                                                style={metaStyle}
                                                            >
                                                                {
                                                                    rating.toFixed(
                                                                        1
                                                                    )
                                                                }
                                                            </span>

                                                        </div>

                                                    )
                                                }

                                                {
                                                    showReviewTitle &&
                                                    review.title && (

                                                        <h3 style={textStyle}>
                                                            {review.title}
                                                        </h3>

                                                    )
                                                }

                                                {
                                                    showComment &&
                                                    review.comment && (

                                                        <p
                                                            className="resto_review_comment"
                                                            style={textStyle}
                                                        >
                                                            {review.comment}
                                                        </p>

                                                    )
                                                }

                                                <div className="resto_review_footer">

                                                    {
                                                        showCustomerName && (

                                                            <strong style={metaStyle}>
                                                                {
                                                                    review.customer_name ||
                                                                    "Cliente"
                                                                }
                                                            </strong>

                                                        )
                                                    }

                                                    <div className="resto_review_metadata">

                                                        {
                                                            showProductName &&
                                                            review.product_name && (

                                                                <div
                                                                    className="resto_review_meta_item resto_review_product"
                                                                    style={metaStyle}
                                                                >

                                                                    <FaBoxOpen />

                                                                    <span>
                                                                        {
                                                                            review.product_name
                                                                        }
                                                                    </span>

                                                                </div>

                                                            )
                                                        }

                                                        {
                                                            showReviewType && (

                                                                <div
                                                                    className="resto_review_meta_item resto_review_type"
                                                                    style={metaStyle}
                                                                >

                                                                    {
                                                                        isCommerce
                                                                            ? (
                                                                                <>
                                                                                    <FaBoxOpen />

                                                                                    <span>
                                                                                        {productLabel}
                                                                                    </span>
                                                                                </>
                                                                            )
                                                                            : (
                                                                                <>
                                                                                    <FaCommentDots />

                                                                                    <span>
                                                                                        {experienceLabel}
                                                                                    </span>
                                                                                </>
                                                                            )
                                                                    }

                                                                </div>

                                                            )
                                                        }

                                                        {
                                                            showVerifiedBadge &&
                                                            review.verified && (

                                                                <div
                                                                    className="resto_review_meta_item resto_review_verified"
                                                                    style={metaStyle}
                                                                >

                                                                    <FaCheckCircle />

                                                                    <span>
                                                                        {verifiedLabel}
                                                                    </span>

                                                                </div>

                                                            )
                                                        }

                                                        {
                                                            showDate &&
                                                            review.created_at && (

                                                                <small style={metaStyle}>
                                                                    {
                                                                        new Date(
                                                                            review.created_at
                                                                        ).toLocaleDateString(
                                                                            "es-AR"
                                                                        )
                                                                    }
                                                                </small>

                                                            )
                                                        }

                                                    </div>

                                                </div>

                                            </article>
                                        );

                                    })
                                }

                            </div>

                        )
                }

            </div>

        </section>
    );

}