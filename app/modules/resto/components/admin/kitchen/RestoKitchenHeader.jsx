// =====================================
// FILE: /app/modules/resto/components/admin/kitchen/RestoKitchenHeader.jsx
// Descripción:
// Encabezado de Cocina alineado visualmente con Pedidos.
// =====================================

"use client";

import {
    FaFire,
    FaHome,
    FaSyncAlt
} from "react-icons/fa";

export default function RestoKitchenHeader({
    store,
    refreshing = false,
    onBack,
    onRefresh
}) {

    return (
        <header className="tags_resto_orders_header">
            <div className="tags_resto_orders_header_left">
                <div className="tags_resto_orders_header_identity">
                    <div className="tags_resto_orders_header_icon">
                        <FaFire />
                    </div>

                    <div className="tags_resto_orders_header_content">
                        <h1 className="tags_resto_orders_title">
                            Cocina
                        </h1>

                        <h2 className="tags_resto_orders_business">
                            {
                                store?.name ||
                                "Tags Resto"
                            }
                        </h2>

                        <p className="tags_resto_orders_subtitle">
                            Preparación en tiempo real
                        </p>
                    </div>
                </div>
            </div>

            <div className="tags_resto_orders_header_right">
                <div className="tags_resto_btn_group">
                    <button
                        type="button"
                        className="tags_resto_btn tags_resto_btn_secondary"
                        onClick={onBack}
                    >
                        <FaHome />
                        Inicio
                    </button>

                    <button
                        type="button"
                        className="tags_resto_btn tags_resto_btn_primary"
                        onClick={onRefresh}
                        disabled={refreshing}
                    >
                        <FaSyncAlt
                            className={
                                refreshing
                                    ? "tags_resto_orders_rotating"
                                    : ""
                            }
                        />

                        {
                            refreshing
                                ? "Actualizando..."
                                : "Actualizar"
                        }
                    </button>
                </div>
            </div>
        </header>
    );

}
