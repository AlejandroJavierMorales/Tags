// =====================================
// FILE: /app/modules/resto/components/admin/orders/RestoOrdersHeader.jsx
// Descripción:
// Encabezado operativo del módulo de pedidos de Tags Resto.
// Muestra la identidad del restaurante y las acciones
// principales de navegación y actualización.
// =====================================

"use client";

import {
    FaBell,
    FaEye,
    FaFire,
    FaHome,
    FaSyncAlt
} from "react-icons/fa";
import { FaClipboardList } from "react-icons/fa6";

export default function RestoOrdersHeader({
    store,
    session,
    isAdmin,
    refreshing,
    onBack,
    onWaiter,
    onTables,
    onHistory,
    onKitchen,
    onRefresh
}) {

    /*  UI  */
    return (

        <header className="tags_resto_orders_header">

            <div className="tags_resto_orders_header_left">

                <div className="tags_resto_orders_header_identity">

                    <div className="tags_resto_orders_header_icon">

                        <FaClipboardList />

                    </div>

                    <div className="tags_resto_orders_header_content">

                        <h1 className="tags_resto_orders_title">
                            Pedidos
                        </h1>

                        <h2 className="tags_resto_orders_business">

                            {
                                store?.name ||
                                "Comercio"
                            }

                        </h2>

                        <p className="tags_resto_orders_subtitle">

                            Operación en tiempo real

                        </p>

                        {
                            session?.email && (

                                <div className="tags_resto_orders_session">

                                    {session.email}

                                    {
                                        isAdmin && (

                                            <span className="tags_resto_orders_status">

                                                {' - Administrador'}

                                            </span>

                                        )
                                    }

                                </div>

                            )
                        }

                    </div>

                </div>

            </div>

            <div className="tags_resto_orders_header_right">

                <div className="tags_resto_btn_group">

                    {onTables && <button
                        type="button"
                        className="tags_resto_btn tags_resto_btn_secondary"
                        onClick={onBack}
                    >

                        <FaHome />

                        Inicio

                    </button>}

                    {onHistory && <button
                        type="button"
                        className="tags_resto_btn tags_resto_btn_secondary"
                        onClick={onTables}
                    >

                        <FaEye />

                        Mesas

                    </button>}

                    {onKitchen && <button
                        type="button"
                        className="tags_resto_btn tags_resto_btn_secondary"
                        onClick={onHistory}
                    >

                        <FaClipboardList />

                        Historial

                    </button>}

                    {onWaiter && <button
                        type="button"
                        className="tags_resto_btn tags_resto_btn_secondary"
                        onClick={onKitchen}
                    >

                        <FaFire />

                        Cocina

                    </button>}

                    <button
                        type="button"
                        className="tags_resto_btn tags_resto_btn_secondary"
                        onClick={onWaiter}
                    >

                        <FaBell />

                        Mozo

                    </button>

                    <button
                        type="button"
                        className="tags_resto_btn tags_resto_btn_primary"
                        disabled={refreshing}
                        onClick={onRefresh}
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
