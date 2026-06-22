// =====================================
// PAGE CLIENT: /dashboard/businesses/[id]/store/products
// Descripción: Lista y administra productos de Tags Tienda.
// =====================================

"use client";

import "@/app/styles/tags_store_admin.css";
import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import showAlert from "@/app/components/showAlert";
import TagsSpinner from "@/app/components/TagsSpinner";

import "@/app/styles/qr-page.css";
import "@/app/styles/tags_dashboard.css";

export default function StoreProductsClient({
    businessId,
    session,
    isAdmin
}) {
    const router =
        useRouter();

    const [loading, setLoading] =
        useState(true);

    const [products, setProducts] =
        useState([]);

    const [storeMissing, setStoreMissing] =
        useState(false);

    const [storeId, setStoreId] =
        useState(null);

    const [categories, setCategories] =
        useState([]);

    const [filters, setFilters] =
        useState({
            q: "",
            categoryId: "",
            status: "",
            visible: "",
            featured: ""
        });

    const [openVariantsProductId, setOpenVariantsProductId] =
        useState(null);

    const [variantsByProduct, setVariantsByProduct] =
        useState({});

    const [variantsLoading, setVariantsLoading] =
        useState(false);


    useEffect(() => {
        loadProducts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        businessId,
        filters.q,
        filters.categoryId,
        filters.status,
        filters.visible,
        filters.featured
    ]);

    async function loadProducts() {
        setLoading(true);

        try {
            const res =
                await fetch(
                    `/api/store/admin/products/list?${new URLSearchParams({
                        businessId,
                        q: filters.q || "",
                        categoryId: filters.categoryId || "",
                        status: filters.status || "",
                        visible: filters.visible || "",
                        featured: filters.featured || ""
                    })}`,
                    {
                        cache: "no-store"
                    }
                );

            const data =
                await res.json().catch(() => null);

            if (!res.ok) {
                throw new Error(
                    data?.error ||
                    "No se pudieron cargar los productos"
                );
            }

            setStoreMissing(!!data.storeMissing);
            setStoreId(data.storeId || null);
            setProducts(data.products || []);
            setCategories(data.categories || []);

        } catch (err) {
            showAlert({
                title: "Error",
                text: err.message,
                icon: "error"
            });

        } finally {
            setLoading(false);
        }
    }

    async function deleteProduct(product) {
        const confirm =
            await showAlert({
                title: "Eliminar producto",
                text: `¿Querés eliminar "${product.title}"?`,
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Eliminar",
                cancelButtonText: "Cancelar"
            });

        if (!confirm) {
            return;
        }

        try {
            const res =
                await fetch(
                    "/api/store/admin/products/delete",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            businessId,
                            productId: product.id
                        })
                    }
                );

            const data =
                await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "No se pudo eliminar el producto"
                );
            }

            showAlert({
                title: "OK",
                text: data.message || "Producto eliminado",
                icon: "success"
            });

            await loadProducts();

        } catch (err) {
            showAlert({
                title: "Error",
                text: err.message,
                icon: "error"
            });
        }
    }

    function formatPrice(product) {
        const currency =
            product.currency || "ARS";

        const price =
            Number(product.sale_price || product.price || 0);

        return `${currency} ${price.toLocaleString("es-AR")}`;
    }

    if (loading) {
        return (
            <div className="qr_page_builder">
                <TagsSpinner />
            </div>
        );
    }

    if (storeMissing) {
        return (
            <div className="qr_page_builder">

                <div className="qr_page_header">

                    <div>
                        <h1 className="qr_page_title store_admin_title">
                            <span className="store_admin_title_icon">
                                📦
                            </span>

                            <span>
                                Productos
                            </span>
                        </h1>

                        <p className="qr_page_subtitle">
                            Primero necesitás crear la tienda.
                        </p>
                    </div>

                    <div className="qr_page_actions">
                        <button
                            type="button"
                            className="qr_page_btn success"
                            onClick={() =>
                                router.push(
                                    `/dashboard/businesses/${businessId}/store`
                                )
                            }
                        >
                            Ir a Tags Tienda
                        </button>
                    </div>

                </div>

                <div className="qr_page_card">
                    <div className="qr_page_info_box">
                        Para crear productos, primero tenés que guardar la configuración general de Tags Tienda.
                    </div>
                </div>

            </div>
        );
    }

    function updateFilter(field, value) {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
    }

    function clearFilters() {
        setFilters({
            q: "",
            categoryId: "",
            status: "",
            visible: "",
            featured: ""
        });
    }

    async function toggleVariants(product) {
        if (openVariantsProductId === product.id) {
            setOpenVariantsProductId(null);
            return;
        }

        setOpenVariantsProductId(product.id);

        if (variantsByProduct[product.id]) {
            return;
        }

        setVariantsLoading(true);

        try {
            const res =
                await fetch(
                    `/api/store/admin/products/variants?businessId=${businessId}&productId=${product.id}`,
                    {
                        cache: "no-store"
                    }
                );

            const data =
                await res.json().catch(() => null);

            if (!res.ok) {
                throw new Error(
                    data?.error ||
                    "No se pudieron cargar las variantes"
                );
            }

            setVariantsByProduct(prev => ({
                ...prev,
                [product.id]: data.variants || []
            }));

        } catch (err) {
            showAlert({
                title: "Error",
                text: err.message,
                icon: "error"
            });

        } finally {
            setVariantsLoading(false);
        }
    }

    /*  UI */

    return (
        <div className="qr_page_builder">

            <div className="qr_page_header">

                <div>
                    <h1 className="qr_page_title store_admin_title">
                        <span className="store_admin_title_icon">
                            📦
                        </span>

                        <span>
                            Productos
                        </span>
                    </h1>

                    <p className="qr_page_subtitle">
                        Administrá el catálogo principal de Tags Tienda.
                    </p>
                </div>

                <div className="qr_page_actions">

                    <button
                        type="button"
                        className="store_admin_small_btn"
                        onClick={() =>
                            router.push(
                                `/dashboard/businesses/${businessId}/store`
                            )
                        }
                    >
                        Volver a tienda
                    </button>

                    <button
                        type="button"
                        className="qr_page_btn success"
                        onClick={() =>
                            router.push(
                                `/dashboard/businesses/${businessId}/store/products/new`
                            )
                        }
                    >
                        Nuevo producto
                    </button>

                </div>

            </div>

            <div className="qr_page_status">
                Total productos:{" "}
                <strong>
                    {products.length}
                </strong>
            </div>


            {/* Filtros */}
            <div className="store_admin_filters_shell">

                <div className="store_admin_filters_bar">

                    <input
                        className="store_admin_search"
                        value={filters.q}
                        onChange={(e) =>
                            updateFilter(
                                "q",
                                e.target.value
                            )
                        }
                        placeholder="Buscar producto, SKU, URL o categoría"
                    />

                    <select
                        className="store_admin_filter_select"
                        value={filters.categoryId}
                        onChange={(e) =>
                            updateFilter(
                                "categoryId",
                                e.target.value
                            )
                        }
                    >
                        <option value="">
                            Categoría
                        </option>

                        {categories.map(category => (
                            <option
                                key={category.id}
                                value={category.id}
                            >
                                {category.name}
                            </option>
                        ))}
                    </select>

                    <select
                        className="store_admin_filter_select"
                        value={filters.status}
                        onChange={(e) =>
                            updateFilter(
                                "status",
                                e.target.value
                            )
                        }
                    >
                        <option value="">
                            Estado
                        </option>

                        <option value="draft">
                            Borrador
                        </option>

                        <option value="published">
                            Publicado
                        </option>

                        <option value="disabled">
                            Deshabilitado
                        </option>
                    </select>

                    <select
                        className="store_admin_filter_select"
                        value={filters.visible}
                        onChange={(e) =>
                            updateFilter(
                                "visible",
                                e.target.value
                            )
                        }
                    >
                        <option value="">
                            Visible
                        </option>

                        <option value="1">
                            Sí
                        </option>

                        <option value="0">
                            No
                        </option>
                    </select>

                    <select
                        className="store_admin_filter_select"
                        value={filters.featured}
                        onChange={(e) =>
                            updateFilter(
                                "featured",
                                e.target.value
                            )
                        }
                    >
                        <option value="">
                            Destacado
                        </option>

                        <option value="1">
                            Sí
                        </option>

                        <option value="0">
                            No
                        </option>
                    </select>

                    <button
                        type="button"
                        className="store_admin_filter_clear"
                        onClick={clearFilters}
                    >
                        Limpiar
                    </button>

                </div>

            </div>



            <div className="store_admin_table_card">

                {/* <h2 className="qr_page_section_title">
                    Productos cargados
                </h2> */}

                {/* Tabla de Productos */}

                <div className="tags_table_wrapper mt-3">

                    <table className="tags_table tags_text_normal">

                        <thead>
                            <tr>
                                <th>Imagen</th>
                                <th>Producto</th>
                                <th>Categoría</th>
                                <th>Precio</th>
                                <th>Variantes</th>
                                <th>Estado</th>
                                <th>Visible</th>
                                <th>Destacado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>

                        <tbody>
                            {products.map(product => (
                                <Fragment key={product.id}>

                                    <tr>
                                        <td>
                                            {product.primary_image_url ? (
                                                <img
                                                    src={product.primary_image_url}
                                                    alt=""
                                                    style={{
                                                        width: 58,
                                                        height: 58,
                                                        objectFit: "cover",
                                                        borderRadius: 10
                                                    }}
                                                />
                                            ) : (
                                                "-"
                                            )}
                                        </td>

                                        <td>
                                            <strong>{product.title}</strong>
                                            <br />
                                            <small>{product.slug}</small>
                                        </td>

                                        <td>
                                            {product.category_name || "-"}
                                        </td>

                                        <td>
                                            {product.sale_price ? (
                                                <>
                                                    <strong>{formatPrice(product)}</strong>
                                                    <br />
                                                    <small style={{ textDecoration: "line-through" }}>
                                                        {product.currency || "ARS"}{" "}
                                                        {Number(product.price || 0)
                                                            .toLocaleString("es-AR")}
                                                    </small>
                                                </>
                                            ) : (
                                                formatPrice(product)
                                            )}
                                        </td>

                                        <td>
                                            {Number(product.variants_count || 0) > 0 ? (
                                                <button
                                                    type="button"
                                                    className="qr_page_btn secondary"
                                                    onClick={() => toggleVariants(product)}
                                                >
                                                    Variantes ({product.variants_count})
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className="qr_page_btn secondary"
                                                    onClick={() =>
                                                        router.push(
                                                            `/dashboard/businesses/${businessId}/store/products/${product.id}/variants`
                                                        )
                                                    }
                                                >
                                                    Crear
                                                </button>
                                            )}
                                        </td>

                                        <td>
                                            {product.status || "draft"}
                                        </td>

                                        <td>
                                            {Number(product.is_visible) === 1 ? "✅" : "🚫"}
                                        </td>

                                        <td>
                                            {Number(product.is_featured) === 1 ? "⭐" : "-"}
                                        </td>

                                        <td>
                                            <div className="d-flex gap-2 flex-wrap">
                                                <button
                                                    type="button"
                                                    className="qr_page_btn secondary"
                                                    onClick={() =>
                                                        router.push(
                                                            `/dashboard/businesses/${businessId}/store/products/${product.id}`
                                                        )
                                                    }
                                                >
                                                    Editar
                                                </button>

                                                <button
                                                    type="button"
                                                    className="qr_page_btn"
                                                    onClick={() => deleteProduct(product)}
                                                >
                                                    Eliminar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>

                                    {openVariantsProductId === product.id && (
                                        <tr>
                                            <td colSpan={9}>
                                                <div className="qr_page_card">
                                                    <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap">
                                                        <h3 className="m-0">
                                                            Variantes de {product.title}
                                                        </h3>

                                                        <button
                                                            type="button"
                                                            className="qr_page_btn secondary"
                                                            onClick={() =>
                                                                router.push(
                                                                    `/dashboard/businesses/${businessId}/store/products/${product.id}/variants`
                                                                )
                                                            }
                                                        >
                                                            Administrar variantes
                                                        </button>
                                                    </div>

                                                    {variantsLoading && (
                                                        <div className="mt-3">
                                                            <TagsSpinner />
                                                        </div>
                                                    )}

                                                    {!variantsLoading && (
                                                        <div className="tags_table_wrapper mt-3">
                                                            <table className="tags_table tags_text_normal">
                                                                <thead>
                                                                    <tr>
                                                                        <th>Variante</th>
                                                                        <th>Opciones</th>
                                                                        <th>SKU</th>
                                                                        <th>Precio</th>
                                                                        <th>Oferta</th>
                                                                        <th>Stock</th>
                                                                        <th>Visible</th>
                                                                    </tr>
                                                                </thead>

                                                                <tbody>
                                                                    {(variantsByProduct[product.id] || []).map(variant => (
                                                                        <tr key={variant.id}>
                                                                            <td>{variant.title || "-"}</td>

                                                                            <td>{variant.options_label || "-"}</td>

                                                                            <td>{variant.sku || "-"}</td>

                                                                            <td>
                                                                                {variant.price
                                                                                    ? `${product.currency || "ARS"} ${Number(variant.price).toLocaleString("es-AR")}`
                                                                                    : "Precio base"}
                                                                            </td>

                                                                            <td>
                                                                                {variant.sale_price
                                                                                    ? `${product.currency || "ARS"} ${Number(variant.sale_price).toLocaleString("es-AR")}`
                                                                                    : "-"}
                                                                            </td>

                                                                            <td>
                                                                                {variant.stock_qty ?? 0}
                                                                            </td>

                                                                            <td>
                                                                                {Number(variant.is_visible) === 1
                                                                                    ? "✅"
                                                                                    : "🚫"}
                                                                            </td>
                                                                        </tr>
                                                                    ))}

                                                                    {!(variantsByProduct[product.id] || []).length && (
                                                                        <tr>
                                                                            <td colSpan={7}>
                                                                                Este producto no tiene variantes cargadas.
                                                                            </td>
                                                                        </tr>
                                                                    )}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}

                                </Fragment>
                            ))}

                            {!products.length && (
                                <tr>
                                    <td colSpan={8}>
                                        Todavía no hay productos cargados.
                                    </td>
                                </tr>
                            )}
                        </tbody>

                    </table>

                </div>



            </div>

        </div>
    );
}