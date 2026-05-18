"use client";

import { useEffect, useState } from "react";

import TagsHeader from "@/app/components/Header";

export default function SaleDetailPage({
    params
}) {

    const [sale, setSale] =
        useState(null);

    const [loading, setLoading] =
        useState(true);

    // =====================================
    // LOAD
    // =====================================

    useEffect(() => {

        load();

    }, []);

    async function load() {

        try {

            const res =
                await fetch(
                    `/api/sales/detail?id=${params.id}`,
                    {
                        cache: "no-store"
                    }
                );

            const data =
                await res.json();

            setSale(data.data);

        } catch (err) {

            console.log(err);

        } finally {

            setLoading(false);
        }
    }

    // =====================================
    // BADGE
    // =====================================

    function badge(status) {

        switch (status) {

            case "pending":
                return "badge pending";

            case "partial":
                return "badge active";

            case "completed":
                return "badge success";

            case "cancelled":
                return "badge danger";

            case "done":
                return "badge success";

            case "in_progress":
                return "badge active";

            default:
                return "badge";
        }
    }

    // =====================================
    // LOADING
    // =====================================

    if (loading) {

        return (
            <div className="p-4">
                Cargando...
            </div>
        );
    }

    if (!sale) {

        return (
            <div className="p-4">
                Venta no encontrada
            </div>
        );
    }

    // =====================================
    // TOTALS
    // =====================================

    let total = 0;
    let delivered = 0;

    for (const item of sale.items) {

        total += item.quantity;

        delivered +=
            item.delivered_quantity;
    }

    const progress =
        total > 0
            ? Math.round(
                (delivered * 100) / total
            )
            : 0;

    // =====================================
    // UI
    // =====================================

    return (
        <div className="container-fluid tags_container m-0 p-0">

            <TagsHeader />

            <div className="p-4">

                {/* HEADER */}

                <div className="d-flex justify-content-between align-items-center mb-4">

                    <div>

                        <h2 className="tags_title">
                            💰 Venta #{sale.id}
                        </h2>

                        <div className="mt-2">

                            <div>
                                Cliente:
                                <b className="ms-2">
                                    {sale.business_name}
                                </b>
                            </div>

                            <div>
                                Fecha:
                                <b className="ms-2">
                                    {sale.created_at}
                                </b>
                            </div>

                        </div>

                    </div>

                    <div>

                        <span className={badge(sale.status)}>
                            {sale.status}
                        </span>

                    </div>

                </div>

                {/* PROGRESS */}

                <div className="mb-4">

                    <div className="d-flex justify-content-between mb-2">

                        <b>
                            Progreso
                        </b>

                        <b>
                            {progress}%
                        </b>

                    </div>

                    <div
                        style={{
                            height: 20,
                            background: "#ddd",
                            borderRadius: 20,
                            overflow: "hidden"
                        }}
                    >

                        <div
                            style={{
                                width: `${progress}%`,
                                height: "100%",
                                background: "#198754"
                            }}
                        />

                    </div>

                </div>

                {/* NOTES */}

                <div className="mb-4">

                    <h5>
                        Notas
                    </h5>

                    <div
                        className="p-3"
                        style={{
                            background: "#f5f5f5",
                            borderRadius: 10
                        }}
                    >
                        {sale.notes || "-"}
                    </div>

                </div>

                {/* ITEMS */}

                {sale.items.map(item => {

                    const missing =
                        item.quantity
                        - item.delivered_quantity;

                    return (

                        <div
                            key={item.id}
                            className="mb-5 p-4"
                            style={{
                                border: "1px solid #ddd",
                                borderRadius: 14,
                                background: "#fff"
                            }}
                        >

                            {/* ITEM HEADER */}

                            <div className="d-flex justify-content-between mb-3">

                                <div>

                                    <h4>
                                        {item.product_name}
                                    </h4>

                                    <div className="mt-2">

                                        <div>
                                            Vendidos:
                                            <b className="ms-2">
                                                {item.quantity}
                                            </b>
                                        </div>

                                        <div>
                                            Entregados:
                                            <b className="ms-2">
                                                {item.delivered_quantity}
                                            </b>
                                        </div>

                                        <div>
                                            Faltan:
                                            <b className="ms-2">
                                                {missing}
                                            </b>
                                        </div>

                                    </div>

                                </div>

                                <div>

                                    <span className={
                                        badge(
                                            missing <= 0
                                                ? "completed"
                                                : item.delivered_quantity > 0
                                                    ? "partial"
                                                    : "pending"
                                        )
                                    }>
                                        {
                                            missing <= 0
                                                ? "completed"
                                                : item.delivered_quantity > 0
                                                    ? "partial"
                                                    : "pending"
                                        }
                                    </span>

                                </div>

                            </div>

                            {/* QR */}

                            <div className="mb-4">

                                <h5 className="mb-3">
                                    QR Asociados
                                </h5>

                                <table className="table">

                                    <thead>

                                        <tr>

                                            <th>ID</th>

                                            <th>QR</th>

                                            <th>Estado</th>

                                            <th>OP</th>

                                        </tr>

                                    </thead>

                                    <tbody>

                                        {item.qrs.map(qr => (

                                            <tr key={qr.id}>

                                                <td>
                                                    {qr.id}
                                                </td>

                                                <td>
                                                    {qr.code}
                                                </td>

                                                <td>
                                                    {qr.status}
                                                </td>

                                                <td>
                                                    {
                                                        qr.production_order_id
                                                        || "-"
                                                    }
                                                </td>

                                            </tr>

                                        ))}

                                    </tbody>

                                </table>

                            </div>

                            {/* OPS */}

                            <div>

                                <h5 className="mb-3">
                                    Ordenes de Producción
                                </h5>

                                <table className="table">

                                    <thead>

                                        <tr>

                                            <th>ID</th>

                                            <th>Cantidad</th>

                                            <th>Producidos</th>

                                            <th>Estado</th>

                                            <th>Notas</th>

                                        </tr>

                                    </thead>

                                    <tbody>

                                        {item.production_orders.map(op => (

                                            <tr key={op.id}>

                                                <td>
                                                    #{op.id}
                                                </td>

                                                <td>
                                                    {op.quantity}
                                                </td>

                                                <td>
                                                    {op.produced_quantity}
                                                </td>

                                                <td>

                                                    <span className={badge(op.status)}>
                                                        {op.status}
                                                    </span>

                                                </td>

                                                <td>
                                                    {op.notes}
                                                </td>

                                            </tr>

                                        ))}

                                    </tbody>

                                </table>

                            </div>

                        </div>
                    );
                })}

            </div>

        </div>
    );
}