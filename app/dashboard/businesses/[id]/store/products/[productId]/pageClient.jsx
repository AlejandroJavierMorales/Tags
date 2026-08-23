// =====================================
// PAGE CLIENT: /dashboard/businesses/[id]/store/products/[productId]
// Descripción: Crea y edita productos de Tags Tienda.
// =====================================

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import showAlert from "@/app/components/showAlert";
import TagsSpinner from "@/app/components/TagsSpinner";
import MediaUploader from "@/app/components/MediaUploader";

import "@/app/styles/qr-page.css";
import "@/app/styles/tags_dashboard.css";

const emptyProduct = {
    id: null,
    category_id: "",
    sku: "",
    slug: "",
    title: "",
    description: "",
    price: "",
    sale_price: "",
    currency: "ARS",
    stock_enabled: 0,
    stock_qty: 0,
    is_featured: 0,
    is_offer: 0,
    is_new: 0,
    is_visible: 1,
    status: "draft",
    seo_title: "",
    seo_description: "",
    settings_json: {}
};

function createSlug(value) {
    return String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
}

export default function StoreProductEditorClient({
    businessId,
    productId,
    session,
    isAdmin
}) {
    const router =
        useRouter();

    const isNew =
        productId === "new";

    const [loading, setLoading] =
        useState(!isNew);

    const [saving, setSaving] =
        useState(false);

    const [product, setProduct] =
        useState(emptyProduct);

    const [categories, setCategories] =
        useState([]);

    const [images, setImages] =
        useState([]);

    useEffect(() => {
        loadInitial();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [businessId, productId]);

    async function loadInitial() {
        setLoading(true);

        try {
            if (isNew) {
                await loadCategoriesOnly();

                setProduct({
                    ...emptyProduct
                });

                setImages([]);

                return;
            }

            const res =
                await fetch(
                    `/api/store/admin/products/get?businessId=${businessId}&productId=${productId}`,
                    {
                        cache: "no-store"
                    }
                );

            const data =
                await res.json().catch(() => null);

            if (!res.ok) {
                throw new Error(
                    data?.error ||
                    "No se pudo cargar el producto"
                );
            }

            setProduct({
                ...emptyProduct,
                ...data.product,
                category_id: data.product.category_id || "",
                sale_price: data.product.sale_price || "",
                settings_json:
                    data.product.settings_json || {}
            });

            setImages(
                (data.images || []).map(img => ({
                    ...img,
                    image_url: img.image_url
                }))
            );

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

    async function loadCategoriesOnly() {
        const res =
            await fetch(
                `/api/store/admin/categories/list?businessId=${businessId}`,
                {
                    cache: "no-store"
                }
            );

        const data =
            await res.json().catch(() => null);

        if (!res.ok) {
            throw new Error(
                data?.error ||
                "No se pudieron cargar las categorías"
            );
        }

        if (data?.storeMissing) {
            throw new Error(
                "Primero tenés que crear la tienda."
            );
        }

        setCategories(data.categories || []);
    }

    function updateProduct(field, value) {
        setProduct(prev => ({
            ...prev,
            [field]: value
        }));
    }

    function handleTitleChange(value) {
        setProduct(prev => ({
            ...prev,
            title: value,
            slug: prev.id
                ? prev.slug
                : createSlug(value)
        }));
    }

    function addImage(media) {

        if (!media?.url) {
            return;
        }

        setImages(prev => [
            ...prev,
            {
                image_url:
                    media.url,

                storage_path:
                    media.storage_path ||
                    media.storagePath ||
                    null,

                original_filename:
                    media.original_filename ||
                    media.originalFilename ||
                    null,

                width:
                    media.width ||
                    null,

                height:
                    media.height ||
                    null,

                size_bytes:
                    media.size_bytes ||
                    media.sizeBytes ||
                    null,

                sort_order:
                    prev.length,

                is_primary:
                    prev.length === 0
                        ? 1
                        : 0
            }
        ]);
    }


    async function removeImage(index) {

        const image =
            images[index];

        if (!image) {
            return;
        }

        const confirmed =
            await showAlert({
                title: "Eliminar imagen",
                text:
                    "¿Querés eliminar esta imagen del producto?",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText:
                    "Sí, eliminar",
                cancelButtonText:
                    "Cancelar"
            });

        if (!confirmed) {
            return;
        }

        try {

            /*
             * Imagen ya guardada:
             * elimina archivo y registro de la base.
             */
            if (image.id) {

                const res =
                    await fetch(
                        "/api/store/admin/products/image/delete",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                    "application/json"
                            },
                            body: JSON.stringify({
                                businessId,
                                appType: "store",
                                imageId:
                                    image.id
                            })
                        }
                    );

                const data =
                    await res
                        .json()
                        .catch(() => ({}));

                if (!res.ok) {
                    throw new Error(
                        data.error ||
                        "No se pudo eliminar la imagen"
                    );
                }

            } else {

                /*
                 * Imagen recién subida y todavía
                 * no guardada en la base:
                 * elimina solamente el archivo.
                 */
                const storagePath =
                    image.storage_path ||
                    image.storagePath ||
                    null;

                if (storagePath) {

                    const res =
                        await fetch(
                            "/api/files/delete",
                            {
                                method: "DELETE",
                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },
                                body: JSON.stringify({
                                    businessId,
                                    storage_path:
                                        storagePath
                                })
                            }
                        );

                    const data =
                        await res
                            .json()
                            .catch(() => ({}));

                    if (!res.ok) {
                        throw new Error(
                            data.error ||
                            "No se pudo eliminar el archivo"
                        );
                    }

                }

            }

            setImages(prev => {

                const nextImages =
                    prev.filter(
                        (_, currentIndex) =>
                            currentIndex !== index
                    );

                const hasPrimary =
                    nextImages.some(
                        img =>
                            Number(
                                img.is_primary
                            ) === 1
                    );

                if (
                    nextImages.length &&
                    !hasPrimary
                ) {

                    return nextImages.map(
                        (img, currentIndex) => ({
                            ...img,
                            is_primary:
                                currentIndex === 0
                                    ? 1
                                    : 0
                        })
                    );

                }

                return nextImages;

            });

            await showAlert({
                title: "Imagen eliminada",
                text:
                    "La imagen se eliminó correctamente.",
                icon: "success"
            });

        } catch (err) {

            console.error(
                "STORE PRODUCT IMAGE DELETE ERROR:",
                err
            );

            await showAlert({
                title: "Error",
                text:
                    err.message ||
                    "No se pudo eliminar la imagen.",
                icon: "error"
            });

        }

    }

    function setPrimaryImage(index) {
        setImages(prev =>
            prev.map((img, i) => ({
                ...img,
                is_primary: i === index ? 1 : 0
            }))
        );
    }

    async function saveProduct() {
        if (!product.title) {
            showAlert({
                title: "Nombre requerido",
                text: "Ingresá el nombre del producto.",
                icon: "error"
            });

            return;
        }

        if (!product.slug) {
            showAlert({
                title: "URL requerida",
                text: "Ingresá la URL del producto.",
                icon: "error"
            });

            return;
        }

        setSaving(true);

        try {
            const orderedImages =
                images.map((img, index) => ({
                    ...img,
                    sort_order: index,
                    is_primary:
                        Number(img.is_primary) === 1
                            ? 1
                            : 0
                }));

            const hasPrimary =
                orderedImages.some(img =>
                    Number(img.is_primary) === 1
                );

            if (orderedImages.length && !hasPrimary) {
                orderedImages[0].is_primary = 1;
            }

            const res =
                await fetch(
                    "/api/store/admin/products/save",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            businessId,
                            productId:
                                isNew ? null : product.id,

                            category_id:
                                product.category_id || null,

                            sku:
                                product.sku,

                            slug:
                                product.slug,

                            title:
                                product.title,

                            description:
                                product.description,

                            price:
                                product.price,

                            sale_price:
                                product.sale_price,

                            currency:
                                product.currency || "ARS",

                            stock_enabled:
                                Number(product.stock_enabled) === 1 ? 1 : 0,

                            stock_qty:
                                Number(product.stock_qty || 0),

                            is_featured:
                                Number(product.is_featured) === 1 ? 1 : 0,

                            is_visible:
                                Number(product.is_visible) === 0 ? 0 : 1,

                            is_offer:
                                Number(product.is_offer) === 1 ? 1 : 0,

                            is_new:
                                Number(product.is_new) === 1 ? 1 : 0,

                            status:
                                product.status || "draft",

                            seo_title:
                                product.seo_title,

                            seo_description:
                                product.seo_description,

                            settings_json:
                                product.settings_json || {},

                            images:
                                orderedImages
                        })
                    }
                );

            const data =
                await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "No se pudo guardar el producto"
                );
            }

            showAlert({
                title: "OK",
                text: data.message || "Producto guardado",
                icon: "success"
            });

            if (isNew) {
                router.push(
                    `/dashboard/businesses/${businessId}/store/products/${data.productId}`
                );

                return;
            }

            await loadInitial();

        } catch (err) {
            showAlert({
                title: "Error",
                text: err.message,
                icon: "error"
            });

        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="qr_page_builder">
                <TagsSpinner />
            </div>
        );
    }

    return (
        <div className="qr_page_builder">

            <div className="qr_page_header">

                <div>
                    <h1 className="qr_page_title">
                        {
                            isNew
                                ? "Nuevo producto"
                                : "Editar producto"
                        }
                    </h1>

                    <p className="qr_page_subtitle">
                        Configurá información, imágenes, precios y visibilidad.
                    </p>
                </div>

                <div className="qr_page_actions">

                    <button
                        type="button"
                        className="qr_page_btn secondary"
                        onClick={() =>
                            router.push(
                                `/dashboard/businesses/${businessId}/store/products`
                            )
                        }
                    >
                        Volver
                    </button>

                    <button
                        type="button"
                        className="qr_page_btn success"
                        onClick={saveProduct}
                        disabled={saving}
                    >
                        {
                            saving
                                ? "Guardando..."
                                : "Guardar producto"
                        }
                    </button>
                    {!isNew && (
                        <button
                            type="button"
                            className="qr_page_btn secondary"
                            onClick={() =>
                                router.push(
                                    `/dashboard/businesses/${businessId}/store/products/${productId}/variants`
                                )
                            }
                        >
                            Variantes
                        </button>
                    )}

                </div>

            </div>

            <div className="qr_page_status">
                Estado:{" "}
                <strong>
                    {product.status || "draft"}
                </strong>
            </div>

            <div className="qr_page_card">
                <h2>
                    <span className="store_admin_title_icon">
                        📦
                    </span>

                    <span className="tags_title">
                        Información Del Producto
                    </span>
                </h2>


                <div className="qr_page_grid">

                    <div className="qr_page_field">
                        <label>Nombre del producto</label>

                        <input
                            className="qr_page_input"
                            value={product.title || ""}
                            onChange={(e) =>
                                handleTitleChange(e.target.value)
                            }
                            placeholder="Ej: Remera Oversize"
                        />
                    </div>

                    <div className="qr_page_field">
                        <label>URL</label>

                        <input
                            className="qr_page_input"
                            value={product.slug || ""}
                            onChange={(e) =>
                                updateProduct(
                                    "slug",
                                    createSlug(e.target.value)
                                )
                            }
                            placeholder="remera-oversize"
                        />
                    </div>

                    <div className="qr_page_field">
                        <label>Categoría</label>

                        <select
                            className="qr_page_select"
                            value={product.category_id || ""}
                            onChange={(e) =>
                                updateProduct(
                                    "category_id",
                                    e.target.value
                                )
                            }
                        >
                            <option value="">
                                Sin categoría
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
                    </div>

                    <div className="qr_page_field">
                        <label>SKU</label>

                        <input
                            className="qr_page_input"
                            value={product.sku || ""}
                            onChange={(e) =>
                                updateProduct(
                                    "sku",
                                    e.target.value
                                )
                            }
                            placeholder="SKU-001"
                        />
                    </div>

                    <div className="qr_page_field full">
                        <label>Descripción</label>

                        <textarea
                            className="qr_page_textarea"
                            value={product.description || ""}
                            onChange={(e) =>
                                updateProduct(
                                    "description",
                                    e.target.value
                                )
                            }
                        />
                    </div>

                </div>

            </div>

            <div className="qr_page_card mt-4">

                <h2 className="qr_page_section_title">
                    <span className="tags_title">
                        Precios y stock
                    </span>
                </h2>

                <div className="qr_page_grid">

                    <div className="qr_page_field">
                        <label>Precio</label>

                        <input
                            type="number"
                            className="qr_page_input"
                            value={product.price || ""}
                            onChange={(e) =>
                                updateProduct(
                                    "price",
                                    e.target.value
                                )
                            }
                        />
                    </div>

                    <div className="qr_page_field">
                        <label>Precio oferta</label>

                        <input
                            type="number"
                            className="qr_page_input"
                            value={product.sale_price || ""}
                            onChange={(e) =>
                                updateProduct(
                                    "sale_price",
                                    e.target.value
                                )
                            }
                        />
                    </div>

                    <div className="qr_page_field">
                        <label>Moneda</label>

                        <select
                            className="qr_page_select"
                            value={product.currency || "ARS"}
                            onChange={(e) =>
                                updateProduct(
                                    "currency",
                                    e.target.value
                                )
                            }
                        >
                            <option value="ARS">ARS</option>
                            <option value="USD">USD</option>
                        </select>
                    </div>

                    <div className="qr_page_field">
                        <label className="qr_page_checkbox">
                            <input
                                type="checkbox"
                                checked={Number(product.stock_enabled) === 1}
                                onChange={(e) =>
                                    updateProduct(
                                        "stock_enabled",
                                        e.target.checked ? 1 : 0
                                    )
                                }
                            />
                            Controlar stock
                        </label>
                    </div>

                    <div className="qr_page_field">
                        <label>Stock</label>

                        <input
                            type="number"
                            className="qr_page_input"
                            value={product.stock_qty || 0}
                            disabled={Number(product.stock_enabled) !== 1}
                            onChange={(e) =>
                                updateProduct(
                                    "stock_qty",
                                    e.target.value
                                )
                            }
                        />
                    </div>

                </div>

            </div>

            <div className="qr_page_card mt-4">

                <h2 className="qr_page_section_title">
                    Imágenes
                </h2>

                <p className="text-muted small mb-3">Para que se vean bien en las tarjetas: imágenes cuadradas 1:1, preferentemente de 900x900 px. Formatos aceptados: WebP, PNG o JPG.</p>

                <MediaUploader
                    businessId={businessId}
                    value=""
                    folder="store/products"
                    accept="image/*"
                    label="Subir imagen"
                    onChange={(media) =>
                        addImage(media)
                    }
                />

                <div className="row mt-4">

                    {images.map((img, index) => (
                        <div
                            key={`${img.image_url}-${index}`}
                            className="col-6 col-md-3 mb-3"
                        >
                            <div
                                style={{
                                    border: Number(img.is_primary) === 1
                                        ? "2px solid #16a34a"
                                        : "1px solid #e5e7eb",
                                    borderRadius: 14,
                                    padding: 8
                                }}
                            >
                                <img
                                    src={img.image_url}
                                    alt=""
                                    style={{
                                        width: "100%",
                                        height: 140,
                                        objectFit: "cover",
                                        borderRadius: 10
                                    }}
                                />

                                <button
                                    type="button"
                                    className="qr_page_btn secondary mt-2 w-100"
                                    onClick={() =>
                                        setPrimaryImage(index)
                                    }
                                >
                                    Principal
                                </button>

                                <button
                                    type="button"
                                    className="qr_page_btn mt-2 w-100"
                                    onClick={() =>
                                        removeImage(index)
                                    }
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    ))}

                    {!images.length && (
                        <div className="col-12">
                            Todavía no hay imágenes cargadas.
                        </div>
                    )}

                </div>

            </div>

            <div className="qr_page_card mt-4">

                <h2 className="qr_page_section_title">
                    Publicación
                </h2>

                <div className="qr_page_grid">

                    <div className="qr_page_field">
                        <label>Estado</label>

                        <select
                            className="qr_page_select"
                            value={product.status || "draft"}
                            onChange={(e) =>
                                updateProduct(
                                    "status",
                                    e.target.value
                                )
                            }
                        >
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
                    </div>

                    <div className="qr_page_field">
                        <label className="qr_page_checkbox">
                            <input
                                type="checkbox"
                                checked={Number(product.is_visible) === 1}
                                onChange={(e) =>
                                    updateProduct(
                                        "is_visible",
                                        e.target.checked ? 1 : 0
                                    )
                                }
                            />
                            Visible en tienda
                        </label>
                    </div>

                    <div className="qr_page_field">
                        <label className="qr_page_checkbox">
                            <input
                                type="checkbox"
                                checked={Number(product.is_featured) === 1}
                                onChange={(e) =>
                                    updateProduct(
                                        "is_featured",
                                        e.target.checked ? 1 : 0
                                    )
                                }
                            />
                            Producto destacado
                        </label>
                    </div>

                    <div className="qr_page_field">
                        <label className="qr_page_checkbox">
                            <input
                                type="checkbox"
                                checked={Number(product.is_offer) === 1}
                                onChange={(e) =>
                                    updateProduct(
                                        "is_offer",
                                        e.target.checked ? 1 : 0
                                    )
                                }
                            />
                            Producto en oferta
                        </label>
                    </div>

                    <div className="qr_page_field">
                        <label className="qr_page_checkbox">
                            <input
                                type="checkbox"
                                checked={Number(product.is_new) === 1}
                                onChange={(e) =>
                                    updateProduct(
                                        "is_new",
                                        e.target.checked ? 1 : 0
                                    )
                                }
                            />
                            Producto nuevo
                        </label>
                    </div>

                </div>

            </div>

            <div className="qr_page_card mt-4">

                <h2 className="qr_page_section_title">
                    SEO
                </h2>

                <div className="qr_page_grid">

                    <div className="qr_page_field full">
                        <label>Título SEO</label>

                        <input
                            className="qr_page_input"
                            value={product.seo_title || ""}
                            onChange={(e) =>
                                updateProduct(
                                    "seo_title",
                                    e.target.value
                                )
                            }
                        />
                    </div>

                    <div className="qr_page_field full">
                        <label>Descripción SEO</label>

                        <textarea
                            className="qr_page_textarea"
                            value={product.seo_description || ""}
                            onChange={(e) =>
                                updateProduct(
                                    "seo_description",
                                    e.target.value
                                )
                            }
                        />
                    </div>

                </div>

            </div>

            <div className="qr_page_tab_savebar mt-4">
                <button
                    type="button"
                    className="primary tags_btn py-3 px-2"
                    style={{
                        fontWeight: "500"
                    }}
                    onClick={saveProduct}
                    disabled={saving}
                >
                    {
                        saving
                            ? "Guardando..."
                            : "Guardar producto"
                    }
                </button>
            </div>

        </div>
    );
}
