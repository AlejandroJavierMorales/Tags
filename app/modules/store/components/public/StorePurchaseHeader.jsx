"use client";

import Link from "next/link";
import { FiCheck, FiCreditCard, FiShoppingCart } from "react-icons/fi";
import { getStoreReturnUrl } from "../../lib/storePublicContext";

export default function StorePurchaseHeader({ store, currentStep = "cart" }) {
    const storeUrl = getStoreReturnUrl(store) || `/p/${store?.slug}`;
    const checkoutActive = currentStep === "checkout" || currentStep === "complete";

    return <header className="store_purchase_header">
        <div className="store_purchase_header_inner">
            <Link href={storeUrl} className="store_purchase_brand" aria-label={`Volver a ${store?.name || "la tienda"}`}>
                {store?.logo_url ? <img src={store.logo_url} alt={store?.name || "Tienda"} /> : <span className="store_purchase_brand_fallback"><FiShoppingCart /></span>}
                <span><small>TIENDA ONLINE</small><strong>{store?.name || "Mi tienda"}</strong></span>
            </Link>
            <nav className="store_purchase_steps" aria-label="Progreso de la compra">
                <span className="active"><i><FiShoppingCart /></i><b>Carrito</b></span>
                <span className={checkoutActive ? "active" : ""}><i><FiCreditCard /></i><b>Datos y pago</b></span>
                <span className={currentStep === "complete" ? "active" : ""}><i><FiCheck /></i><b>Confirmación</b></span>
            </nav>
        </div>
    </header>;
}
