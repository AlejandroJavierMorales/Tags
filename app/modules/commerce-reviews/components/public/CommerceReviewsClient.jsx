// =====================================
// Archivo:
// /app/modules/commerce-reviews/components/public/CommerceReviewsClient.jsx
//
// Descripción:
// Orquestador principal del flujo público
// de Commerce Reviews.
//
// Contexto:
// commerce-reviews
// =====================================

"use client";

import { useState }
    from "react";

import CommerceReviewWelcome
    from "./CommerceReviewWelcome";

import CommerceReviewWizard
    from "./CommerceReviewWizard";

import CommerceReviewThanks
    from "./CommerceReviewThanks";

export default function CommerceReviewsClient({
    store,
    order,
    items = [],
    token,
    tagsReviewsConfig = null
}) {

    const [screen, setScreen] =
        useState(
            items.length
                ? "welcome"
                : "thanks"
        );

    const [reviewItems, setReviewItems] =
        useState(
            items
        );

    function handleReviewSaved(
        productId,
        review
    ) {

        setReviewItems(prev =>
            prev.map(item =>
                Number(
                    item.product_id
                ) ===
                Number(
                    productId
                )
                    ? {
                        ...item,
                        review
                    }
                    : item
            )
        );

    }

    function handleComplete({
        productId,
        review
    }) {

        const completedItems =
            reviewItems.map(item =>
                Number(
                    item.product_id
                ) ===
                Number(
                    productId
                )
                    ? {
                        ...item,
                        review
                    }
                    : item
            );

        setReviewItems(
            completedItems
        );

        setScreen(
            "thanks"
        );

    }

    return (
        <div className="commerce_reviews_flow">

            {
                screen === "welcome" && (
                    <CommerceReviewWelcome
                        store={
                            store
                        }
                        order={
                            order
                        }
                        items={
                            reviewItems
                        }
                        onStart={() =>
                            setScreen(
                                "wizard"
                            )
                        }
                    />
                )
            }

            {
                screen === "wizard" && (
                    <CommerceReviewWizard
                        items={
                            reviewItems
                        }
                        token={
                            token
                        }
                        onReviewSaved={
                            handleReviewSaved
                        }
                        onComplete={
                            handleComplete
                        }
                    />
                )
            }

            {
                screen === "thanks" && (
                    <CommerceReviewThanks
                        store={
                            store
                        }
                        items={
                            reviewItems
                        }
                        tagsReviewsConfig={
                            tagsReviewsConfig
                        }
                    />
                )
            }

        </div>
    );

}