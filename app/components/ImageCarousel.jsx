"use client";

import { useState } from "react";
import Image from "next/image";

export default function ImageCarousel({
    images = [],
    altBase = "",
    priority = false,
}) {
    const [index, setIndex] = useState(0);

    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);

    if (!images.length) return null;

    const next = () => {
        setIndex((prev) => (prev + 1) % images.length);
    };

    const prev = () => {
        setIndex((prev) =>
            prev === 0 ? images.length - 1 : prev - 1
        );
    };

    const formatAlt = (src) => {
        const file = src.split("/").pop()?.split(".")[0] || "";
        return file.replace(/[-_]/g, " ").trim();
    };

    // mínimo swipe necesario
    const minSwipeDistance = 50;

    const onTouchStart = (e) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;

        const distance = touchStart - touchEnd;

        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) {
            next();
        }

        if (isRightSwipe) {
            prev();
        }
    };

    return (
        <div className="tags_card_carousel_container m-0 p-0">

            <div
                className="tags_card_carousel_image_wrapper m-0 p-0 mb-3"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                <Image
                    src={images[index]}
                    alt={altBase || formatAlt(images[index])}
                    fill
                    quality={60}
                    sizes="
                        (max-width: 576px) 100vw,
                        (max-width: 992px) 50vw,
                        600px
                    "
                    priority={priority && index === 0}
                    className="tags_card_carousel_image"
                />
            </div>

            {images.length > 1 && (
                <div className="tags_card_carousel_dots">
                    {images.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setIndex(i)}
                            className={`tags_card_carousel_dot ${
                                i === index
                                    ? "tags_card_carousel_dot_active"
                                    : ""
                            }`}
                            aria-label={`Go to image ${i + 1}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}