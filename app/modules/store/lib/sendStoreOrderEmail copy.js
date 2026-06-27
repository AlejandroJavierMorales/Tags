import { sendMail } from "@/app/lib/sendMail";


export async function sendStoreOrderEmail({
    store,
    order,
    items = [],
    type
}) {

    const base =
        process.env.NODE_ENV === "development"
            ? "http://localhost:3000"
            : process.env.NEXT_PUBLIC_BASE_URL_PROD;

    const trackingUrl =
        `${base}/p/${store.slug}/orders/track?order=${order.order_number}`;

    let subject = "";
    let html = "";

    const itemsHtml =
        items.length
            ? items.map(item => `
            <li>
                ${Number(item.quantity || 1)} × ${item.product_title || item.title}
                ${item.variant_title
                    ? ` (${item.variant_title})`
                    : ""
                }
                ${item.total_price
                    ? ` - $${Number(item.total_price || 0).toLocaleString("es-AR")}`
                    : ""
                }
            </li>
        `).join("")
            : "<li>Detalle no disponible</li>";

    const orderTrackUrl = trackingUrl;

    switch (type) {

        case "order_created":

            subject =
                `Pedido recibido ${order.order_number}`;

            html = `

            <div
                    style="
                        padding:20px;
                        border-bottom:1px solid #eee;
                        display:flex;
                        align-items:center;
                        gap:15px;
                    "
                >

                    ${store.logo_url
                    ? `
                            <img
                                src="${store.logo_url}"
                                alt="${store.name}"
                                style="
                                    width:60px;
                                    height:60px;
                                    object-fit:contain;
                                    border-radius:10px;
                                "
                            />
                            `
                    : ""
                }

                    <div>

                        <h1
                            style="
                                margin:0;
                                font-size:22px;
                            "
                        >
                            ${store.name}
                        </h1>

                        <p
                            style="
                                margin:4px 0 0;
                                color:#666;
                            "
                        >
                            Confirmación de pedido
                        </p>

                    </div>

                </div>
                <h2>¡Recibimos tu pedido!</h2>

                <p>
                    Hola ${order.customer_name || "cliente"},
                </p>

                <p>
                    Tu pedido <strong>${order.order_number}</strong>
                    fue recibido correctamente.
                </p>

                <h3>Detalle del pedido</h3>

                    <ul>
                        ${itemsHtml}
                    </ul>

                <p>
                    Total:
                    <strong>
                        $${Number(order.total || 0).toLocaleString("es-AR")}
                    </strong>
                </p>

                <p>
                    Seguimiento:
                </p>

                <p>
                    <a href="${trackingUrl}">
                        Ver estado de mi pedido
                    </a>
                </p>
            `;
            break;

        case "payment_paid":

            subject =
                `Pago confirmado ${order.order_number}`;

            html = `
                        <div
                            style="
                                font-family:Arial,sans-serif;
                                max-width:700px;
                                margin:0 auto;
                            "
                        >

                            <div
                                style="
                                    padding:20px;
                                    border-bottom:1px solid #e5e7eb;
                                    display:flex;
                                    align-items:center;
                                    gap:15px;
                                "
                            >

                                ${store.logo_url
                                    ? `
                                    <img
                                        src="${store.logo_url}"
                                        alt="${store.name}"
                                        style="
                                            width:60px;
                                            height:60px;
                                            object-fit:contain;
                                            border-radius:10px;
                                        "
                                    />
                                    `
                                    : ""
                                }

                                <div>

                                    <h1
                                        style="
                                            margin:0;
                                            font-size:22px;
                                        "
                                    >
                                        ${store.name}
                                    </h1>

                                    <p
                                        style="
                                            margin:4px 0 0;
                                            color:#666;
                                        "
                                    >
                                        Confirmación de pago
                                    </p>

                                </div>

                            </div>

                            <div
                                style="
                                    padding:25px;
                                "
                            >

                                <h2>
                                    ✅ Pago recibido
                                </h2>

                                <p>
                                    Hola ${order.customer_name || "cliente"},
                                </p>

                                <p>
                                    Confirmamos la recepción del pago de tu pedido:
                                </p>

                                <p>
                                    <strong>
                                        ${order.order_number}
                                    </strong>
                                </p>

                                <p>
                                    Ya estamos preparando tu compra.
                                </p>

                                <p>
                                    Podés consultar el estado de tu pedido desde aquí:
                                </p>

                                <p>
                                    <a
                                        href="${trackingUrl}"
                                        style="
                                            display:inline-block;
                                            padding:12px 20px;
                                            background:#2563eb;
                                            color:#ffffff;
                                            text-decoration:none;
                                            border-radius:8px;
                                        "
                                    >
                                        Seguir mi pedido
                                    </a>
                                </p>

                                <hr
                                    style="
                                        margin:30px 0;
                                        border:none;
                                        border-top:1px solid #e5e7eb;
                                    "
                                />

                                <p
                                    style="
                                        color:#666;
                                        font-size:14px;
                                    "
                                >
                                    Gracias por comprar en
                                    <strong>
                                        ${store.name}
                                    </strong>.
                                </p>

                            </div>

                        </div>
                    `;
            break;

        case "order_shipped":

            subject =
                `Pedido enviado ${order.order_number}`;

            html = `
        <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;">
            <div style="padding:20px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:15px;">
                ${store.logo_url
                    ? `
                    <img
                        src="${store.logo_url}"
                        alt="${store.name}"
                        style="width:60px;height:60px;object-fit:contain;border-radius:10px;"
                    />
                    `
                    : ""
                }

                <div>
                    <h1 style="margin:0;font-size:22px;">
                        ${store.name}
                    </h1>

                    <p style="margin:4px 0 0;color:#666;">
                        Estado de pedido
                    </p>
                </div>
            </div>

            <div style="padding:25px;">
                <h2>
                    📦 Tu pedido fue enviado
                </h2>

                <p>
                    Hola ${order.customer_name || "cliente"},
                </p>

                <p>
                    Tu pedido
                    <strong>${order.order_number}</strong>
                    ya fue despachado.
                </p>

                <p>
                    Podés seguir el estado de tu pedido desde aquí:
                </p>

                <p>
                    <a
                        href="${orderTrackUrl}"
                        style="display:inline-block;padding:12px 20px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;"
                    >
                        Seguir mi pedido
                    </a>
                </p>

                <p>
                    Transportista:
                    <strong>
                        ${order.carrier_name || "No informado"}
                    </strong>
                </p>

                ${order.tracking_code
                    ? `
                    <p>
                        Código de seguimiento:
                        <strong>${order.tracking_code}</strong>
                    </p>
                    `
                    : ""
                }

                ${order.tracking_url
                    ? `
                    <p>
                        <a
                            href="${order.tracking_url}"
                            style="display:inline-block;padding:12px 20px;background:#16a34a;color:#ffffff;text-decoration:none;border-radius:8px;"
                        >
                            Ver seguimiento del envío
                        </a>
                    </p>
                    `
                    : ""
                }

                <hr style="margin:30px 0;border:none;border-top:1px solid #e5e7eb;" />

                <p style="color:#666;font-size:14px;">
                    Gracias por comprar en
                    <strong>${store.name}</strong>.
                </p>
            </div>
        </div>
    `;
            break;

        default:
            return;
    }

    return sendMail({
        to: order.customer_email,
        subject,
        html
    });
}