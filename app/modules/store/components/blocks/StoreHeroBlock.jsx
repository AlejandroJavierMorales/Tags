// =====================================
// Archivo:
// /app/modules/store/components/blocks/StoreHeroBlock.jsx
//
// Descripción:
// Portada pública de Tags Store.
// Renderiza contenido, diseño y textos
// editables desde el Builder.
// =====================================

import Image
    from "next/image";

import {
    resolveStyle,
    resolveTypography
}
from "@/app/modules/store/lib/storeStyleResolver";

export default function StoreHeroBlock({
    entity,
    content = {},
    styles = {}
}) {

    const theme =
        entity?.theme_css_vars || {};

    const title =
        content.title ||
        entity?.name ||
        "Tienda Online";

    const subtitle =
        content.subtitle ||
        entity?.description ||
        "Conocé nuestros productos y comprá de forma simple.";

    const cover =
        content.imageUrl ||
        entity?.cover_url;

    const badgeText =
        content.badgeText ||
        "Tienda Online";

    const primaryButtonText =
        content.primaryButtonText ||
        "Ver productos";

    const secondaryButtonText =
        content.secondaryButtonText ||
        "Consultar";

    const imageFit =
        content.imageFit ||
        "cover";

    const heroHeight =
        content.heroHeight ||
        "medium";

    const overlayOpacity =
        Math.min(
            100,
            Math.max(
                0,
                Number(content.overlayOpacity ?? 40)
            )
        );

    const whatsapp =
        entity?.whatsapp;

    const sectionStyle = {

        backgroundColor:
            resolveStyle({
                styles,
                theme,
                key: "backgroundColor"
            }),

        color:
            resolveStyle({
                styles,
                theme,
                key: "textColor"
            }),

        textAlign:
            styles.alignment,

        padding:
            styles.padding,

        marginTop:
            styles.marginTop,

        marginBottom:
            styles.marginBottom

    };

    const heightClass =
        heroHeight === "small"
            ? "store_hero_height_small"
            : heroHeight === "large"
                ? "store_hero_height_large"
                : heroHeight === "full"
                    ? "store_hero_height_full"
                    : "store_hero_height_medium";

    const imageStyle = {

        objectFit:
            imageFit === "contain"
                ? "contain"
                : "cover",

        objectPosition:
            `${content.imagePositionX || "center"} ${content.imagePositionY || "center"}`

    };

    return (

        <section
            className={[
                "store_hero_block",
                cover
                    ? "store_hero_with_cover"
                    : "store_hero_without_cover",
                heightClass
            ].join(" ")}
            style={sectionStyle}
        >

            {

                cover && (

                    <Image
                        src={cover}
                        alt={title}
                        fill
                        priority
                        sizes="100vw"
                        className="store_hero_bg"
                        style={imageStyle}
                    />

                )

            }

            {

                cover &&
                overlayOpacity > 0 && (

                    <div
                        className="store_hero_overlay"
                        style={{
                            backgroundColor:
                                `rgba(0,0,0,${overlayOpacity / 100})`
                        }}
                    />

                )

            }

            <div className="store_hero_inner">

                <div className="store_hero_content">

                    {content.showBadge !== false && (
                        <span
                            className="store_hero_badge"
                            style={
                                resolveTypography({
                                    styles,
                                    part: "meta"
                                })
                            }
                        >
                            {badgeText}
                        </span>
                    )}

                    {content.showTitle !== false && (
                        <h1
                            className="store_hero_title"
                            style={
                                resolveTypography({
                                    styles,
                                    part: "title"
                                })
                            }
                        >
                            {title}
                        </h1>
                    )}

                    {content.showSubtitle !== false && (
                        <p
                            className="store_hero_subtitle"
                            style={
                                resolveTypography({
                                    styles,
                                    part: "subtitle"
                                })
                            }
                        >
                            {subtitle}
                        </p>
                    )}

                    <div className="store_hero_actions">

                        {content.showPrimaryButton !== false && (
                            <a
                                href="#store-products"
                                className="store_btn_primary"
                                style={
                                    resolveTypography({
                                        styles,
                                        part: "button"
                                    })
                                }
                            >
                                {primaryButtonText}
                            </a>
                        )}

                        {

                            content.showSecondaryButton !== false && whatsapp && (

                                <a
                                    href={`https://wa.me/54${String(whatsapp).replace(/\D/g, "")}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="store_btn_secondary"
                                    style={
                                        resolveTypography({
                                            styles,
                                            part: "button"
                                        })
                                    }
                                >
                                    {secondaryButtonText}
                                </a>

                            )

                        }

                    </div>

                </div>

            </div>

        </section>

    );

}
