// =====================================
// Archivo:
// /app/modules/resto/components/blocks/RestoReviewsCTA.jsx
//
// Descripción:
// CTA público de Tags Resto para invitar
// al cliente a calificar su experiencia.
//
// Valida el pedido y deriva el flujo hacia
// Tags Reviews, que administra preguntas,
// umbral positivo, Google y agradecimiento.
//
// Contexto:
// resto / tags-reviews
// =====================================

"use client";

import {
    useState
}
    from "react";

import {
    FaStar,
    FaTimes
}
    from "react-icons/fa";

import showAlert
    from "@/app/components/showAlert";

import "../../styles/resto-reviews-cta.css";

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

export default function RestoReviewsCTA({
    entity,
    block,
    content = {},
    styles = {}
}) {

    if (!entity?.has_reviews) {
        return null;
    }

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
        showBadge = true,
        badge = "Tu opinión nos importa",

        showStars = true,

        showTitle = true,
        title = "¿Cómo fue tu experiencia?",

        showDescription = true,
        description =
        "Si realizaste un pedido en este comercio, tu opinión nos ayuda a seguir mejorando.",

        buttonText =
        "Calificar mi experiencia",

        modalTitle =
        "Verificá tu pedido",

        modalDescription =
        "Ingresá el número de pedido y el email o teléfono utilizado.",

        orderLabel =
        "Número de pedido",

        orderPlaceholder =
        "Ej: RE1-12345678",

        contactLabel =
        "Email o teléfono",

        contactPlaceholder =
        "Email o teléfono",

        submitText =
        "Continuar",

        loadingText =
        "Verificando..."
    } = finalContent;

    const [
        open,
        setOpen
    ] = useState(false);

    const [
        loading,
        setLoading
    ] = useState(false);

    const [
        form,
        setForm
    ] = useState({
        orderNumber: "",
        contact: ""
    });

    const restoId =
        Number(
            entity?.id || 0
        );

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

    const buttonTypography =
        getTypographyStyle(
            finalStyles,
            "button"
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
            undefined
    };

    const buttonStyle = {
        ...buttonTypography,

        background:
            finalStyles.buttonBackgroundColor ||
            undefined,

        color:
            buttonTypography.color ||
            finalStyles.buttonTextColor ||
            undefined,

        borderColor:
            finalStyles.buttonBorderColor ||
            undefined,

        borderRadius:
            finalStyles.buttonRadius ||
            undefined
    };

    const starColor =
        finalStyles.starColor ||
        "var(--qr-primary)";

    function updateField(
        field,
        value
    ) {

        setForm(prev => ({
            ...prev,
            [field]: value
        }));

    }

    function closeModal() {

        if (loading) {
            return;
        }

        setOpen(false);

    }

    async function handleValidate(e) {

        e.preventDefault();

        try {

            setLoading(true);

            const response =
                await fetch(
                    "/api/resto/public/reviews/validate",
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                storeId:
                                    restoId,

                                type:
                                    "resto",

                                orderNumber:
                                    form.orderNumber.trim(),

                                contact:
                                    form.contact.trim()
                            })
                    }
                );

            const result =
                await response
                    .json()
                    .catch(() => ({}));

            if (!response.ok) {

                throw new Error(
                    result?.error ||
                    "No pudimos verificar el pedido."
                );

            }

            if (!result?.reviewUrl) {

                throw new Error(
                    "No se recibió el enlace para continuar."
                );

            }

            showAlert({
                title:
                    "Pedido verificado",

                text:
                    "Te llevamos a calificar tu experiencia.",

                icon:
                    "success",

                timer:
                    1200
            });

            setTimeout(() => {

                window.location.href =
                    result.reviewUrl;

            }, 900);

        } catch (error) {

            showAlert({
                title:
                    "No pudimos verificar el pedido",

                text:
                    error?.message ||
                    "Revisá los datos e intentá nuevamente.",

                icon:
                    "warning"
            });

        } finally {

            setLoading(false);

        }

    }

    return (
        <>
            <section
                className="resto_reviews_cta"
                style={sectionStyle}
            >
                <div className="container">

                    <div
                        className="resto_reviews_cta_card"
                        style={cardStyle}
                    >

                        {
                            showBadge &&
                            badge && (

                                <span
                                    className="resto_reviews_cta_badge"
                                    style={metaStyle}
                                >
                                    {badge}
                                </span>

                            )
                        }

                        {
                            showStars && (

                                <div
                                    className="resto_reviews_cta_stars"
                                    aria-label="Cinco estrellas"
                                >
                                    {
                                        [...Array(5)]
                                            .map((_, index) => (

                                                <FaStar
                                                    key={index}
                                                    style={{
                                                        color:
                                                            starColor
                                                    }}
                                                />

                                            ))
                                    }
                                </div>

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

                        <button
                            type="button"
                            className="resto_reviews_cta_button"
                            style={buttonStyle}
                            onClick={() =>
                                setOpen(true)
                            }
                        >
                            {buttonText}
                        </button>

                    </div>

                </div>
            </section>

            {
                open && (

                    <div
                        className="resto_reviews_modal_overlay"
                        role="presentation"
                        onMouseDown={(e) => {

                            if (
                                e.target ===
                                e.currentTarget
                            ) {
                                closeModal();
                            }

                        }}
                    >

                        <div
                            className="resto_reviews_modal"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="resto-reviews-modal-title"
                        >

                            <button
                                type="button"
                                className="resto_reviews_modal_close"
                                onClick={closeModal}
                                disabled={loading}
                                aria-label="Cerrar"
                            >
                                <FaTimes />
                            </button>

                            {
                                showStars && (

                                    <div
                                        className="resto_reviews_modal_stars"
                                        aria-hidden="true"
                                    >
                                        {
                                            [...Array(5)]
                                                .map((_, index) => (

                                                    <FaStar
                                                        key={index}
                                                        style={{
                                                            color:
                                                                starColor
                                                        }}
                                                    />

                                                ))
                                        }
                                    </div>

                                )
                            }

                            <h3
                                id="resto-reviews-modal-title"
                            >
                                {modalTitle}
                            </h3>

                            <p>
                                {modalDescription}
                            </p>

                            <form
                                className="resto_reviews_modal_form"
                                onSubmit={handleValidate}
                            >

                                <div className="resto_reviews_modal_field">

                                    <label htmlFor="resto-review-order-number">
                                        {orderLabel}
                                    </label>

                                    <input
                                        id="resto-review-order-number"
                                        type="text"
                                        value={form.orderNumber}
                                        className="resto_reviews_modal_input"
                                        onChange={(e) =>
                                            updateField(
                                                "orderNumber",
                                                e.target.value
                                            )
                                        }
                                        placeholder={orderPlaceholder}
                                        autoComplete="off"
                                        disabled={loading}
                                        required
                                    />

                                </div>

                                <div className="resto_reviews_modal_field">

                                    <label htmlFor="resto-review-contact">
                                        {contactLabel}
                                    </label>

                                    <input
                                        id="resto-review-contact"
                                        type="text"
                                        value={form.contact}
                                        className="resto_reviews_modal_input"
                                        onChange={(e) =>
                                            updateField(
                                                "contact",
                                                e.target.value
                                            )
                                        }
                                        placeholder={contactPlaceholder}
                                        autoComplete="email"
                                        disabled={loading}
                                        required
                                    />

                                </div>

                                <button
                                    type="submit"
                                    className="resto_reviews_cta_button resto_reviews_modal_submit"
                                    style={buttonStyle}
                                    disabled={loading}
                                >
                                    {
                                        loading
                                            ? loadingText
                                            : submitText
                                    }
                                </button>

                            </form>

                        </div>

                    </div>

                )
            }
        </>
    );

}
