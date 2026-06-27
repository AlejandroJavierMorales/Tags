// =====================================
// PAGE CLIENT:
// /dashboard/businesses/[businessId]/store/coupons
//
// Descripción:
// Administra cupones de Tags Tienda.
//
// Contexto:
// store
// =====================================

"use client";

import { useRouter }
    from "next/navigation";

import {
    FaTicketAlt
}
from "react-icons/fa";

import StoreCouponsTab
    from "@/app/modules/store/components/admin/StoreCouponsTab";

import "@/app/styles/qr-page.css";
import "@/app/styles/tags_dashboard.css";
import "@/app/styles/tags_store_admin.css";

export default function StoreCouponsPageClient({
    businessId
}) {
    const router =
        useRouter();

    return (
        <div className="qr_page_builder">

            <div className="qr_page_header">

                <div>
                    <h1 className="qr_page_title store_admin_title">
                        <span className="store_admin_title_icon">
                            <FaTicketAlt />
                        </span>

                        <span>
                            Cupones
                        </span>
                    </h1>

                    <p className="qr_page_subtitle">
                        Creá y administrá descuentos para tu tienda.
                    </p>
                </div>

                <div className="qr_page_actions">
                    <button
                        type="button"
                        className="qr_page_btn secondary"
                        onClick={() =>
                            router.push(
                                `/dashboard/businesses/${businessId}/store`
                            )
                        }
                    >
                        Volver
                    </button>
                </div>

            </div>

            <StoreCouponsTab
                businessId={businessId}
            />

        </div>
    );
}