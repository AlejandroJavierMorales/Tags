"use client";

// =====================================
// Archivo:
// /app/modules/resto/components/blocks/RestoHeroBlock.jsx
//
// Descripción:
// Portada pública principal de Tags Resto.
// Muestra imagen, identidad, descripción,
// estado del servicio y acceso directo
// a la carta.
//
// Contexto:
// resto
// =====================================
import "../../styles/resto-public.css"



export default function RestoHeroBlock({
    entity,
    content = {},
    styles = {}
}) {

    const coverUrl =
        entity?.cover_url ||
        entity?.cover_image_url ||
        entity?.coverUrl ||
        "";

    const logoUrl =
        entity?.logo_url ||
        entity?.logoUrl ||
        "";

    const name =
        entity?.name ||
        entity?.title ||
        "Restaurante";

    const title =
        content?.title ||
        name;

    const subtitle =
        content?.subtitle ||
        entity?.description ||
        "Descubrí nuestra carta y realizá tu pedido.";

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
        serviceStatus === "active" ||
        serviceStatus === "published";

    const showCover =
        content?.showCover !== false;

    const showLogo =
        content?.showLogo !== false;

    const showTitle =
        content?.showTitle !== false;

    const showSubtitle =
        content?.showSubtitle !== false;

    const showStatus =
        content?.showStatus !== false;

    const showButton =
        content?.showButton !== false;

    const buttonLabel =
        content?.buttonLabel ||
        "Ver carta";

    const openLabel =
        content?.openLabel ||
        "Abierto";

    const closedLabel =
        content?.closedLabel ||
        "Cerrado";

    function handleViewMenu() {

        const menuSection =
            document.querySelector(
                '[data-section-type="categories"], ' +
                '[data-section-type="products"], ' +
                '[data-section-type="menu"]'
            );

        if (menuSection) {

            menuSection.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

            return;

        }

        window.dispatchEvent(
            new CustomEvent(
                "resto:view-menu"
            )
        );

    }

    return (
        <section
            className={
                [
                    "resto_hero",
                    coverUrl && showCover
                        ? "has_cover"
                        : "without_cover"
                ].join(" ")
            }
            /* style={{
                background:
                    styles?.background ||
                    "var(--qr-surface)",

                color:
                    styles?.color ||
                    "var(--qr-text)",

                borderColor:
                    styles?.borderColor ||
                    "var(--qr-border)"
            }} */
        >

            {showCover && coverUrl && (

                <div className="resto_hero_cover">

                    <img
                        src={coverUrl}
                        alt={title}
                        className="resto_hero_cover_image"
                    />

                    <div
                        className="resto_hero_cover_overlay"
                        aria-hidden="true"
                    />

                </div>

            )}

            <div className="container">

                <div className="resto_hero_content">

                    {showLogo && logoUrl && (

                        <div className="resto_hero_logo_wrap">

                            <img
                                src={logoUrl}
                                alt={name}
                                className="resto_hero_logo"
                            />

                        </div>

                    )}

                    <div className="resto_hero_text">

                        {showStatus && serviceStatus && (

                            <span
                                className={
                                    [
                                        "resto_hero_status",
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

                        {showTitle && title && (

                            <h2 className="resto_hero_title">
                                {title}
                            </h2>

                        )}

                        {showSubtitle && subtitle && (

                            <p className="resto_hero_subtitle">
                                {subtitle}
                            </p>

                        )}

                        {showButton && (

                            <button
                                type="button"
                                className="resto_hero_button"
                                onClick={handleViewMenu}
                            >
                                {buttonLabel}
                            </button>

                        )}

                    </div>

                </div>

            </div>

        </section>
    );

}