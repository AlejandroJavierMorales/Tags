// =====================================
// FILE: /app/dashboard/businesses/[id]/resto/kitchen/pageClient.jsx
// Descripción:
// Controlador principal del módulo Cocina de Tags Resto.
// =====================================

"use client";

import {
    useCallback,
    useEffect,
    useState
} from "react";

import {
    useRouter
} from "next/navigation";

import showAlert
    from "@/app/components/showAlert";

import TagsSpinner
    from "@/app/components/TagsSpinner";

import RestoKitchenHeader
    from "@/app/modules/resto/components/admin/kitchen/RestoKitchenHeader";

import RestoKitchenStats
    from "@/app/modules/resto/components/admin/kitchen/RestoKitchenStats";

import RestoKitchenGrid
    from "@/app/modules/resto/components/admin/kitchen/RestoKitchenGrid";

import "@/app/styles/qr-page.css";
import "@/app/styles/tags_dashboard.css";
import "@/app/modules/resto/styles/orders/index.css";
import "@/app/modules/resto/styles/kitchen/index.css";

export default function KitchenPageClient({
    businessId,
    permissions = ["*"]
}) {

    const router =
        useRouter();

    const [loading, setLoading] =
        useState(true);

    const [refreshing, setRefreshing] =
        useState(false);

    const [updatingItemId, setUpdatingItemId] =
        useState(null);

    const [store, setStore] =
        useState(null);

    const [orders, setOrders] =
        useState([]);

    const [stats, setStats] =
        useState({
            orders_in_kitchen: 0,
            items_in_preparation: 0,
            average_wait_minutes: 0
        });

    const [
        kitchenSettings,
        setKitchenSettings
    ] =
        useState({

            warningMinutes: 10,
            urgentMinutes: 20,
            cardWidth: 350,
            cardHeight: 620

        });

    const loadKitchen =
        useCallback(
            async ({
                silent = false
            } = {}) => {

                if (silent) {

                    setRefreshing(true);

                } else {

                    setLoading(true);

                }

                try {

                    const params =
                        new URLSearchParams({

                            businessId:
                                String(businessId)

                        });

                    const response =
                        await fetch(
                            `/api/resto/admin/kitchen/list?${params.toString()}`,
                            {
                                cache:
                                    "no-store"
                            }
                        );

                    const data =
                        await response
                            .json()
                            .catch(
                                () => null
                            );

                    if (!response.ok) {

                        throw new Error(
                            data?.error ||
                            "No se pudo cargar la cocina."
                        );

                    }

                    setOrders(
                        Array.isArray(data?.orders)
                            ? data.orders
                            : []
                    );

                    setStore(
                        data?.store ||
                        null
                    );

                    setStats({
                        orders_in_kitchen:
                            Number(
                                data?.stats?.orders_in_kitchen ??
                                data?.stats?.total_orders ??
                                0
                            ),

                        items_in_preparation:
                            Number(
                                data?.stats?.items_in_preparation ??
                                data?.stats?.total_items ??
                                0
                            ),

                        average_wait_minutes:
                            Number(
                                data?.stats?.average_wait_minutes ??
                                0
                            )
                    });

                    setKitchenSettings({

                        warningMinutes:
                            Number(
                                data?.kitchenSettings
                                    ?.warningMinutes
                            ) || 10,

                        urgentMinutes:
                            Number(
                                data?.kitchenSettings
                                    ?.urgentMinutes
                            ) || 20,

                        cardWidth:
                            Number(
                                data?.kitchenSettings
                                    ?.cardWidth
                            ) || 350,

                        cardHeight:
                            Number(
                                data?.kitchenSettings
                                    ?.cardHeight
                            ) || 620

                    });

                }

                catch (err) {

                    console.error(
                        "KITCHEN LOAD ERROR:",
                        err
                    );

                    showAlert({

                        icon:
                            "error",

                        title:
                            "Cocina",

                        text:
                            err.message ||
                            "No se pudo cargar la cocina."

                    });

                }

                finally {

                    setLoading(false);

                    setRefreshing(false);

                }

            },
            [
                businessId
            ]
        );

    useEffect(() => {

        loadKitchen();

    }, [
        loadKitchen
    ]);

    useEffect(() => {

        const timer =
            setInterval(() => {

                loadKitchen({
                    silent: true
                });

            }, 10000);

        return () =>
            clearInterval(timer);

    }, [
        loadKitchen
    ]);

    async function markReady(item) {

        if (!item?.id) {

            return;

        }

        const confirmation =
            await showAlert({

                icon:
                    "question",

                title:
                    "Marcar producto preparado",

                text:
                    `¿Confirmás que "${item.title || "este producto"}" está preparado?`,

                showCancelButton:
                    true,

                confirmButtonText:
                    "Sí, marcar preparado",

                cancelButtonText:
                    "Cancelar"

            });

        if (!confirmation) {

            return;

        }

        setUpdatingItemId(
            item.id
        );

        try {

            const response =
                await fetch(
                    "/api/resto/admin/kitchen/ready",
                    {
                        method:
                            "POST",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify({

                                businessId,

                                itemId:
                                    item.id

                            })

                    }
                );

            const data =
                await response
                    .json()
                    .catch(
                        () => null
                    );

            if (!response.ok) {

                throw new Error(
                    data?.error ||
                    "No se pudo actualizar el producto."
                );

            }

            await loadKitchen({
                silent: true
            });

        }

        catch (err) {

            console.error(
                "KITCHEN READY ERROR:",
                err
            );

            showAlert({

                icon:
                    "error",

                title:
                    "Cocina",

                text:
                    err.message ||
                    "No se pudo actualizar el producto."

            });

        }

        finally {

            setUpdatingItemId(
                null
            );

        }

    }

    function goBack() {

        router.push(
            `/dashboard/businesses/${businessId}/resto`
        );

    }

    if (loading) {

        return (
            <div className="tags_resto_kitchen_loading">

                <TagsSpinner />

            </div>
        );

    }

    return (

        <main className="tags_resto_kitchen_page px-2 mb-5 pb-5">

            <RestoKitchenHeader

                store={store}

                refreshing={refreshing}

                onBack={goBack}

                onRefresh={() =>
                    loadKitchen({
                        silent: true
                    })
                }

            />

            <RestoKitchenStats

                stats={stats}

            />

            <RestoKitchenGrid

                orders={orders}

                kitchenSettings={
                    kitchenSettings
                }

                updatingItemId={
                    updatingItemId
                }

                onMarkReady={
                    markReady
                }

                canMarkReady={
                    permissions.includes("*") ||
                    permissions.includes(
                        "kitchen.ready"
                    )
                }

            />

        </main>

    );

}
