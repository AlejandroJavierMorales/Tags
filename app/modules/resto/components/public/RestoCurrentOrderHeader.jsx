// =====================================
// FILE: app/modules/resto/components/public/RestoCurrentOrderHeader.jsx
// Descripción:
// Encabezado del pedido activo.
// Muestra identidad del restaurante y estado del pedido.
// =====================================

"use client";

export default function RestoCurrentOrderHeader({

    businessLogo,
    businessName,
    businessType,
    statusLabel,
    status

}) {

    return (

        <header className="tags_resto_current_order_brand_header">

            <div className="tags_resto_current_order_brand_identity">

                <div className="tags_resto_current_order_brand_logo">

                    {
                        businessLogo
                            ? (
                                <img
                                    src={businessLogo}
                                    alt={businessName}
                                />
                            )
                            : (
                                <span aria-hidden="true">
                                    🍽️
                                </span>
                            )
                    }

                </div>

                <div className="tags_resto_current_order_brand_text">

                    <span className="tags_resto_current_order_brand_type">
                        {businessType}
                    </span>

                    <h1>
                        {businessName}
                    </h1>

                    <p>
                        Pedido vinculado a esta atención
                    </p>

                </div>

            </div>

            <div className="tags_resto_current_order_brand_status">
{/* 
                <span className="tags_resto_current_order_brand_status_label">
                    Mi pedido
                </span> */}

                <span
                    className={
                        `tags_resto_current_order_status_badge tags_resto_current_order_status_${status}`
                    }
                >
                    {statusLabel}
                </span>

            </div>

        </header>

    );

}