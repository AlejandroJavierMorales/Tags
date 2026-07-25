"use client";

// =====================================
// Archivo:
// /app/modules/resto/components/blocks/RestoActionsBlock.jsx
//
// Descripción:
// Bloque público de acciones rápidas de
// Tags Resto.
//
// Separa acciones principales y redes
// sociales en dos filas independientes.
//
// Contexto:
// resto
// =====================================

import "../../styles/resto-public.css";

import {
    MdRestaurantMenu,
    MdOutlinePhone,
    MdOutlineEmail,
    MdOutlineShare,
    MdOutlineLocationOn
}
    from "react-icons/md";

import {
    FaWhatsapp,
    FaInstagram,
    FaFacebookF,
    FaTiktok,
    FaXTwitter
}
    from "react-icons/fa6";

export default function RestoActionsBlock({
    entity,
    content = {},
    styles = {}
}) {

    function getTextStyle(
        part
    ) {

        return (
            styles?.typography?.[part] ||
            {}
        );

    }

    const contact =
        entity?.contact ||
        {};

    const social =
        entity?.social ||
        {};

    const location =
        entity?.location ||
        {};

    const title =
        content?.title ||
        "Acciones rápidas";

    const socialTitle =
        content?.socialTitle ||
        "Seguinos";

    const showTitle =
        content?.showTitle !==
        false;

    const showSocialTitle =
        content?.showSocialTitle !==
        false;

    const showLabels =
        content?.showLabels !==
        false;

    const whatsapp =
        String(
            contact?.whatsapp ||
            ""
        ).replace(
            /\D/g,
            ""
        );

    const phone =
        String(
            contact?.phone ||
            ""
        ).trim();

    const email =
        String(
            contact?.email ||
            ""
        ).trim();

    const address =
        String(
            location?.address ||
            ""
        ).trim();

    async function handleShare() {

        const shareData = {
            title:
                entity?.name ||
                "Tags Resto",

            url:
                window.location.href
        };

        try {

            if (
                navigator.share
            ) {

                await navigator.share(
                    shareData
                );

                return;

            }

            if (
                navigator.clipboard
            ) {

                await navigator.clipboard.writeText(
                    window.location.href
                );

                window.alert(
                    "Enlace copiado."
                );

            }

        } catch (error) {

            if (
                error?.name !==
                "AbortError"
            ) {

                console.error(
                    "No se pudo compartir:",
                    error
                );

            }

        }

    }

    const primaryActions = [
        {
            key:
                "whatsapp",

            enabled:
                content?.showWhatsapp !==
                    false &&
                Boolean(whatsapp),

            label:
                content?.whatsappLabel ||
                "WhatsApp",

            icon:
                <FaWhatsapp />,

            href:
                `https://wa.me/${whatsapp}`,

            external:
                true
        },

        {
            key:
                "phone",

            enabled:
                content?.showPhone !==
                    false &&
                Boolean(phone),

            label:
                content?.phoneLabel ||
                "Llamar",

            icon:
                <MdOutlinePhone />,

            href:
                `tel:${phone}`
        },

        {
            key:
                "location",

            enabled:
                content?.showLocation !==
                    false &&
                Boolean(address),

            label:
                content?.locationLabel ||
                "Cómo llegar",

            icon:
                <MdOutlineLocationOn />,

            href:
                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    address
                )}`,

            external:
                true
        },

        {
            key:
                "email",

            enabled:
                content?.showEmail !==
                    false &&
                Boolean(email),

            label:
                content?.emailLabel ||
                "Email",

            icon:
                <MdOutlineEmail />,

            href:
                `mailto:${email}`
        },

        {
            key:
                "share",

            enabled:
                content?.showShare !==
                false,

            label:
                content?.shareLabel ||
                "Compartir",

            icon:
                <MdOutlineShare />,

            onClick:
                handleShare
        }
    ].filter(
        action =>
            action.enabled
    );

    const socialActions = [
        {
            key:
                "instagram",

            enabled:
                content?.showInstagram !==
                    false &&
                Boolean(
                    social?.instagram
                ),

            label:
                "Instagram",

            icon:
                <FaInstagram />,

            href:
                social?.instagram
        },

        {
            key:
                "facebook",

            enabled:
                content?.showFacebook !==
                    false &&
                Boolean(
                    social?.facebook
                ),

            label:
                "Facebook",

            icon:
                <FaFacebookF />,

            href:
                social?.facebook
        },

        {
            key:
                "tiktok",

            enabled:
                content?.showTikTok !==
                    false &&
                Boolean(
                    social?.tiktok
                ),

            label:
                "TikTok",

            icon:
                <FaTiktok />,

            href:
                social?.tiktok
        },

        {
            key:
                "x",

            enabled:
                content?.showX !==
                    false &&
                Boolean(
                    social?.x
                ),

            label:
                "X",

            icon:
                <FaXTwitter />,

            href:
                social?.x
        }
    ].filter(
        action =>
            action.enabled
    );

    if (
        primaryActions.length === 0 &&
        socialActions.length === 0
    ) {

        return null;

    }

    function renderAction(
        action,
        isSocial = false
    ) {

        const className = [
            "resto_action_button",
            isSocial
                ? "resto_action_button_social"
                : "resto_action_button_primary",
            showLabels
                ? ""
                : "resto_action_button_icon_only"
        ]
            .filter(Boolean)
            .join(" ");

        const actionContent = (
            <>
                <span
                    className="resto_action_icon"
                    aria-hidden="true"
                >
                    {action.icon}
                </span>

                {
                    showLabels && (
                        <span
                            className="resto_action_label"
                            style={
                                getTextStyle(
                                    "label"
                                )
                            }
                        >
                            {action.label}
                        </span>
                    )
                }
            </>
        );

        if (
            action.onClick
        ) {

            return (
                <button
                    key={action.key}
                    type="button"
                    className={className}
                    onClick={
                        action.onClick
                    }
                    aria-label={
                        action.label
                    }
                    title={
                        action.label
                    }
                >
                    {actionContent}
                </button>
            );

        }

        return (
            <a
                key={action.key}
                href={action.href}
                className={className}
                aria-label={
                    action.label
                }
                title={
                    action.label
                }
                target={
                    action.external
                        ? "_blank"
                        : undefined
                }
                rel={
                    action.external
                        ? "noopener noreferrer"
                        : undefined
                }
            >
                {actionContent}
            </a>
        );

    }

    return (
        <section
            className="resto_actions"
            style={{
                background:
                    styles?.backgroundColor,

                color:
                    styles?.textColor ||
                    "var(--qr-text)",

                padding:
                    styles?.padding,

                marginTop:
                    styles?.marginTop,

                marginBottom:
                    styles?.marginBottom
            }}
        >
            <div className="container">

                {
                    showTitle &&
                    primaryActions.length > 0 && (
                        <div className="resto_actions_header">

                            <h2
                                className="resto_actions_title"
                                style={
                                    getTextStyle(
                                        "title"
                                    )
                                }
                            >
                                <MdRestaurantMenu />

                                <span>
                                    {title}
                                </span>
                            </h2>

                        </div>
                    )
                }

                {
                    primaryActions.length > 0 && (
                        <div
                            className="
                                resto_actions_row
                                resto_actions_primary
                            "
                        >
                            {
                                primaryActions.map(
                                    action =>
                                        renderAction(
                                            action
                                        )
                                )
                            }
                        </div>
                    )
                }

                {
                    socialActions.length > 0 && (
                        <div className="resto_actions_social_section">

                            {
                                showSocialTitle && (
                                    <p
                                        className="resto_actions_social_title"
                                        style={
                                            getTextStyle(
                                                "subtitle"
                                            )
                                        }
                                    >
                                        {socialTitle}
                                    </p>
                                )
                            }

                            <div
                                className="
                                    resto_actions_row
                                    resto_actions_social
                                "
                            >
                                {
                                    socialActions.map(
                                        action =>
                                            renderAction(
                                                action,
                                                true
                                            )
                                    )
                                }
                            </div>

                        </div>
                    )
                }

            </div>
        </section>
    );

}