// =====================================
// Archivo:
// /app/modules/commerce-reviews/components/public/CommerceReviewWizard.jsx
//
// Descripción:
// Controla el wizard público de calificación
// de productos de Commerce Reviews.
//
// Contexto:
// commerce-reviews
// =====================================

"use client";

import {
    useMemo,
    useState
}
from "react";

import showAlert
    from "@/app/components/showAlert";

import CommerceReviewStep
    from "./CommerceReviewStep";

import WizardProgress
    from "./WizardProgress";

function createDraft(item) {

    return {
        rating:
            Number(
                item?.review?.rating || 0
            ),

        title:
            item?.review?.title || "",

        comment:
            item?.review?.comment || ""
    };

}

export default function CommerceReviewWizard({
    items = [],
    token,
    onReviewSaved,
    onComplete
}) {

    const [currentIndex, setCurrentIndex] =
        useState(0);

    const [saving, setSaving] =
        useState(false);

    const initialDrafts =
        useMemo(
            () =>
                items.reduce(
                    (
                        result,
                        item
                    ) => ({
                        ...result,

                        [item.order_item_id]:
                            createDraft(
                                item
                            )
                    }),
                    {}
                ),
            [items]
        );

    const [drafts, setDrafts] =
        useState(
            initialDrafts
        );

    const currentItem =
        items[
            currentIndex
        ];

    const currentDraft =
        currentItem
            ? drafts[
                currentItem.order_item_id
            ] || createDraft(
                currentItem
            )
            : null;

    const isLastProduct =
        currentIndex ===
        items.length - 1;

    function updateCurrentDraft(
        nextDraft
    ) {

        if (!currentItem) {
            return;
        }

        setDrafts(prev => ({
            ...prev,

            [currentItem.order_item_id]:
                nextDraft
        }));

    }

    async function saveCurrentReview() {

        if (
            !currentItem ||
            !currentDraft ||
            Number(
                currentDraft.rating
            ) < 1
        ) {

            showAlert({
                title:
                    "Elegí una calificación",

                text:
                    "Seleccioná entre una y cinco estrellas para continuar.",

                icon:
                    "info"
            });

            return false;
        }

        setSaving(true);

        try {

            const response =
                await fetch(
                    "/api/commerce-reviews/public/save",
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                token,

                                productId:
                                    currentItem.product_id,

                                orderItemId:
                                    currentItem.order_item_id,

                                rating:
                                    Number(
                                        currentDraft.rating
                                    ),

                                title:
                                    currentDraft.title,

                                comment:
                                    currentDraft.comment
                            })
                    }
                );

            const data =
                await response
                    .json()
                    .catch(() => ({}));

            if (!response.ok) {

                throw new Error(
                    data.message ||
                    data.error ||
                    "No se pudo guardar la opinión"
                );

            }

            const savedReview =
                data.review || {
                    id:
                        data.reviewId,

                    source_item_id:
                        currentItem.order_item_id,

                    item_id:
                        currentItem.product_id,

                    rating:
                        Number(
                            currentDraft.rating
                        ),

                    title:
                        currentDraft.title,

                    comment:
                        currentDraft.comment,

                    status:
                        "pending",

                    is_verified:
                        1
                };

            onReviewSaved?.(
                currentItem.product_id,
                savedReview
            );

            return savedReview;

        } catch (error) {

            showAlert({
                title:
                    "No pudimos guardar la opinión",

                text:
                    error.message,

                icon:
                    "error"
            });

            return null;

        } finally {

            setSaving(false);

        }

    }

    async function handleNext() {

        const savedReview =
            await saveCurrentReview();

        if (!savedReview) {
            return;
        }

        if (!isLastProduct) {

            setCurrentIndex(prev =>
                prev + 1
            );

            return;
        }

        onComplete?.({
            productId:
                currentItem.product_id,

            review:
                savedReview
        });

    }

    function handlePrevious() {

        if (currentIndex <= 0) {
            return;
        }

        setCurrentIndex(prev =>
            prev - 1
        );

    }

    if (!currentItem) {
        return null;
    }

    return (
        <section className="commerce_reviews_wizard">

            <WizardProgress
                current={
                    currentIndex + 1
                }
                total={
                    items.length
                }
            />

            <CommerceReviewStep
                item={
                    currentItem
                }
                value={
                    currentDraft
                }
                onChange={
                    updateCurrentDraft
                }
                disabled={
                    saving
                }
            />

            <div className="commerce_reviews_actions">

                {
                    currentIndex > 0 && (
                        <button
                            type="button"
                            className="commerce_reviews_secondary_btn"
                            onClick={
                                handlePrevious
                            }
                            disabled={
                                saving
                            }
                        >
                            Anterior
                        </button>
                    )
                }

                <button
                    type="button"
                    className="commerce_reviews_primary_btn"
                    onClick={
                        handleNext
                    }
                    disabled={
                        saving
                    }
                >
                    {
                        saving
                            ? "Guardando..."
                            : isLastProduct
                                ? "Finalizar"
                                : "Guardar y continuar"
                    }
                </button>

            </div>

        </section>
    );

}