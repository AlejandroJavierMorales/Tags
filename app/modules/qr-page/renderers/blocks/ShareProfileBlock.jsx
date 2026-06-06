"use client";

import getTypographyStyle from "../../lib/getTypographyStyle";

export default function ShareProfileBlock({
    content,
    styles = {}
}) {

    async function handleShare() {

        const url =
            window.location.href;

        try {

            if (navigator.share) {

                await navigator.share({
                    title: document.title,
                    url
                });

                return;
            }

            await navigator.clipboard.writeText(
                url
            );

            alert(
                "Link copiado al portapapeles"
            );

        } catch (err) {

            console.log(err);
        }
    }

    return (
        <button
            type="button"
            className="qr_public_button"
            onClick={handleShare}
            style={
                getTypographyStyle(
                    styles,
                    "button"
                )
            }
        >
            {
                content.buttonLabel ||
                "Compartir perfil"
            }
        </button>
    );
}