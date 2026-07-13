// =====================================
// Archivo:
// /app/modules/store/components/public/StoreProductReviewsCTA.jsx
//
// Descripción:
// CTA público para verificar una compra
// y calificar los productos adquiridos
// mediante Commerce Reviews.
//
// Integra:
// - contenido administrable;
// - diseño del Builder;
// - tipografías del Builder;
// - modal de verificación;
// - acceso público por pedido entregado.
//
// Contexto:
// store / commerce-reviews
// =====================================

"use client";

import {
    useState
}
from "react";

import showAlert
    from "@/app/components/showAlert";

function getTypographyStyle(
    styles,
    part
) {

    const typography =
        styles?.typography?.[part] || {};

    return {
        color:
            typography.color ||
            undefined,

        fontFamily:
            typography.fontFamily ||
            undefined,

        fontSize:
            typography.fontSize ||
            undefined,

        fontWeight:
            typography.fontWeight ||
            undefined,

        fontStyle:
            typography.fontStyle ||
            undefined,

        textDecoration:
            typography.textDecoration ||
            undefined,

        lineHeight:
            typography.lineHeight ||
            undefined,

        letterSpacing:
            typography.letterSpacing ||
            undefined,

        textAlign:
            typography.textAlign ||
            undefined
    };

}

export default function StoreProductReviewsCTA({
    store,
    content = {},
    styles = {}
}) {

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

    if (!store?.id) {
        return null;
    }

    const title =
        content.title ||
        "¿Qué te parecieron los productos?";

    const description =
        content.description ||
        "Si ya recibiste tu pedido, podés calificar los productos que compraste y ayudar a otros clientes a elegir mejor.";

    const buttonText =
        content.buttonText ||
        "Calificar mis productos";

    const modalTitle =
        content.modalTitle ||
        "Verificá tu compra";

    const modalDescription =
        content.modalDescription ||
        "Ingresá el número de pedido y el email o teléfono utilizado en la compra.";

    const titleTypography =
        getTypographyStyle(
            styles,
            "title"
        );

    const textTypography =
        getTypographyStyle(
            styles,
            "text"
        );

    const buttonTypography =
        getTypographyStyle(
            styles,
            "button"
        );

    const sectionStyle = {
        background:
            styles.backgroundColor ||
            undefined,

        color:
            styles.textColor ||
            undefined,

        marginTop:
            styles.marginTop ||
            undefined,

        marginBottom:
            styles.marginBottom ||
            undefined,

        padding:
            styles.padding ||
            undefined,

        textAlign:
            styles.alignment ||
            undefined
    };

    const cardStyle = {
        color:
            styles.textColor ||
            undefined,

        textAlign:
            styles.alignment ||
            undefined
    };

    const titleStyle = {
        ...titleTypography,

        color:
            titleTypography.color ||
            styles.textColor ||
            undefined,

        textAlign:
            titleTypography.textAlign ||
            styles.alignment ||
            undefined
    };

    const textStyle = {
        ...textTypography,

        color:
            textTypography.color ||
            styles.textColor ||
            undefined,

        textAlign:
            textTypography.textAlign ||
            styles.alignment ||
            undefined
    };

    const buttonStyle = {
        ...buttonTypography,

        background:
            styles.buttonBackgroundColor ||
            undefined,

        color:
            buttonTypography.color ||
            styles.buttonTextColor ||
            undefined,

        borderColor:
            styles.buttonBorderColor ||
            undefined,

        borderWidth:
            styles.buttonBorderWidth ||
            undefined,

        borderStyle:
            styles.buttonBorderWidth
                ? "solid"
                : undefined,

        borderRadius:
            styles.buttonRadius ||
            undefined,

        paddingTop:
            styles.buttonPaddingY ||
            undefined,

        paddingBottom:
            styles.buttonPaddingY ||
            undefined,

        paddingLeft:
            styles.buttonPaddingX ||
            undefined,

        paddingRight:
            styles.buttonPaddingX ||
            undefined,

        width:
            styles.buttonFullWidth
                ? "100%"
                : undefined
    };

    const starsStyle = {
        color:
            styles.starColor ||
            undefined,

        textAlign:
            styles.alignment ||
            undefined
    };

    const modalStyle = {
        color:
            styles.textColor ||
            undefined
    };

    function updateField(
        field,
        value
    ) {

        setForm(prev => ({
            ...prev,
            [field]:
                value
        }));

    }

    function closeModal() {

        if (loading) {
            return;
        }

        setOpen(false);

    }

    async function handleValidate(event) {

        event.preventDefault();

        const orderNumber =
            String(
                form.orderNumber || ""
            ).trim();

        const contact =
            String(
                form.contact || ""
            ).trim();

        if (
            !orderNumber ||
            !contact
        ) {

            showAlert({
                title:
                    "Completá los datos",

                text:
                    "Ingresá el número de pedido y el email o teléfono utilizado en la compra.",

                icon:
                    "info"
            });

            return;

        }

        try {

            setLoading(true);

            const response =
                await fetch(
                    "/api/store/public/product-reviews",
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
                                    store.id,

                                orderNumber,

                                contact
                            })
                    }
                );

            const data =
                await response
                    .json()
                    .catch(() => ({}));

            if (!response.ok) {

                throw new Error(
                    data.error ||
                    "No pudimos verificar la compra."
                );

            }

            showAlert({
                title:
                    "Compra verificada",

                text:
                    "Te llevamos a calificar los productos de tu pedido.",

                icon:
                    "success",

                timer:
                    1200
            });

            window.setTimeout(
                () => {

                    window.location.href =
                        data.reviewUrl;

                },
                900
            );

        } catch (error) {

            showAlert({
                title:
                    "No pudimos verificar la compra",

                text:
                    error.message,

                icon:
                    "warning"
            });

        } finally {

            setLoading(false);

        }

    }

    return (
        <section
            className="store_reviews_cta"
            style={sectionStyle}
        >

            <div className="container">

                <div
                    className="store_reviews_cta_card"
                    style={cardStyle}
                >

                    {
                        content.showStars !==
                            false && (

                            <div
                                className="store_reviews_cta_stars"
                                style={starsStyle}
                            >
                                ★★★★★
                            </div>

                        )
                    }

                    {
                        content.showTitle !==
                            false && (

                            <h2 style={titleStyle}>
                                {title}
                            </h2>

                        )
                    }

                    {
                        content.showDescription !==
                            false && (

                            <p style={textStyle}>
                                {description}
                            </p>

                        )
                    }

                    {
                        content.showButton !==
                            false && (

                            <button
                                type="button"
                                className="store_btn_primary store_reviews_cta_btn"
                                style={buttonStyle}
                                onClick={() =>
                                    setOpen(true)
                                }
                            >
                                {buttonText}
                            </button>

                        )
                    }

                </div>

            </div>

            {
                open && (

                    <div
                        className="store_review_modal_overlay"
                        onMouseDown={event => {

                            if (
                                event.target ===
                                event.currentTarget
                            ) {
                                closeModal();
                            }

                        }}
                    >

                        <div
                            className="store_review_modal"
                            style={modalStyle}
                        >

                            <button
                                type="button"
                                className="store_review_modal_close"
                                onClick={
                                    closeModal
                                }
                                disabled={
                                    loading
                                }
                                aria-label="Cerrar"
                            >
                                ×
                            </button>

                            <div
                                className="store_reviews_cta_stars"
                                style={starsStyle}
                            >
                                ★★★★★
                            </div>

                            <h3 style={titleStyle}>
                                {modalTitle}
                            </h3>

                            <p style={textStyle}>
                                {modalDescription}
                            </p>

                            <form
                                onSubmit={
                                    handleValidate
                                }
                            >

                                <label
                                    htmlFor="product-review-order-number"
                                    style={textStyle}
                                >
                                    Número de pedido
                                </label>

                                <input
                                    id="product-review-order-number"
                                    value={
                                        form.orderNumber
                                    }
                                    className="store_review_modal_input"
                                    style={textTypography}
                                    onChange={event =>
                                        updateField(
                                            "orderNumber",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Ej: ST1-12345678"
                                    disabled={
                                        loading
                                    }
                                    required
                                />

                                <label
                                    htmlFor="product-review-contact"
                                    style={textStyle}
                                >
                                    Email o teléfono
                                </label>

                                <input
                                    id="product-review-contact"
                                    value={
                                        form.contact
                                    }
                                    className="store_review_modal_input"
                                    style={textTypography}
                                    onChange={event =>
                                        updateField(
                                            "contact",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Email o teléfono"
                                    disabled={
                                        loading
                                    }
                                    required
                                />

                                <button
                                    type="submit"
                                    className="store_btn_primary store_reviews_cta_btn"
                                    style={buttonStyle}
                                    disabled={
                                        loading
                                    }
                                >
                                    {
                                        loading
                                            ? "Verificando..."
                                            : "Continuar"
                                    }
                                </button>

                            </form>

                        </div>

                    </div>

                )
            }

        </section>
    );

}