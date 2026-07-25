"use client";

// =====================================
// Archivo:
// /app/modules/resto/components/blocks/RestoHeaderBlock.jsx
//
// Descripción:
// Encabezado público principal de Tags Resto.
// Muestra identidad del restaurante, estado
// del servicio, buscador y acceso al pedido.
//
// No reutiliza componentes visuales de Store.
//
// Contexto:
// resto
// =====================================

import "../../styles/resto-public.css";
import {
    FaReceipt,
    FaSearch
} from "react-icons/fa";


export default function RestoHeaderBlock({
    entity,
    content = {},
    styles = {}
}) {

    const logoUrl =
        entity?.logo_url ||
        entity?.logoUrl ||
        "";

    const name =
        entity?.name ||
        entity?.title ||
        "Restaurante";

    const description =
        entity?.description ||
        "";

    const serviceStatus =
        entity?.service_status ||
        entity?.status ||
        "";

    const isOpen =
        entity?.is_open === true ||
        entity?.is_open === 1 ||
        entity?.is_open === "1" ||
        serviceStatus === "open" ||
        serviceStatus === "opened" ||
        serviceStatus === "active";

    const orderCount =
        Number(
            entity?.resto_order_count ??
            entity?.order_count ??
            entity?.cart_count ??
            0
        );

    const showLogo =
        content?.showLogo !== false;

    const showName =
        content?.showName !== false;

    const showDescription =
        content?.showDescription !== false;

    const showSearch =
        content?.showSearch !== false;

    const showOrder =
        content?.showOrder !== false &&
        content?.showCart !== false;

    const showStatus =
        content?.showStatus !== false;

    const searchPlaceholder =
        content?.searchPlaceholder ||
        "Buscar en la carta";

    const orderLabel =
        content?.orderLabel ||
        "Mi pedido";

    const openLabel =
        content?.openLabel ||
        "Abierto";

    const closedLabel =
        content?.closedLabel ||
        "Cerrado";

    const iconBoxStyles = {
        width: "42px",
        height: "42px",
        minWidth: "42px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "14px",
        background:
            "color-mix(in srgb, var(--qr-primary) 12%, var(--qr-surface))",
        color: "var(--qr-primary)",
        border:
            "1px solid color-mix(in srgb, var(--qr-primary) 10%, var(--qr-border))",
        fontSize: "18px",
        lineHeight: 1
    };

    function handleSearchChange(event) {

        window.dispatchEvent(
            new CustomEvent(
                "resto:search",
                {
                    detail: {
                        value:
                            event.target.value
                    }
                }
            )
        );

    }

    function handleOpenOrder() {

        window.dispatchEvent(
            new CustomEvent(
                "resto:open-order"
            )
        );

    }

    return (
        <header
            className="resto_header"
        >
            <div className="container">

                <div className="resto_header_main d-flex align-items-center justify-content-between gap-3 py-3">

                    <div className="resto_header_identity d-flex align-items-center gap-3 min-w-0">

                        {showLogo && logoUrl && (

                            <div className="resto_header_logo_wrap flex-shrink-0">

                                <img
                                    src={logoUrl}
                                    alt={name}
                                    className="resto_header_logo"
                                />

                            </div>

                        )}

                        <div className="resto_header_identity_text min-w-0">

                            <div className="d-flex align-items-center gap-2 flex-wrap">

                                {showName && (

                                    <h1 className="resto_header_name m-0 text-truncate">
                                        {name}
                                    </h1>

                                )}

                                {showStatus && serviceStatus && (

                                    <span
                                        className={
                                            [
                                                "resto_header_status",
                                                isOpen
                                                    ? "is_open"
                                                    : "is_closed"
                                            ].join(" ")
                                        }
                                    >
                                        {isOpen
                                            ? openLabel
                                            : closedLabel}
                                    </span>

                                )}

                            </div>

                            {showDescription && description && (

                                <p className="resto_header_description m-0 text-truncate">
                                    {description}
                                </p>

                            )}

                        </div>

                    </div>

                    {showOrder && (

                        <button
                            type="button"
                            className="resto_header_order_btn flex-shrink-0"
                            onClick={handleOpenOrder}
                            aria-label={orderLabel}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "10px",
                                padding: "7px 14px 7px 7px",
                                background: "var(--qr-surface)",
                                color: "var(--qr-text)",
                                border: "1px solid var(--qr-border)",
                                borderRadius: "var(--qr-radius)",
                                boxShadow: "var(--qr-shadow)"
                            }}
                        >
                            <span
                                className="resto_header_order_icon"
                                aria-hidden="true"
                            >
                                <FaReceipt />
                            </span>

                            <span className="resto_header_order_label">
                                {orderLabel}
                            </span>

                            {orderCount > 0 && (

                                <span className="resto_header_order_count">
                                    {orderCount}
                                </span>

                            )}
                        </button>

                    )}

                </div>

                {showSearch && (

                    <div className="resto_header_search_wrap pb-3">

                        <label
                            className="resto_header_search"
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                padding: "7px 12px 7px 7px",
                                background: "var(--qr-surface)",
                                color: "var(--qr-text)",
                                border: "1px solid var(--qr-border)",
                                borderRadius: "var(--qr-radius)"
                            }}
                        >
                            <span
                                className="resto_header_search_icon"
                                aria-hidden="true"
                            >
                                <FaSearch />
                            </span>

                            <input
                                type="search"
                                className="resto_header_search_input"
                                placeholder={searchPlaceholder}
                                onChange={handleSearchChange}
                                autoComplete="off"
                                aria-label={searchPlaceholder}
                                style={{
                                    width: "100%",
                                    border: 0,
                                    outline: 0,
                                    background: "transparent",
                                    color: "var(--qr-text)"
                                }}
                            />
                        </label>

                    </div>

                )}

            </div>
        </header>
    );

}