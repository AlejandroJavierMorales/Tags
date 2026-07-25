// =====================================
// FILE: /app/dashboard/businesses/[id]/resto/orders/[orderId]/pageClient.jsx
// Descripción:
// Vista operativa de un pedido de Tags Resto.
// Consume exclusivamente la API admin orders/get.
// =====================================

"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useState
} from "react";

import {
    useRouter,
    useSearchParams
} from "next/navigation";

import {
    FaArrowLeft,
    FaCashRegister,
    FaCheck,
    FaClock,
    FaFire,
    FaHome,
    FaPen,
    FaTimes,
    FaUtensils
} from "react-icons/fa";

import showAlert
    from "@/app/components/showAlert";

import TagsSpinner
    from "@/app/components/TagsSpinner";

import {
    formatRestoCustomerName,
    formatRestoOrderNumber,
    formatRestoOrderPrice,
    getRestoOrderElapsedTime,
    getRestoOrderLocationName,
    getRestoOrderServiceModeLabel
} from "@/app/modules/resto/lib/orders";

import {
    requestRestoOrderCancellation
} from "@/app/modules/resto/lib/orders/requestRestoOrderCancellation";

import {
    requestRestoPayment
} from "@/app/modules/resto/lib/cash/requestRestoPayment";

import "@/app/styles/qr-page.css";
import "@/app/styles/tags_dashboard.css";
import "@/app/modules/resto/styles/orders/index.css";

const orderStatusLabels = {
    new:
        "Nuevo",
    confirmed:
        "Confirmado",
    preparing:
        "En cocina",
    ready:
        "Listo para entregar",
    served:
        "Servido",
    shipped:
        "Entregado",
    completed:
        "Cerrado",
    cancelled:
        "Cancelado"
};

const itemGroups = [
    {
        key:
            "pending",
        title:
            "Pendientes",
        icon:
            <FaClock />
    },
    {
        key:
            "sent",
        title:
            "En preparación",
        icon:
            <FaFire />
    },
    {
        key:
            "ready",
        title:
            "Preparados",
        icon:
            <FaCheck />
    },
    {
        key:
            "served",
        title:
            "Servidos",
        icon:
            <FaUtensils />
    }
];

function safeNumber(value) {

    const number =
        Number(
            value
        );

    return Number.isFinite(
        number
    )
        ? number
        : 0;

}

export default function RestoOrderDetailPageClient({
    businessId,
    orderId,
    permissions = ["*"]
}) {

    const router =
        useRouter();

    const can =
        permission =>
            permissions.includes("*") ||
            permissions.includes(
                permission
            );

    const searchParams =
        useSearchParams();

    const [loading, setLoading] =
        useState(
            true
        );

    const [updating, setUpdating] =
        useState(
            false
        );

    const [order, setOrder] =
        useState(
            null
        );

    const [store, setStore] =
        useState(
            null
        );

    const [editMode, setEditMode] =
        useState(
            false
        );

    const [products, setProducts] =
        useState(
            []
        );

    const [variants, setVariants] =
        useState(
            []
        );

    const [catalogLoading, setCatalogLoading] =
        useState(
            false
        );

    const [selectedProductId, setSelectedProductId] =
        useState(
            ""
        );

    const [selectedVariantId, setSelectedVariantId] =
        useState(
            ""
        );

    const [newItemQuantity, setNewItemQuantity] =
        useState(
            1
        );

    const [newItemNotes, setNewItemNotes] =
        useState(
            ""
        );

    const [discountType, setDiscountType] =
        useState(
            "fixed"
        );

    const [discountValue, setDiscountValue] =
        useState(
            ""
        );

    const loadOrder =
        useCallback(
            async ({
                silent = false
            } = {}) => {

                if (!silent) {

                    setLoading(
                        true
                    );

                }

                try {

                    const params =
                        new URLSearchParams({
                            businessId:
                                String(
                                    businessId
                                ),
                            orderId:
                                String(
                                    orderId
                                )
                        });

                    const response =
                        await fetch(
                            `/api/resto/admin/orders/get?${params.toString()}`,
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
                            "No se pudo cargar el pedido."
                        );

                    }

                    setOrder(
                        data?.order ||
                        null
                    );

                    setStore(
                        data?.store ||
                        null
                    );

                } catch (err) {

                    console.error(
                        "RESTO ORDER DETAIL LOAD ERROR:",
                        err
                    );

                    showAlert({
                        icon:
                            "error",
                        title:
                            "Pedido",
                        text:
                            err.message ||
                            "No se pudo cargar el pedido."
                    });

                } finally {

                    setLoading(
                        false
                    );

                }

            },
            [
                businessId,
                orderId
            ]
        );

    useEffect(
        () => {

            loadOrder();

        },
        [
            loadOrder
        ]
    );

    useEffect(
        () => {

            if (
                can("orders.items") &&
                searchParams.get(
                    "edit"
                ) ===
                "1"
            ) {

                setEditMode(
                    true
                );

            }

        },
        [
            searchParams
        ]
    );

    useEffect(
        () => {

            if (
                !editMode ||
                products.length
            ) {

                return;

            }

            async function loadProducts() {

                setCatalogLoading(
                    true
                );

                try {

                    const response =
                        await fetch(
                            `/api/store/admin/products/list?businessId=${encodeURIComponent(
                                businessId
                            )}&appType=resto&visible=1`,
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
                            "No se pudo cargar el menú."
                        );

                    }

                    setProducts(
                        Array.isArray(
                            data?.products
                        )
                            ? data.products
                            : []
                    );

                } catch (err) {

                    showAlert({
                        icon:
                            "error",
                        title:
                            "Menú",
                        text:
                            err.message ||
                            "No se pudo cargar el menú."
                    });

                } finally {

                    setCatalogLoading(
                        false
                    );

                }

            }

            loadProducts();

        },
        [
            editMode,
            products.length,
            businessId
        ]
    );

    useEffect(
        () => {

            setSelectedVariantId(
                ""
            );

            setVariants(
                []
            );

            const product =
                products.find(
                    currentProduct =>
                        Number(
                            currentProduct.id
                        ) ===
                        Number(
                            selectedProductId
                        )
                );

            if (
                !product ||
                safeNumber(
                    product.variants_count
                ) <= 0
            ) {

                return;

            }

            async function loadVariants() {

                try {

                    const response =
                        await fetch(
                            `/api/store/admin/products/variants?businessId=${encodeURIComponent(
                                businessId
                            )}&productId=${encodeURIComponent(
                                selectedProductId
                            )}`,
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
                            "No se pudieron cargar las variantes."
                        );

                    }

                    setVariants(
                        Array.isArray(
                            data?.variants
                        )
                            ? data.variants.filter(
                                variant =>
                                    Number(
                                        variant.is_visible
                                    ) === 1
                            )
                            : []
                    );

                } catch (err) {

                    showAlert({
                        icon:
                            "error",
                        title:
                            "Variantes",
                        text:
                            err.message ||
                            "No se pudieron cargar las variantes."
                    });

                }

            }

            loadVariants();

        },
        [
            selectedProductId,
            products,
            businessId
        ]
    );

    const groupedItems =
        useMemo(
            () => {

                const result = {
                    pending:
                        [],
                    sent:
                        [],
                    ready:
                        [],
                    served:
                        [],
                    other:
                        []
                };

                (
                    order?.items ||
                    []
                ).forEach(
                    item => {

                        const status =
                            item.preparation_status;

                        if (
                            Number(
                                item.requires_preparation
                            ) !== 1 ||
                            !result[
                                status
                            ]
                        ) {

                            result.other.push(
                                item
                            );

                            return;

                        }

                        result[
                            status
                        ].push(
                            item
                        );

                    }
                );

                return result;

            },
            [
                order
            ]
        );

    async function postAction(
        url,
        body,
        successMessage
    ) {

        setUpdating(
            true
        );

        try {

            const response =
                await fetch(
                    url,
                    {
                        method:
                            "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body:
                            JSON.stringify(
                                body
                            )
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
                    "No se pudo actualizar el pedido."
                );

            }

            await loadOrder({
                silent:
                    true
            });

            showAlert({
                icon:
                    "success",
                title:
                    "Pedido actualizado",
                text:
                    successMessage,
                timer:
                    1300,
                showConfirmButton:
                    false
            });

        } catch (err) {

            console.error(
                "RESTO ORDER DETAIL ACTION ERROR:",
                err
            );

            showAlert({
                icon:
                    "error",
                title:
                    "Pedido",
                text:
                    err.message ||
                    "No se pudo actualizar el pedido."
            });

        } finally {

            setUpdating(
                false
            );

        }

    }

    async function registerPayment() {

        const result =
            await requestRestoPayment(
                order,
                {
                    currency:
                        store?.currency ||
                        order?.currency ||
                        "ARS"
                }
            );

        if (!result) {

            return;

        }

        await postAction(
            "/api/resto/admin/orders/payment",
            {
                businessId,
                orderId:
                    order.id,
                amount:
                    result.amount,
                payment_method:
                    result.payment_method,
                notes:
                    result.notes
            },
            "El cobro fue registrado."
        );

    }

    async function cancelOrder() {

        const result =
            await requestRestoOrderCancellation(
                order
            );

        if (!result) {

            return;

        }

        await postAction(
            "/api/resto/admin/orders/status",
            {
                businessId,
                orderId:
                    order.id,
                order_status:
                    "cancelled",
                reason:
                    result.reason,
                refund_amount:
                    result.refundAmount,
                refund_method:
                    result.refundMethod
            },
            result.refundableAmount > 0
                ? "El pedido fue cancelado y la devolución quedó registrada."
                : "El pedido fue cancelado."
        );

    }

    async function updateOrderContents(
        changes,
        successMessage
    ) {

        await postAction(
            "/api/resto/admin/orders/items/update",
            {
                businessId,
                orderId:
                    order.id,
                ...changes
            },
            successMessage
        );

    }

    async function removeItem(
        item
    ) {

        const result =
            await showAlert({
                icon:
                    "warning",
                title:
                    "Eliminar plato",
                text:
                    `¿Confirmás eliminar ${item.title} del pedido?`,
                showCancelButton:
                    true,
                confirmButtonText:
                    "Sí, eliminar",
                cancelButtonText:
                    "Volver"
            });

        if (
            !result
        ) {

            return;

        }

        await updateOrderContents(
            {
                action:
                    "remove_item",
                itemId:
                    item.id
            },
            "El plato fue eliminado del pedido."
        );

    }

    async function addItem() {

        if (!selectedProductId) {

            showAlert({
                icon:
                    "info",
                title:
                    "Agregar plato",
                text:
                    "Seleccioná un producto del menú."
            });

            return;

        }

        const selectedProduct =
            products.find(
                product =>
                    Number(
                        product.id
                    ) ===
                    Number(
                        selectedProductId
                    )
            );

        if (
            safeNumber(
                selectedProduct?.variants_count
            ) > 0 &&
            !selectedVariantId
        ) {

            showAlert({
                icon:
                    "info",
                title:
                    "Agregar plato",
                text:
                    "Seleccioná una variante."
            });

            return;

        }

        await updateOrderContents(
            {
                action:
                    "add_item",
                productId:
                    selectedProductId,
                variantId:
                    selectedVariantId ||
                    null,
                quantity:
                    Math.max(
                        1,
                        Math.trunc(
                            safeNumber(
                                newItemQuantity
                            )
                        )
                    ),
                notes:
                    newItemNotes
            },
            "El plato fue agregado al pedido."
        );

        setSelectedProductId(
            ""
        );

        setSelectedVariantId(
            ""
        );

        setNewItemQuantity(
            1
        );

        setNewItemNotes(
            ""
        );

    }

    async function applyDiscount() {

        const normalizedValue =
            safeNumber(
                discountValue
            );

        if (
            normalizedValue < 0
        ) {

            return;

        }

        await updateOrderContents(
            {
                action:
                    "apply_discount",
                discountType,
                discountValue:
                    normalizedValue
            },
            "El descuento fue aplicado."
        );

    }

    async function markItemReady(
        item
    ) {

        const confirmed =
            await showAlert({
                icon:
                    "question",
                title:
                    "Marcar plato como listo",
                text:
                    `¿Confirmás que "${item.title}" está listo para entregar?`,
                showCancelButton:
                    true,
                confirmButtonText:
                    "Sí, marcar listo",
                cancelButtonText:
                    "Volver"
            });

        if (!confirmed) {

            return;

        }

        await postAction(
            "/api/resto/admin/kitchen/ready",
            {
                businessId,
                itemId:
                    item.id
            },
            "El plato fue marcado como listo para entregar."
        );

    }

    async function confirmSession() {

        await postAction(
            "/api/resto/admin/waiter",
            {
                businessId,
                orderId:
                    order.id,
                action:
                    order.session_status ===
                        "pending_activation"
                        ? "activate_session"
                        : "confirm_order"
            },
            "La sesión fue habilitada."
        );

    }

    async function sendToKitchen() {

        await postAction(
            "/api/resto/admin/orders/send-to-kitchen",
            {
                businessId,
                orderId:
                    order.id
            },
            "Los platos pendientes fueron enviados a Cocina."
        );

    }

    async function deliverOrder() {

        await postAction(
            "/api/resto/admin/waiter",
            {
                businessId,
                orderId:
                    order.id,
                action:
                    "serve_ready"
            },
            "Los productos listos fueron marcados como entregados."
        );

    }

    async function closeSession() {

        const confirmed =
            await showAlert({
                icon:
                    "question",
                title:
                    "Cerrar pedido",
                text:
                    "El pedido saldrá de la operación activa y pasará al historial.",
                showCancelButton:
                    true,
                confirmButtonText:
                    "Sí, cerrar",
                cancelButtonText:
                    "Volver"
            });

        if (!confirmed) {

            return;

        }

        await postAction(
            "/api/resto/admin/waiter",
            {
                businessId,
                orderId:
                    order.id,
                action:
                    "close_session"
            },
            "La sesión fue cerrada y pasó al historial."
        );

    }

    function canRemoveItem(
        item
    ) {

        if (
            Number(
                item.requires_preparation
            ) !== 1
        ) {

            return true;

        }

        return [
            "pending",
            "sent"
        ].includes(
            item.preparation_status
        );

    }

    function renderOrderItem(
        item,
        currency
    ) {

        return (
            <div
                key={item.id}
                className="list-group-item px-0"
            >
                <div className="d-flex justify-content-between gap-3">
                    <div>
                        <strong>
                            {item.title}
                            {" ×"}
                            {safeNumber(
                                item.quantity
                            )}
                        </strong>

                        {
                            item.variant_title && (
                                <small className="d-block text-muted">
                                    {item.variant_title}
                                </small>
                            )
                        }
                    </div>

                    <div className="d-flex align-items-start gap-2">
                        <span>
                            {formatRestoOrderPrice(
                                item.total_price,
                                currency
                            )}
                        </span>

                        {
                            item.preparation_status ===
                                "sent" &&
                            can("kitchen.ready") &&
                            !isClosed && (
                                <button
                                    type="button"
                                    className="tags_resto_btn tags_resto_btn_success tags_resto_btn_sm"
                                    disabled={updating}
                                    onClick={() =>
                                        markItemReady(
                                            item
                                        )
                                    }
                                    title="Marcar listo para entregar"
                                >
                                    <FaCheck />
                                    Listo
                                </button>
                            )
                        }

                        {
                            editMode &&
                            can("orders.items") &&
                            canRemoveItem(
                                item
                            ) && (
                                <button
                                    type="button"
                                    className="tags_resto_btn tags_resto_btn_danger tags_resto_btn_sm"
                                    disabled={updating}
                                    onClick={() =>
                                        removeItem(
                                            item
                                        )
                                    }
                                    title="Eliminar plato"
                                >
                                    <FaTimes />
                                </button>
                            )
                        }
                    </div>
                </div>

                {
                    item.notes && (
                        <p className="mb-0 mt-1">
                            {item.notes}
                        </p>
                    )
                }
            </div>
        );

    }

    if (loading) {

        return (
            <div className="tags_resto_orders_loading">
                <TagsSpinner />
            </div>
        );

    }

    if (!order) {

        return (
            <main className="container py-5">
                <div className="tags_resto_btn_group">
                    <button
                        type="button"
                        className="tags_resto_btn tags_resto_btn_secondary"
                        onClick={() =>
                            router.push(
                                `/dashboard/businesses/${businessId}/resto`
                            )
                        }
                    >
                        <FaHome />
                        Inicio
                    </button>

                    <button
                        type="button"
                        className="tags_resto_btn tags_resto_btn_secondary"
                        onClick={() =>
                            router.push(
                                `/dashboard/businesses/${businessId}/resto/orders`
                            )
                        }
                    >
                        <FaArrowLeft />
                        Pedidos
                    </button>
                </div>

                <div className="alert alert-warning mt-4">
                    Pedido no encontrado.
                </div>
            </main>
        );

    }

    const currency =
        store?.currency ||
        order.currency ||
        "ARS";

    const kitchen =
        order.kitchen ||
        {};

    const prepared =
        safeNumber(
            kitchen.ready
        ) +
        safeNumber(
            kitchen.served
        );

    const kitchenTotal =
        safeNumber(
            kitchen.total
        );

    const isClosed =
        [
            "completed",
            "cancelled"
        ].includes(
            order.order_status
        ) ||
        [
            "closed",
            "cancelled"
        ].includes(
            order.session_status
        );

    const pendingKitchenItems =
        (
            Array.isArray(
                order.items
            )
                ? order.items
                : []
        ).filter(
            item =>
                Number(
                    item.requires_preparation
                ) === 1 &&
                item.preparation_status ===
                "pending"
        );

    const hasBlockingItems =
        (
            Array.isArray(
                order.items
            )
                ? order.items
                : []
        ).some(
            item =>
                [
                    "pending",
                    "sent",
                    "ready"
                ].includes(
                    item.preparation_status
                )
        );

    const needsConfirmation =
        [
            "pending_activation",
            "pending_confirmation"
        ].includes(
            order.session_status
        );

    const canSendToKitchen =
        !isClosed &&
        !needsConfirmation &&
        pendingKitchenItems.length >
        0;

    const canDeliver =
        !isClosed &&
        order.order_status ===
        "ready";

    const canClose =
        !isClosed &&
        safeNumber(
            order.pending_amount
        ) <= 0 &&
        !hasBlockingItems;

    return (
        <main className="container py-4 pb-5 mb-5">

            <div className="tags_resto_btn_group mb-4">
                <button
                    type="button"
                    className="tags_resto_btn tags_resto_btn_secondary"
                    onClick={() =>
                        router.push(
                            `/dashboard/businesses/${businessId}/resto`
                        )
                    }
                >
                    <FaHome />
                    Inicio
                </button>

                <button
                    type="button"
                    className="tags_resto_btn tags_resto_btn_secondary"
                    onClick={() =>
                        router.push(
                            `/dashboard/businesses/${businessId}/resto/orders`
                        )
                    }
                >
                    <FaArrowLeft />
                    Pedidos
                </button>
            </div>

            <section className="tags_resto_order_card mb-4">
                <div className="d-flex flex-wrap justify-content-between gap-3 align-items-start">
                    <div>
                        <span className="tags_resto_order_card_location_label">
                            {getRestoOrderServiceModeLabel(order)}
                        </span>

                        <h1 className="h2 mt-2 mb-1">
                            {getRestoOrderLocationName(order) ||
                                formatRestoCustomerName(order)}
                        </h1>

                        <strong className="d-block">
                            Pedido {formatRestoOrderNumber(order)}
                        </strong>
                    </div>

                    <div className="text-end">
                        <span
                            className={`tags_resto_order_status tags_resto_order_status_${order.order_status}`}
                        >
                            {orderStatusLabels[
                                order.order_status
                            ] ||
                                order.order_status}
                        </span>

                        <div className="mt-3">
                            <FaClock className="me-2" />
                            {getRestoOrderElapsedTime(
                                order.created_at
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {
                kitchenTotal > 0 && (
                    <section className="tags_resto_order_card mb-4">
                        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
                            <div>
                                <strong className="d-block">
                                    Progreso de cocina
                                </strong>

                                <span>
                                    {prepared} / {kitchenTotal} preparados
                                </span>
                            </div>

                            {
                                can("kitchen.view") &&
                                safeNumber(
                                    kitchen.sent
                                ) > 0 && (
                                    <button
                                        type="button"
                                        className="tags_resto_btn tags_resto_btn_warning"
                                        onClick={() =>
                                            router.push(
                                                `/dashboard/businesses/${businessId}/resto/kitchen`
                                            )
                                        }
                                    >
                                        <FaFire />
                                        Ver Cocina
                                    </button>
                                )
                            }
                        </div>

                        <div
                            className="progress"
                            role="progressbar"
                            aria-valuenow={
                                safeNumber(
                                    kitchen.progress
                                )
                            }
                            aria-valuemin="0"
                            aria-valuemax="100"
                        >
                            <div
                                className="progress-bar bg-success"
                                style={{
                                    width:
                                        `${safeNumber(
                                            kitchen.progress
                                        )}%`
                                }}
                            />
                        </div>

                        <small className="d-block mt-2">
                            {safeNumber(
                                kitchen.pending
                            )} pendientes ·{" "}
                            {safeNumber(
                                kitchen.sent
                            )} en preparación
                        </small>
                    </section>
                )
            }

            {
                itemGroups.map(
                    group => {

                        const items =
                            groupedItems[
                                group.key
                            ];

                        if (!items.length) {

                            return null;

                        }

                        return (
                            <section
                                key={group.key}
                                className="tags_resto_order_card mb-4"
                            >
                                <h2 className="h5 text-uppercase mb-3">
                                    <span className="me-2">
                                        {group.icon}
                                    </span>
                                    {group.title}
                                </h2>

                                <div className="list-group list-group-flush">
                                    {
                                        items.map(
                                            item =>
                                                renderOrderItem(
                                                    item,
                                                    currency
                                                )
                                        )
                                    }
                                </div>
                            </section>
                        );

                    }
                )
            }

            {
                groupedItems.other.length > 0 && (
                    <section className="tags_resto_order_card mb-4">
                        <h2 className="h5 text-uppercase mb-3">
                            Otros productos
                        </h2>

                        <div className="list-group list-group-flush">
                            {
                                groupedItems.other.map(
                                    item =>
                                        renderOrderItem(
                                            item,
                                            currency
                                        )
                                )
                            }
                        </div>
                    </section>
                )
            }

            {
                editMode &&
                can("orders.items") && (
                    <section className="tags_resto_order_card mb-4">
                        <div className="d-flex justify-content-between align-items-center gap-3 mb-4">
                            <h2 className="h5 text-uppercase mb-0">
                                Editar pedido
                            </h2>

                            <button
                                type="button"
                                className="tags_resto_btn tags_resto_btn_ghost tags_resto_btn_sm"
                                disabled={updating}
                                onClick={() =>
                                    setEditMode(
                                        false
                                    )
                                }
                            >
                                <FaTimes />
                                Cerrar edición
                            </button>
                        </div>

                        <div className="row g-3">
                            <div className="col-12">
                                <h3 className="h6">
                                    Agregar plato
                                </h3>
                            </div>

                            <div className="col-12 col-lg-5">
                                <label
                                    className="form-label"
                                    htmlFor="resto-order-product"
                                >
                                    Producto
                                </label>

                                <select
                                    id="resto-order-product"
                                    className="form-select"
                                    value={selectedProductId}
                                    disabled={
                                        updating ||
                                        catalogLoading
                                    }
                                    onChange={event =>
                                        setSelectedProductId(
                                            event.target.value
                                        )
                                    }
                                >
                                    <option value="">
                                        {catalogLoading
                                            ? "Cargando menú..."
                                            : "Seleccionar producto"}
                                    </option>

                                    {
                                        products.map(
                                            product => (
                                                <option
                                                    key={product.id}
                                                    value={product.id}
                                                >
                                                    {product.title}
                                                </option>
                                            )
                                        )
                                    }
                                </select>
                            </div>

                            {
                                variants.length > 0 && (
                                    <div className="col-12 col-lg-4">
                                        <label
                                            className="form-label"
                                            htmlFor="resto-order-variant"
                                        >
                                            Variante
                                        </label>

                                        <select
                                            id="resto-order-variant"
                                            className="form-select"
                                            value={selectedVariantId}
                                            disabled={updating}
                                            onChange={event =>
                                                setSelectedVariantId(
                                                    event.target.value
                                                )
                                            }
                                        >
                                            <option value="">
                                                Seleccionar variante
                                            </option>

                                            {
                                                variants.map(
                                                    variant => (
                                                        <option
                                                            key={variant.id}
                                                            value={variant.id}
                                                        >
                                                            {variant.options_label ||
                                                                variant.title ||
                                                                variant.sku}
                                                        </option>
                                                    )
                                                )
                                            }
                                        </select>
                                    </div>
                                )
                            }

                            <div className="col-6 col-lg-2">
                                <label
                                    className="form-label"
                                    htmlFor="resto-order-quantity"
                                >
                                    Cantidad
                                </label>

                                <input
                                    id="resto-order-quantity"
                                    type="number"
                                    className="form-control"
                                    min="1"
                                    step="1"
                                    value={newItemQuantity}
                                    disabled={updating}
                                    onChange={event =>
                                        setNewItemQuantity(
                                            event.target.value
                                        )
                                    }
                                />
                            </div>

                            <div className="col-12 col-lg-8">
                                <label
                                    className="form-label"
                                    htmlFor="resto-order-item-notes"
                                >
                                    Observaciones del plato
                                </label>

                                <input
                                    id="resto-order-item-notes"
                                    type="text"
                                    className="form-control"
                                    value={newItemNotes}
                                    disabled={updating}
                                    placeholder="Ej: sin queso"
                                    onChange={event =>
                                        setNewItemNotes(
                                            event.target.value
                                        )
                                    }
                                />
                            </div>

                            <div className="col-12 col-lg-4 d-flex align-items-end">
                                <button
                                    type="button"
                                    className="tags_resto_btn tags_resto_btn_primary"
                                    disabled={
                                        updating ||
                                        !selectedProductId
                                    }
                                    onClick={addItem}
                                >
                                    Agregar al pedido
                                </button>
                            </div>
                        </div>

                        <hr className="my-4" />

                        <div className="row g-3 align-items-end">
                            <div className="col-12">
                                <h3 className="h6">
                                    Descuento
                                </h3>
                            </div>

                            <div className="col-12 col-md-4">
                                <label
                                    className="form-label"
                                    htmlFor="resto-order-discount-type"
                                >
                                    Tipo
                                </label>

                                <select
                                    id="resto-order-discount-type"
                                    className="form-select"
                                    value={discountType}
                                    disabled={updating}
                                    onChange={event =>
                                        setDiscountType(
                                            event.target.value
                                        )
                                    }
                                >
                                    <option value="fixed">
                                        Monto fijo
                                    </option>
                                    <option value="percentage">
                                        Porcentaje
                                    </option>
                                </select>
                            </div>

                            <div className="col-12 col-md-4">
                                <label
                                    className="form-label"
                                    htmlFor="resto-order-discount-value"
                                >
                                    {discountType === "percentage"
                                        ? "Porcentaje"
                                        : "Importe"}
                                </label>

                                <input
                                    id="resto-order-discount-value"
                                    type="number"
                                    className="form-control"
                                    min="0"
                                    max={
                                        discountType === "percentage"
                                            ? "100"
                                            : undefined
                                    }
                                    step="0.01"
                                    value={discountValue}
                                    disabled={updating}
                                    onChange={event =>
                                        setDiscountValue(
                                            event.target.value
                                        )
                                    }
                                />
                            </div>

                            <div className="col-12 col-md-4">
                                <button
                                    type="button"
                                    className="tags_resto_btn tags_resto_btn_success"
                                    disabled={
                                        updating ||
                                        discountValue ===
                                        ""
                                    }
                                    onClick={applyDiscount}
                                >
                                    Aplicar descuento
                                </button>
                            </div>
                        </div>
                    </section>
                )
            }

            <section className="tags_resto_order_card mb-4">
                <h2 className="h5 text-uppercase mb-3">
                    Total
                </h2>

                <div className="d-grid gap-2">
                    <div className="d-flex justify-content-between">
                        <span>Subtotal</span>
                        <strong>
                            {formatRestoOrderPrice(
                                order.subtotal,
                                currency
                            )}
                        </strong>
                    </div>

                    <div className="d-flex justify-content-between">
                        <span>Descuento</span>
                        <strong>
                            {formatRestoOrderPrice(
                                order.discount_total,
                                currency
                            )}
                        </strong>
                    </div>

                    <div className="d-flex justify-content-between fs-5">
                        <span>Total</span>
                        <strong>
                            {formatRestoOrderPrice(
                                order.total,
                                currency
                            )}
                        </strong>
                    </div>

                    <div className="d-flex justify-content-between text-success">
                        <span>Pagado</span>
                        <strong>
                            {formatRestoOrderPrice(
                                order.paid_total,
                                currency
                            )}
                        </strong>
                    </div>

                    <div className="d-flex justify-content-between">
                        <span>Saldo</span>
                        <strong>
                            {formatRestoOrderPrice(
                                order.pending_amount,
                                currency
                            )}
                        </strong>
                    </div>
                </div>
            </section>

            {
                order.notes && (
                    <section className="tags_resto_order_card mb-4">
                        <h2 className="h5 text-uppercase mb-3">
                            Observaciones
                        </h2>

                        <p className="mb-0">
                            {order.notes}
                        </p>
                    </section>
                )
            }

            <section className="tags_resto_order_card">
                <h2 className="h5 text-uppercase mb-3">
                    Acciones
                </h2>

                <div className="d-flex flex-wrap gap-2">
                    {
                        needsConfirmation &&
                        can("tables.open") && (
                            <button
                                type="button"
                                className="tags_resto_btn tags_resto_btn_success"
                                disabled={updating}
                                onClick={confirmSession}
                            >
                                <FaCheck />
                                {
                                    order.session_status ===
                                        "pending_activation"
                                        ? "Habilitar atención"
                                        : "Confirmar pedido"
                                }
                            </button>
                        )
                    }

                    {
                        canSendToKitchen &&
                        can("orders.items") && (
                            <button
                                type="button"
                                className="tags_resto_btn tags_resto_btn_warning"
                                disabled={updating}
                                onClick={sendToKitchen}
                            >
                                <FaFire />
                                Enviar a Cocina
                            </button>
                        )
                    }

                    {
                        canDeliver &&
                        can("orders.deliver") && (
                            <button
                                type="button"
                                className="tags_resto_btn tags_resto_btn_secondary"
                                disabled={updating}
                                onClick={deliverOrder}
                            >
                                <FaUtensils />
                                Entregar pedido
                            </button>
                        )
                    }

                    {
                        canClose &&
                        can("tables.close") && (
                            <button
                                type="button"
                                className="tags_resto_btn tags_resto_btn_primary"
                                disabled={updating}
                                onClick={closeSession}
                            >
                                <FaCheck />
                                Cerrar pedido
                            </button>
                        )
                    }

                    {can("orders.items") && <button
                        type="button"
                        className="tags_resto_btn tags_resto_btn_secondary"
                        disabled={
                            updating ||
                            isClosed
                        }
                        onClick={() =>
                            setEditMode(
                                true
                            )
                        }
                    >
                        <FaPen />
                        Editar pedido
                    </button>}

                    {can("orders.payment") && <button
                        type="button"
                        className="tags_resto_btn tags_resto_btn_success"
                        disabled={
                            updating ||
                            isClosed ||
                            safeNumber(
                                order.pending_amount
                            ) <= 0
                        }
                        onClick={registerPayment}
                    >
                        <FaCashRegister />
                        Registrar cobro
                    </button>}

                    {can("orders.cancel") && <button
                        type="button"
                        className="tags_resto_btn tags_resto_btn_danger"
                        disabled={
                            updating ||
                            isClosed
                        }
                        onClick={cancelOrder}
                    >
                        <FaTimes />
                        Cancelar pedido
                    </button>}
                </div>
            </section>

        </main>
    );

}
