"use client";

import { useState } from "react";
import Image from "next/image";

export default function ImageCarousel({
    images = [],
    altBase = "",
    priority = false
}) {
    const [index, setIndex] = useState(0);

    if (!images.length) return null;

    const next = () => setIndex((prev) => (prev + 1) % images.length);

    const prev = () =>
        setIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));

    const formatAlt = (src) => {
        const file = src.split("/").pop()?.split(".")[0] || "";
        return file.replace(/[-_]/g, " ").trim();
    };

    return (
        <div className="tags_card_carousel_container m-0 p-0">

            <div className="tags_card_carousel_image_wrapper m-0 p-0 mb-3">
                <Image
                    src={images[index]}
                    alt={altBase || formatAlt(images[index])}
                    fill
                    sizes="(max-width: 576px) 100vw, (max-width: 992px) 50vw"
                    priority={priority && index === 0}
                    className="tags_card_carousel_image"
                />
            </div>

            {images.length > 1 && (
                <>
                    <button
                        className="tags_card_carousel_btn tags_card_carousel_btn_left"
                        onClick={prev}
                        style={{ backgroundColor: "#0fd15a" }}
                    >
                        ‹
                    </button>

                    <button
                        className="tags_card_carousel_btn tags_card_carousel_btn_right"
                        onClick={next}
                        style={{ backgroundColor: "#0fd15a" }}
                    >
                        ›
                    </button>
                </>
            )}
        </div>
    );
}