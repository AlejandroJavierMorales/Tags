"use client";

import Swal
    from "sweetalert2";

import {
    formatRestoOrderPrice
} from "./restoOrderFormatters";

function safeNumber(value) {

    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : 0;

}

export async function requestRestoOrderCancellation(
    order
) {

    const refundableAmount =
        Math.max(
            safeNumber(order?.paid_total) -
            safeNumber(order?.refunded_total),
            0
        );

    const result =
        await Swal.fire({
            icon:
                "warning",
            title:
                "Cancelar pedido",
            html:
                `
                <div style="text-align:left">
                    <label
                        for="resto-cancellation-reason"
                        style="display:block;margin-bottom:6px;font-weight:600"
                    >
                        Motivo de cancelación
                    </label>
                    <textarea
                        id="resto-cancellation-reason"
                        class="swal2-textarea"
                        style="width:100%;margin:0 0 16px"
                        placeholder="Indicá el motivo"
                    ></textarea>
                    ${
                        refundableAmount > 0
                            ? `
                                <label
                                    for="resto-refund-amount"
                                    style="display:block;margin-bottom:6px;font-weight:600"
                                >
                                    Monto a devolver
                                </label>
                                <input
                                    id="resto-refund-amount"
                                    class="swal2-input"
                                    type="number"
                                    min="0.01"
                                    max="${refundableAmount}"
                                    step="0.01"
                                    value="${refundableAmount}"
                                    style="width:100%;margin:0"
                                />
                                <small style="display:block;margin-top:7px;color:#667085">
                                    Cobrado disponible para devolver:
                                    ${formatRestoOrderPrice(
                                        refundableAmount,
                                        order?.currency || "ARS"
                                    )}
                                </small>
                                <label
                                    for="resto-refund-method"
                                    style="display:block;margin:14px 0 6px;font-weight:600"
                                >
                                    Método de devolución
                                </label>
                                <select
                                    id="resto-refund-method"
                                    class="swal2-select"
                                    style="display:block;width:100%;margin:0"
                                >
                                    <option value="cash">Efectivo</option>
                                    <option value="transfer">Transferencia</option>
                                    <option value="card">Tarjeta</option>
                                    <option value="mercado_pago">Mercado Pago</option>
                                    <option value="other">Otro</option>
                                </select>
                            `
                            : ""
                    }
                </div>
                `,
            showCancelButton:
                true,
            confirmButtonText:
                "Sí, cancelar",
            cancelButtonText:
                "Volver",
            confirmButtonColor:
                "#dc3545",
            focusConfirm:
                false,
            preConfirm:
                () => {

                    const reason =
                        String(
                            document
                                .getElementById(
                                    "resto-cancellation-reason"
                                )
                                ?.value ||
                            ""
                        ).trim();

                    const refundAmount =
                        refundableAmount > 0
                            ? safeNumber(
                                document
                                    .getElementById(
                                        "resto-refund-amount"
                                    )
                                    ?.value
                            )
                                : 0;

                    const refundMethod =
                        refundableAmount > 0
                            ? String(
                                document
                                    .getElementById(
                                        "resto-refund-method"
                                    )
                                    ?.value ||
                                "cash"
                            )
                            : null;

                    if (!reason) {

                        Swal.showValidationMessage(
                            "Ingresá el motivo de cancelación"
                        );

                        return false;

                    }

                    if (
                        refundableAmount > 0 &&
                        (
                            refundAmount <= 0 ||
                            refundAmount > refundableAmount
                        )
                    ) {

                        Swal.showValidationMessage(
                            "Ingresá un monto mayor a cero y no superior a lo cobrado"
                        );

                        return false;

                    }

                    return {
                        reason,
                        refundAmount,
                        refundMethod,
                        refundableAmount
                    };

                }
        });

    return result.isConfirmed
        ? result.value
        : null;

}
