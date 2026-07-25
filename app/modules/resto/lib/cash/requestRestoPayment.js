"use client";

import Swal
    from "sweetalert2";

import {
    formatRestoOrderPrice
} from "@/app/modules/resto/lib/orders/restoOrderFormatters";

export async function requestRestoPayment(
    order,
    {
        currency = "ARS"
    } = {}
) {

    const pendingAmount =
        Math.max(
            Number(
                order?.pending_amount ||
                0
            ),
            0
        );

    if (pendingAmount <= 0) {
        return null;
    }

    const result =
        await Swal.fire({
            icon:
                "question",
            title:
                "Registrar cobro",
            html:
                `
                <div style="text-align:left">
                    <label for="resto-payment-amount" style="display:block;margin-bottom:6px;font-weight:600">
                        Importe
                    </label>
                    <input
                        id="resto-payment-amount"
                        class="swal2-input"
                        type="number"
                        min="0.01"
                        max="${pendingAmount}"
                        step="0.01"
                        value="${pendingAmount}"
                        style="width:100%;margin:0 0 14px"
                    />
                    <small style="display:block;margin:-7px 0 14px;color:#667085">
                        Saldo pendiente: ${formatRestoOrderPrice(pendingAmount, currency)}
                    </small>
                    <label for="resto-payment-method" style="display:block;margin-bottom:6px;font-weight:600">
                        Método de pago
                    </label>
                    <select
                        id="resto-payment-method"
                        class="swal2-select"
                        style="display:block;width:100%;margin:0 0 14px"
                    >
                        <option value="cash">Efectivo</option>
                        <option value="transfer">Transferencia</option>
                        <option value="card">Tarjeta</option>
                        <option value="mercado_pago">Mercado Pago</option>
                        <option value="other">Otro</option>
                    </select>
                    <label for="resto-payment-notes" style="display:block;margin-bottom:6px;font-weight:600">
                        Observaciones
                    </label>
                    <input
                        id="resto-payment-notes"
                        class="swal2-input"
                        type="text"
                        placeholder="Opcional"
                        style="width:100%;margin:0"
                    />
                </div>
                `,
            showCancelButton:
                true,
            confirmButtonText:
                "Registrar cobro",
            cancelButtonText:
                "Volver",
            confirmButtonColor:
                "#198754",
            focusConfirm:
                false,
            preConfirm:
                () => {

                    const amount =
                        Number(
                            document
                                .getElementById(
                                    "resto-payment-amount"
                                )
                                ?.value
                        );

                    const paymentMethod =
                        String(
                            document
                                .getElementById(
                                    "resto-payment-method"
                                )
                                ?.value ||
                            ""
                        );

                    const notes =
                        String(
                            document
                                .getElementById(
                                    "resto-payment-notes"
                                )
                                ?.value ||
                            ""
                        ).trim();

                    if (
                        !Number.isFinite(amount) ||
                        amount <= 0 ||
                        amount > pendingAmount
                    ) {
                        Swal.showValidationMessage(
                            "El importe debe ser mayor a cero y no superar el saldo pendiente"
                        );
                        return false;
                    }

                    return {
                        amount,
                        payment_method:
                            paymentMethod,
                        notes
                    };

                }
        });

    return result.isConfirmed
        ? result.value
        : null;

}
