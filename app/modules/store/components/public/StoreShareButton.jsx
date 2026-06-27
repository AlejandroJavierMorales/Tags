"use client";

import { FiShare2 }
    from "react-icons/fi";

import showAlert
    from "@/app/components/showAlert";

export default function StoreShareButton({
    store,
    product
}) {
    async function handleShare(e) {
        e.preventDefault();
        e.stopPropagation();

        const productUrl =
            `${window.location.origin}/p/${store.slug}/products/${product.id}`;

        try {
            if (navigator.share) {
                await navigator.share({
                    title: product.title,
                    text:
                        product.description ||
                        `Mirá este producto en ${store.name}`,
                    url: productUrl
                });

                return;
            }

            await navigator.clipboard.writeText(productUrl);

            showAlert({
                title: "Enlace copiado",
                text: "El link del producto se copió al portapapeles.",
                icon: "success",
                timer: 1300
            });

        } catch (err) {
            if (err?.name === "AbortError") {
                return;
            }

            showAlert({
                title: "No se pudo compartir",
                text: "Copiá el enlace desde la barra del navegador.",
                icon: "info"
            });
        }
    }

    return (
        <button
            type="button"
            className="store_favorite_btn store_share_btn"
            aria-label="Compartir producto"
            onClick={handleShare}
        >
            <FiShare2 />
        </button>
    );
}