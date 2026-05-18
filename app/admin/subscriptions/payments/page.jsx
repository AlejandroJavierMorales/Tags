"use client";

import { useEffect, useState } from "react";

import "../../../styles/tagsModals.css";

import TagsHeader from "../../../components/Header";

import showAlert from "@/app/components/showAlert";

export default function SubscriptionPaymentsPage() {

    const [list, setList] =
        useState([]);

    const [subscriptions, setSubscriptions] =
        useState([]);

    const [createOpen, setCreateOpen] =
        useState(false);

    const [subscriptionId,
        setSubscriptionId] =
        useState("");

    const [amount,
        setAmount] =
        useState("");

    const [paymentMethod,
        setPaymentMethod] =
        useState("transfer");

    const [reference,
        setReference] =
        useState("");

    const [notes,
        setNotes] =
        useState("");

    // =====================================
    // LOAD
    // =====================================

    useEffect(() => {

        loadPayments();
        loadSubscriptions();

    }, []);

    async function loadPayments() {

        const res =
            await fetch(
                "/api/subscription-payments/get",
                {
                    cache: "no-store"
                }
            );

        const data =
            await res.json();

        setList(data.data || []);
    }

    async function loadSubscriptions() {

        const res =
            await fetch(
                "/api/subscriptions/get-active"
            );

        const data =
            await res.json();

        setSubscriptions(data.data || []);
    }

    // =====================================
    // CREATE
    // =====================================

    async function createPayment() {

        const res =
            await fetch(
                "/api/subscription-payments/create",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        subscription_id:
                            Number(subscriptionId),

                        amount:
                            Number(amount),

                        payment_method:
                            paymentMethod,

                        reference,

                        notes
                    })
                }
            );

        const data =
            await res.json();

        if (!res.ok) {

            showAlert({
                title: "Error",
                text: data.error,
                icon: "error"
            });

            return;
        }

        showAlert({
            title: "OK",
            text: "Pago registrado",
            icon: "success"
        });

        setCreateOpen(false);

        setSubscriptionId("");
        setAmount("");
        setReference("");
        setNotes("");

        loadPayments();
    }

    // =====================================
    // BADGE
    // =====================================

    function badge(status) {

        switch (status) {

            case "paid":
                return "badge success";

            case "pending":
                return "badge pending";

            case "cancelled":
                return "badge danger";

            default:
                return "badge";
        }
    }

    // =====================================
    // UI
    // =====================================

    return (
        <div className="container-fluid tags_container m-0 p-0">

            <TagsHeader />

            <div className="p-3">

                <div className="d-flex justify-content-between align-items-center mb-4">

                    <h2 className="tags_title">
                        💳 Pagos de Suscripciones
                    </h2>

                    <button
                        className="tags_btn"
                        style={{ maxWidth: 180 }}
                        onClick={() =>
                            setCreateOpen(true)
                        }
                    >
                        ✚ Registrar Pago
                    </button>

                </div>

                {/* TABLE */}

                <div className="tags_table_wrapper">

                    <table className="tags_table">

                        <thead>

                            <tr>

                                <th>ID</th>
                                <th>Cliente</th>
                                <th>Plan</th>
                                <th>Monto</th>
                                <th>Método</th>
                                <th>Fecha</th>
                                <th>Estado</th>

                            </tr>

                        </thead>

                        <tbody>

                            {list.map(row => (

                                <tr key={row.id}>

                                    <td>
                                        #{row.id}
                                    </td>

                                    <td>
                                        {row.business_name}
                                    </td>

                                    <td>
                                        {row.plan_name}
                                    </td>

                                    <td>
                                        $
                                        {Number(row.amount)
                                            .toLocaleString("es-AR")}
                                    </td>

                                    <td>
                                        {row.payment_method}
                                    </td>

                                    <td>
                                        {row.paid_at}
                                    </td>

                                    <td>

                                        <span className={badge(row.status)}>
                                            {row.status}
                                        </span>

                                    </td>

                                </tr>

                            ))}

                        </tbody>

                    </table>

                </div>

            </div>

            {/* MODAL */}

            {createOpen && (

                <div className="tags_modal_overlay">

                    <div
                        className="tags_modal_card"
                        style={{
                            maxWidth: 700
                        }}
                    >

                        <button
                            className="tags_modal_close"
                            onClick={() =>
                                setCreateOpen(false)
                            }
                        >
                            ✕
                        </button>

                        <div className="tags_modal_header">

                            <h2 className="tags_modal_title">
                                Registrar Pago
                            </h2>

                        </div>

                        <div className="tags_modal_body">

                            <div className="tags_modal_group">

                                <label>
                                    Suscripción
                                </label>

                                <select
                                    className="tags_modal_input"
                                    value={subscriptionId}
                                    onChange={(e) =>
                                        setSubscriptionId(
                                            e.target.value
                                        )
                                    }
                                >

                                    <option value="">
                                        Seleccionar
                                    </option>

                                    {subscriptions.map(s => (

                                        <option
                                            key={s.id}
                                            value={s.id}
                                        >
                                            {s.business_name}
                                            {" - "}
                                            {s.plan_name}
                                        </option>

                                    ))}

                                </select>

                            </div>

                            <div className="tags_modal_group">

                                <label>
                                    Monto
                                </label>

                                <input
                                    type="number"
                                    className="tags_modal_input"
                                    value={amount}
                                    onChange={(e) =>
                                        setAmount(
                                            e.target.value
                                        )
                                    }
                                />

                            </div>

                            <div className="tags_modal_group">

                                <label>
                                    Método
                                </label>

                                <select
                                    className="tags_modal_input"
                                    value={paymentMethod}
                                    onChange={(e) =>
                                        setPaymentMethod(
                                            e.target.value
                                        )
                                    }
                                >

                                    <option value="transfer">
                                        Transferencia
                                    </option>

                                    <option value="cash">
                                        Efectivo
                                    </option>

                                    <option value="mercadopago">
                                        MercadoPago
                                    </option>

                                </select>

                            </div>

                            <div className="tags_modal_group">

                                <label>
                                    Referencia
                                </label>

                                <input
                                    className="tags_modal_input"
                                    value={reference}
                                    onChange={(e) =>
                                        setReference(
                                            e.target.value
                                        )
                                    }
                                />

                            </div>

                            <div className="tags_modal_group">

                                <label>
                                    Notas
                                </label>

                                <textarea
                                    rows={4}
                                    className="tags_modal_input"
                                    value={notes}
                                    onChange={(e) =>
                                        setNotes(
                                            e.target.value
                                        )
                                    }
                                />

                            </div>

                        </div>

                        <div className="tags_modal_actions">

                            <button
                                className="tags_modal_btn tags_modal_btn_success"
                                onClick={createPayment}
                            >
                                💾 Guardar Pago
                            </button>

                        </div>

                    </div>

                </div>
            )}

        </div>
    );
}