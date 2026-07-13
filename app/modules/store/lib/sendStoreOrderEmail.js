import { sendMail } from "@/app/lib/sendMail";

function money(value, currency = "ARS") {
    return `${currency} ${Number(value || 0).toLocaleString("es-AR")}`;
}

function safe(value, fallback = "") {
    return value || fallback;
}

function getBaseUrl() {
    return process.env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : process.env.NEXT_PUBLIC_BASE_URL_PROD;
}

function getBrandColor(store) {
    const styles =
        typeof store.styles_json === "object"
            ? store.styles_json
            : {};

    return (
        styles.primaryColor ||
        styles.primary ||
        styles.accentColor ||
        "#16a34a"
    );
}

function buildItemsHtml(items, currency) {
    if (!items?.length) {
        return `
            <tr>
                <td style="padding:12px;color:#6b7280;">
                    Detalle no disponible
                </td>
            </tr>
        `;
    }

    return items.map(item => `
        <tr>
            <td style="padding:12px;border-bottom:1px solid #e5e7eb;">
                <strong>${safe(item.product_title || item.title, "Producto")}</strong>
                ${item.variant_title
                    ? `<br><span style="color:#6b7280;font-size:13px;">${item.variant_title}</span>`
                    : ""
                }
            </td>
            <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:center;">
                ${Number(item.quantity || 1)}
            </td>
            <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:right;">
                ${money(item.total_price, currency)}
            </td>
        </tr>
    `).join("");
}

function buildLayout({
    store,
    order,
    items,
    typeTitle,
    title,
    intro,
    badge,
    buttons = [],
    footerNote
}) {
    const currency =
        store.currency || "ARS";

    const brandColor =
        getBrandColor(store);

    const itemsHtml =
        buildItemsHtml(items, currency);

    const buttonStyles = {
        primary: `background:${brandColor};color:#ffffff;`,
        secondary: "background:#111827;color:#ffffff;",
        light: "background:#f3f4f6;color:#111827;"
    };

    const buttonsHtml =
        Array.isArray(buttons)
            ? buttons
                .filter(button =>
                    button?.label &&
                    button?.href
                )
                .map(button => {
                    const variant =
                        buttonStyles[button.variant]
                            ? button.variant
                            : "primary";

                    return `
                        <a
                            href="${button.href}"
                            style="display:inline-block;padding:13px 18px;${buttonStyles[variant]}text-decoration:none;border-radius:10px;font-weight:bold;"
                        >
                            ${button.label}
                        </a>
                    `;
                })
                .join("")
            : "";

    return `
        <div style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827;">
            <div style="max-width:720px;margin:0 auto;padding:24px 12px;">

                <div style="background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;">

                    <div style="padding:24px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:16px;">
                        ${store.logo_url
                            ? `
                            <img
                                src="${store.logo_url}"
                                alt="${store.name}"
                                style="width:64px;height:64px;object-fit:contain;border-radius:14px;background:#f9fafb;"
                            />
                            `
                            : ""
                        }

                        <div>
                            <h1 style="margin:0;font-size:22px;line-height:1.2;color:#111827;">
                                ${store.name}
                            </h1>

                            <p style="margin:6px 0 0;color:#6b7280;font-size:14px;">
                                ${typeTitle}
                            </p>
                        </div>
                    </div>

                    <div style="padding:28px 24px;">

                        ${badge
                            ? `
                            <div style="display:inline-block;padding:7px 12px;border-radius:999px;background:${brandColor}18;color:${brandColor};font-size:13px;font-weight:bold;margin-bottom:16px;">
                                ${badge}
                            </div>
                            `
                            : ""
                        }

                        <h2 style="margin:0 0 12px;font-size:24px;color:#111827;">
                            ${title}
                        </h2>

                        <p style="margin:0 0 18px;color:#374151;font-size:15px;line-height:1.6;">
                            Hola ${safe(order.customer_name, "cliente")},<br>
                            ${intro}
                        </p>

                        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:14px;padding:16px;margin:20px 0;">
                            <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">
                                Pedido
                            </p>

                            <strong style="font-size:20px;color:#111827;">
                                ${order.order_number}
                            </strong>

                            ${order.carrier_name || order.tracking_code
                                ? `
                                <div style="margin-top:14px;color:#374151;font-size:14px;line-height:1.6;">
                                    ${order.carrier_name
                                        ? `Transportista: <strong>${order.carrier_name}</strong><br>`
                                        : ""
                                    }

                                    ${order.tracking_code
                                        ? `Código tracking: <strong>${order.tracking_code}</strong>`
                                        : ""
                                    }
                                </div>
                                `
                                : ""
                            }
                        </div>

                        <h3 style="margin:26px 0 12px;font-size:17px;">
                            Detalle de compra
                        </h3>

                        <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
                            <thead>
                                <tr style="background:#f9fafb;color:#6b7280;font-size:12px;text-transform:uppercase;">
                                    <th style="padding:12px;text-align:left;">
                                        Producto
                                    </th>

                                    <th style="padding:12px;text-align:center;">
                                        Cant.
                                    </th>

                                    <th style="padding:12px;text-align:right;">
                                        Total
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                ${itemsHtml}
                            </tbody>
                        </table>

                        <div style="text-align:right;margin-top:16px;font-size:18px;">
                            Total:
                            <strong>${money(order.total, currency)}</strong>
                        </div>

                        ${buttonsHtml
                            ? `
                            <div style="margin-top:26px;display:flex;gap:10px;flex-wrap:wrap;">
                                ${buttonsHtml}
                            </div>
                            `
                            : ""
                        }

                        ${footerNote
                            ? `
                            <p style="margin:24px 0 0;color:#6b7280;font-size:14px;line-height:1.5;">
                                ${footerNote}
                            </p>
                            `
                            : ""
                        }
                    </div>

                    <div style="padding:20px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#6b7280;font-size:13px;line-height:1.6;">
                        <strong style="color:#111827;">
                            ${store.name}
                        </strong>
                        <br>

                        ${store.whatsapp
                            ? `WhatsApp: ${store.whatsapp}<br>`
                            : ""
                        }

                        ${store.email || store.store_email
                            ? `Email: ${store.email || store.store_email}<br>`
                            : ""
                        }

                        Este correo fue enviado automáticamente por ${store.name}.
                    </div>

                </div>
            </div>
        </div>
    `;
}

export async function sendStoreOrderEmail({
    store,
    order,
    items = [],
    type,
    buttons = []
}) {
    if (!order?.customer_email) {
        return null;
    }

    const base =
        getBaseUrl();

    const orderTrackUrl =
        `${base}/p/${store.slug}/orders/track?order=${order.order_number}`;

    const trackingUrl =
        order.tracking_url || orderTrackUrl;

    const templates = {
        order_created: {
            subject:
                `Pedido recibido ${order.order_number}`,

            typeTitle:
                "Confirmación de pedido",

            badge:
                "Pedido recibido",

            title:
                "¡Recibimos tu pedido!",

            intro:
                `Tu pedido <strong>${order.order_number}</strong> fue recibido correctamente.`,

            buttons: [
                {
                    label:
                        "Ver mi pedido",

                    href:
                        orderTrackUrl,

                    variant:
                        "primary"
                }
            ],

            footerNote:
                "Te avisaremos cuando el pedido avance de estado."
        },

        payment_paid: {
            subject:
                `Pago confirmado ${order.order_number}`,

            typeTitle:
                "Confirmación de pago",

            badge:
                "Pago confirmado",

            title:
                "✅ Pago recibido",

            intro:
                `Confirmamos la recepción del pago de tu pedido <strong>${order.order_number}</strong>. Ya estamos preparando tu compra.`,

            buttons: [
                {
                    label:
                        "Ver mi pedido",

                    href:
                        orderTrackUrl,

                    variant:
                        "primary"
                }
            ],

            footerNote:
                "Gracias por tu compra."
        },

        order_shipped: {
            subject:
                `Pedido enviado ${order.order_number}`,

            typeTitle:
                "Seguimiento de envío",

            badge:
                "Pedido despachado",

            title:
                "📦 Tu pedido fue despachado",

            intro:
                `Tu pedido <strong>${order.order_number}</strong> ya fue despachado. Podés seguir el envío desde el botón correspondiente.`,

            buttons: [
                {
                    label:
                        "Seguir envío",

                    href:
                        trackingUrl,

                    variant:
                        "primary"
                }
            ],

            footerNote:
                "Los tiempos de entrega dependen del transportista seleccionado."
        },

        order_delivered: {
            subject:
                `Pedido entregado ${order.order_number}`,

            typeTitle:
                "Pedido entregado",

            badge:
                "Entregado",

            title:
                "✅ Tu pedido fue entregado",

            intro:
                `Tu pedido <strong>${order.order_number}</strong> figura como entregado. Esperamos que disfrutes tu compra.`,

            buttons: [
                {
                    label:
                        "Ver mi pedido",

                    href:
                        orderTrackUrl,

                    variant:
                        "primary"
                }
            ],

            footerNote:
                "Si hubo algún problema con la entrega, respondé este correo o contactanos."
        },

        order_cancelled: {
            subject:
                `Pedido cancelado ${order.order_number}`,

            typeTitle:
                "Pedido cancelado",

            badge:
                "Cancelado",

            title:
                "Pedido cancelado",

            intro:
                `Tu pedido <strong>${order.order_number}</strong> fue cancelado. Si ya habías realizado un pago, te contactaremos por los pasos correspondientes.`,

            buttons: [
                {
                    label:
                        "Ver pedido",

                    href:
                        orderTrackUrl,

                    variant:
                        "primary"
                }
            ],

            footerNote:
                "Ante cualquier duda, podés comunicarte con la tienda."
        }
    };

    const template =
        templates[type];

    if (!template) {
        return null;
    }

    const finalButtons =
        Array.isArray(buttons) &&
        buttons.length
            ? buttons
            : template.buttons || [];

    const html =
        buildLayout({
            store,
            order,
            items,
            ...template,
            buttons:
                finalButtons
        });

    return sendMail({
        to:
            order.customer_email,

        subject:
            template.subject,

        html
    });
}