"use client";

import { useEffect, useState }
    from "react";

import getTypographyStyle from "../../lib/getTypographyStyle";

export default function ProfileQRBlock({
    content,
    page,
    styles = {}
}) {

    const [url, setUrl] =
        useState("");

    const titleStyle =
        getTypographyStyle(
            styles,
            "title"
        );

    const textStyle =
        getTypographyStyle(
            styles,
            "text"
        );

    const buttonStyle =
        getTypographyStyle(
            styles,
            "button"
        );

    useEffect(() => {

        if (content?.qrUrl) {

            setUrl(
                content.qrUrl
            );

            return;
        }

        if (!page?.slug) {
            return;
        }

        setUrl(
            `${window.location.origin}/p/${page.slug}`
        );

    }, [
        content?.qrUrl,
        page?.slug
    ]);

    if (!url) {
        return null;
    }

    const qrUrl =
        `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(url)}`;

    return (
        <div className="qr_public_profile_qr">

            {
                content.title && (
                    <h3 style={titleStyle}>
                        {content.title}
                    </h3>
                )
            }

            {
                content.text && (
                    <p style={textStyle}>
                        {content.text}
                    </p>
                )
            }

            <img
                src={qrUrl}
                alt="QR personal"
            />

            <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="qr_public_profile_qr_btn"
                style={buttonStyle}
            >
                Abrir perfil
            </a>

        </div>
    );
}