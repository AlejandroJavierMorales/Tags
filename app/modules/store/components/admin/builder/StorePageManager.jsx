// =====================================
// Archivo:
// /app/modules/store/components/admin/builder/StorePageManager.jsx
//
// Descripción:
// Administra páginas fijas editables de Tags Store.
// No permite agregar, eliminar ni reordenar.
// Usa definiciones declarativas de storePageDefinitions.
//
// Contexto:
// store
// =====================================

"use client";

import {
    useState
} from "react";

import {
    FaBoxOpen,
    FaCartShopping,
    FaCreditCard
} from "react-icons/fa6";

import {
    getStorePageDefinitions
} from "@/app/modules/store/lib/storePageDefinitions";

import StorePageEditor
    from "./StorePageEditor";

export default function StorePageManager({
    store,
    onReload
}) {

    const [editingPage, setEditingPage] =
        useState(null);

    const pages =
        getStorePageDefinitions();

    function getPageIcon(type) {

        switch (type) {

            case "cart":
                return FaCartShopping;

            case "checkout":
                return FaCreditCard;

            default:
                return FaBoxOpen;

        }

    }

    if (editingPage) {

        return (
            <StorePageEditor
                store={store}
                pageType={editingPage}
                onBack={() =>
                    setEditingPage(null)
                }
                onUpdated={() => {}}
            />
        );

    }

    return (

        <div className="store_page_manager">

            <div className="qr_page_builder_panel_header">

                <div>
                    <h2>
                        Páginas de tienda
                    </h2>

                    <p>
                        Configurá páginas fijas del flujo de compra.
                    </p>
                </div>

            </div>

            <div className="store_page_manager_list">

                {
                    pages.map(page => {

                        const PageIcon =
                            getPageIcon(page.type);

                        return (

                            <div
                                key={page.type}
                                className="store_page_manager_item"
                            >

                                <div className="store_page_manager_icon">
                                    <PageIcon />
                                </div>

                                <div className="store_page_manager_info">
                                    <strong>
                                        {page.name}
                                    </strong>

                                    <span>
                                        Página fija de la tienda
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    className="qr_page_btn secondary"
                                    onClick={() =>
                                        setEditingPage(page.type)
                                    }
                                >
                                    Editar
                                </button>

                            </div>

                        );

                    })
                }

            </div>

            <style jsx>{`
                .store_page_manager {
                    display: grid;
                    gap: 18px;
                }

                .store_page_manager_list {
                    display: grid;
                    gap: 12px;
                }

                .store_page_manager_item {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    padding: 16px;
                    border: 1px solid #e5e7eb;
                    border-radius: 16px;
                    background: #ffffff;
                }

                .store_page_manager_icon {
                    width: 44px;
                    height: 44px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 14px;
                    background: #f0fdf4;
                    color: #16a34a;
                    flex: 0 0 auto;
                }

                .store_page_manager_info {
                    display: grid;
                    gap: 3px;
                    flex: 1;
                    min-width: 0;
                }

                .store_page_manager_info strong {
                    font-size: .95rem;
                }

                .store_page_manager_info span {
                    color: #64748b;
                    font-size: .82rem;
                }
            `}</style>

        </div>

    );

}