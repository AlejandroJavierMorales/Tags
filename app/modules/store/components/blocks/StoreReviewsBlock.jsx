// =====================================
// Archivo:
// /app/modules/store/components/blocks/StoreReviewsBlock.jsx
//
// Descripción:
// Bloque público de reseñas para Tags Store.
// Muestra reseñas de productos,
// experiencias o ambas.
//
// Soporta:
// - presentación slider o grid;
// - límite y orden de reseñas;
// - tipografías del Builder;
// - estilos visuales del Builder;
// - color configurable de estrellas;
// - badge de compra verificada.
//
// Contexto:
// store / commerce-reviews
// =====================================

"use client";

import {
    useEffect,
    useState
}
    from "react";

import {
    FaStar,
    FaCheckCircle,
    FaBoxOpen,
    FaCommentDots
}
    from "react-icons/fa";

import "../../styles/store-reviews.css";

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

export default function StoreReviewsBlock({
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
        showReviewType = true
    } = finalContent;

    const [
        loading,
        setLoading
    ] = useState(true);

    const [
        reviews,
        setReviews
    ] = useState([]);

    const storeId =
        Number(
            entity?.id || 0
        );

    useEffect(() => {

        let cancelled =
            false;

        async function loadReviews() {

            try {

                setLoading(true);

                if (!storeId) {

                    if (!cancelled) {
                        setReviews([]);
                    }

                    return;

                }

                const params =
                    new URLSearchParams({
                        storeId:
                            String(storeId),

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
                    "STORE REVIEWS BLOCK ERROR:",
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
        storeId,
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

    if (loading) {
        return null;
    }

    if (!reviews.length) {

        return (
            <section
                className="store_reviews"
                style={sectionStyle}
            >

                <div className="container">

                    <div className="store_reviews_header">

                        {
                            showBadge && (
                                <span
                                    className="store_reviews_badge"
                                    style={metaStyle}
                                >
                                    {badge}
                                </span>
                            )
                        }

                        {
                            showTitle && (
                                <h2 style={titleStyle}>
                                    {title}
                                </h2>
                            )
                        }

                        <p style={textStyle}>
                            No hay reseñas públicas disponibles.
                        </p>

                    </div>

                </div>

            </section>
        );

    }

    return (
        <section
            className={
                `store_reviews store_reviews_${layout}`
            }
            style={sectionStyle}
        >

            <div className="container">

                {
                    (
                        showBadge ||
                        showTitle ||
                        (
                            showDescription &&
                            description
                        )
                    ) && (

                        <div className="store_reviews_header">

                            {
                                showBadge && (
                                    <span
                                        className="store_reviews_badge"
                                        style={metaStyle}
                                    >
                                        {badge}
                                    </span>
                                )
                            }

                            {
                                showTitle && (
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

                    )
                }

                <div
                    className={
                        `store_reviews_items store_reviews_items_${layout}`
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

                            return (
                                <article
                                    key={review.id}
                                    className="store_review_card"
                                    style={cardStyle}
                                >

                                    {
                                        showStars && (

                                            <div className="store_review_rating">

                                                <div className="store_review_stars">

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
                                                    className="store_review_rating_value"
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
                                                className="store_review_comment"
                                                style={textStyle}
                                            >
                                                {review.comment}
                                            </p>

                                        )
                                    }

                                    <div className="store_review_footer">

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

                                        {
                                            showProductName &&
                                            review.product_name && (

                                                <div
                                                    className="store_review_product"
                                                    style={metaStyle}
                                                >

                                                    <FaBoxOpen />

                                                    <span>
                                                        {review.product_name}
                                                    </span>

                                                </div>

                                            )
                                        }

                                        {
                                            showReviewType && (

                                                <div
                                                    className="store_review_type"
                                                    style={metaStyle}
                                                >

                                                    {
                                                        review.type ===
                                                            "commerce"
                                                            ? (
                                                                <>
                                                                    <FaBoxOpen />

                                                                    <span>
                                                                        Producto
                                                                    </span>
                                                                </>
                                                            )
                                                            : (
                                                                <>
                                                                    <FaCommentDots />

                                                                    <span>
                                                                        Experiencia
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
                                                    className="store_review_verified"
                                                    style={metaStyle}
                                                >

                                                    <FaCheckCircle />

                                                    <span>
                                                        Compra verificada
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

                                </article>
                            );

                        })
                    }

                </div>

            </div>

        </section>
    );

}