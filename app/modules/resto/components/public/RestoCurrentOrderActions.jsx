// =====================================
// FILE: app/modules/resto/components/public/RestoCurrentOrderActions.jsx
// Descripción:
// Acciones disponibles para el pedido activo.
// =====================================

"use client";

import Link
    from "next/link";

import {
    Button,
    Spinner
}
    from "react-bootstrap";

import {
    FaBasketShopping,
    FaReceipt,
    FaBellConcierge,
    FaArrowLeft
} from "react-icons/fa6";






export default function RestoCurrentOrderActions({

    slug,

    backUrl,

    isSessionOpen,

    canRequestService,

    canCancelSession,

    session,

    sending,

    actionLoading,

    continueShopping,

    requestBill,

    callWaiter,

    cancelSession,

    getStatusLabel

}) {

    return (

        <div className="tags_resto_current_order_actions">

            {

                isSessionOpen && (

                    <Button
                        type="button"
                        variant="outline-primary"
                        className="tags_resto_current_order_continue_button"
                        disabled={
                            sending ||
                            Boolean(actionLoading)
                        }
                        onClick={continueShopping}
                    >

                        <FaBasketShopping className="tags_resto_current_order_button_icon" />

                        Seguir agregando productos

                    </Button>

                )

            }

            {

                isSessionOpen &&
                canRequestService && (

                    <Button
                        type="button"
                        variant="success"
                        className="tags_resto_current_order_bill_button"
                        disabled={
                            sending ||
                            Boolean(actionLoading)
                        }
                        onClick={requestBill}
                    >

                        {

                            actionLoading === "bill"

                                ? (

                                    <>

                                        <Spinner
                                            animation="border"
                                            size="sm"
                                            className="me-2"
                                        />

                                        Enviando...

                                    </>

                                )

                                : (

                                    <>

                                        <FaReceipt className="tags_resto_current_order_button_icon" />

                                        {
                                            session.status ===
                                                "bill_requested"
                                                ? "Volver a pedir la cuenta"
                                                : "Pedir la cuenta"
                                        }

                                    </>

                                )

                        }

                    </Button>

                )

            }

            {

                isSessionOpen &&
                canRequestService && (

                    <Button
                        type="button"
                        variant="secondary"
                        className="tags_resto_current_order_waiter_button"
                        disabled={
                            sending ||
                            Boolean(actionLoading)
                        }
                        onClick={callWaiter}
                    >

                        {

                            actionLoading === "waiter"

                                ? (

                                    <>

                                        <Spinner
                                            animation="border"
                                            size="sm"
                                            className="me-2"
                                        />

                                        Enviando...

                                    </>

                                )

                                : (

                                    <>

                                        <FaBellConcierge className="tags_resto_current_order_button_icon" />

                                        Llamar al personal

                                    </>

                                )

                        }

                    </Button>

                )

            }

            {

                !isSessionOpen && (

                    <div className="tags_resto_current_order_closed_notice">

                        <strong>
                            {
                                getStatusLabel(
                                    session.payment_status ===
                                        "paid"
                                        ? "paid"
                                        : session.status
                                )
                            }
                        </strong>

                        <p>
                            Este pedido ya no admite modificaciones.
                        </p>

                    </div>

                )

            }

            {

                canCancelSession && (

                    <Button
                        type="button"
                        variant="danger"
                        disabled={
                            sending ||
                            Boolean(actionLoading)
                        }
                        onClick={cancelSession}
                    >
                        {
                            actionLoading ===
                                "cancel"
                                ? "Cancelando..."
                                : "Cancelar pedido"
                        }
                    </Button>

                )

            }

            <Link
                href={backUrl || `/p/${slug}`}
                className="tags_resto_current_order_back_link"
            >
                Volver a la carta
            </Link>

        </div>

    );

}
