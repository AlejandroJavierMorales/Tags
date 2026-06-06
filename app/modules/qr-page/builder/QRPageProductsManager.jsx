"use client";

import { useState }
    from "react";

import showAlert
    from "@/app/components/showAlert";

import MediaUploader
    from "@/app/components/MediaUploader";

export default function QRPageProductsManager({
    businessId,
    pageId,
    products = [],
    onReload
}) {

    const emptyForm = {
        id: null,
        category: "products",
        title: "",
        description: "",
        price: "",
        currency: "ARS",
        image_url: "",
        images_json: [],
        button_label: "Consultar",
        button_url: "",
        whatsapp_text: "",
        is_visible: 1,
        seo_title: "",
        seo_description: "",
        old_price: "",
        discount_label: "",

    };

    const [form, setForm] =
        useState(emptyForm);

    const [editing, setEditing] =
        useState(false);

    const [saving, setSaving] =
        useState(false);

    function updateField(field, value) {
        setForm((prev) => ({
            ...prev,
            [field]: value
        }));
    }

    function resetForm() {
        setForm(emptyForm);
        setEditing(false);
    }

    async function apiPost(url, body) {

        const res =
            await fetch(
                url,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(body)
                }
            );

        const data =
            await res.json();

        if (!res.ok) {
            throw new Error(
                data.error ||
                "Error en la operación"
            );
        }

        return data;
    }

    async function handleSave() {

        if (!form.title.trim()) {
            showAlert({
                type: "error",
                title: "Falta título",
                text: "Ingresá el nombre del producto"
            });
            return;
        }

        setSaving(true);

        try {

            const payload = {
                businessId,
                pageId,
                productId: form.id,
                category: form.category || "products",
                title: form.title,
                description: form.description,
                price: form.price || null,
                old_price: form.old_price || null,
                discount_label: form.discount_label || null,
                currency: form.currency || "ARS",
                image_url: form.image_url || null,
                images_json: form.images_json || [],
                button_label: form.button_label || "Consultar",
                button_url: form.button_url || null,
                whatsapp_text: form.whatsapp_text || null,
                is_visible: form.is_visible ? 1 : 0,
                seo_title: form.seo_title || null,
                seo_description: form.seo_description || null
            };

            await apiPost(
                editing
                    ? "/api/qr-page/products/update"
                    : "/api/qr-page/products/create",
                payload
            );

            showAlert({
                type: "success",
                title: "Listo",
                text:
                    editing
                        ? "Producto actualizado"
                        : "Producto creado"
            });

            resetForm();
            await onReload();

        } catch (err) {

            showAlert({
                type: "error",
                title: "Error",
                text: err.message
            });

        } finally {

            setSaving(false);
        }
    }

    async function handleDelete(product) {

        const confirmed =
            window.confirm(
                `¿Eliminar "${product.title}"?`
            );

        if (!confirmed) {
            return;
        }

        setSaving(true);

        try {

            await apiPost(
                "/api/qr-page/products/delete",
                {
                    businessId,
                    pageId,
                    productId: product.id
                }
            );

            showAlert({
                type: "success",
                title: "Eliminado",
                text: "Producto eliminado"
            });

            await onReload();

        } catch (err) {

            showAlert({
                type: "error",
                title: "Error",
                text: err.message
            });

        } finally {

            setSaving(false);
        }
    }

    async function handleToggle(product) {

        setSaving(true);

        try {

            await apiPost(
                "/api/qr-page/products/update",
                {
                    businessId,
                    pageId,
                    productId: product.id,
                    category: product.category || "products",
                    title: product.title,
                    description: product.description,
                    price: product.price,
                    old_price: product.old_price,
                    discount_label: product.discount_label,
                    currency: product.currency,
                    image_url: product.image_url,
                    button_label: product.button_label,
                    button_url: product.button_url,
                    whatsapp_text: product.whatsapp_text,
                    is_visible: product.is_visible ? 0 : 1,
                    seo_title: product.seo_title,
                    seo_description: product.seo_description
                }
            );

            await onReload();

        } catch (err) {

            showAlert({
                type: "error",
                title: "Error",
                text: err.message
            });

        } finally {

            setSaving(false);
        }
    }

    async function handleMove(index, direction) {

        const targetIndex =
            direction === "up"
                ? index - 1
                : index + 1;

        if (
            targetIndex < 0 ||
            targetIndex >= products.length
        ) {
            return;
        }

        const next =
            [...products];

        const current =
            next[index];

        next[index] =
            next[targetIndex];

        next[targetIndex] =
            current;

        const reordered =
            next.map((product, i) => ({
                id: product.id,
                sort_order: i + 1
            }));

        setSaving(true);

        try {

            await apiPost(
                "/api/qr-page/products/reorder",
                {
                    businessId,
                    pageId,
                    products: reordered
                }
            );

            await onReload();

        } catch (err) {

            showAlert({
                type: "error",
                title: "Error",
                text: err.message
            });

        } finally {

            setSaving(false);
        }
    }

    function handleEdit(product) {

        setForm({
            id: product.id,
            title: product.title || "",
            description: product.description || "",
            price: product.price || "",
            old_price: product.old_price || "",
            discount_label: product.discount_label || "",
            currency: product.currency || "ARS",
            image_url: product.image_url || "",
            images_json:
                Array.isArray(product.images_json)
                    ? product.images_json
                    : [],
            button_label: product.button_label || "Consultar",
            button_url: product.button_url || "",
            whatsapp_text: product.whatsapp_text || "",
            is_visible: product.is_visible ? 1 : 0,
            seo_title: product.seo_title || "",
            seo_description: product.seo_description || ""
        });

        setEditing(true);
    }

    return (
        <div className="qr_page_products_manager mb-5">

            <div className="qr_page_builder_panel_header">
                <div>
                    <h2>
                        Productos
                    </h2>

                    <p>
                        Cargá los productos o servicios que se mostrarán en el bloque catálogo.
                    </p>
                </div>
            </div>

            <div className="qr_page_card qr_page_products_form">
                <h3>
                    {
                        editing
                            ? "Editar producto"
                            : "Nuevo producto"
                    }
                </h3>

                <div className="qr_page_grid">

                    <div className="qr_page_field">
                        <label>Nombre</label>
                        <input
                            className="qr_page_input"
                            value={form.title}
                            onChange={(e) =>
                                updateField(
                                    "title",
                                    e.target.value
                                )
                            }
                        />
                    </div>

                    <div className="qr_page_field">
                        <label>Precio</label>
                        <input
                            className="qr_page_input"
                            type="number"
                            value={form.price}
                            onChange={(e) =>
                                updateField(
                                    "price",
                                    e.target.value
                                )
                            }
                        />
                    </div>

                    <div className="qr_page_field">
                        <label>Precio anterior</label>
                        <input
                            className="qr_page_input"
                            type="number"
                            value={form.old_price}
                            onChange={(e) =>
                                updateField(
                                    "old_price",
                                    e.target.value
                                )
                            }
                        />
                    </div>

                    <div className="qr_page_field">
                        <label>Descuento</label>
                        <input
                            className="qr_page_input"
                            value={form.discount_label}
                            placeholder="Ej: 20% OFF"
                            onChange={(e) =>
                                updateField(
                                    "discount_label",
                                    e.target.value
                                )
                            }
                        />
                    </div>

                    <div className="qr_page_field">
                        <label>Moneda</label>
                        <select
                            className="qr_page_select"
                            value={form.currency}
                            onChange={(e) =>
                                updateField(
                                    "currency",
                                    e.target.value
                                )
                            }
                        >
                            <option value="ARS">
                                ARS
                            </option>
                            <option value="USD">
                                USD
                            </option>
                        </select>
                    </div>

                    <div className="qr_page_field">
                        <label>Categoría</label>

                        <select
                            className="qr_page_select"
                            value={form.category}
                            onChange={(e) =>
                                updateField(
                                    "category",
                                    e.target.value
                                )
                            }
                        >
                            <option value="products">
                                Productos
                            </option>

                            <option value="services">
                                Servicios
                            </option>

                            <option value="featured">
                                Destacados
                            </option>

                            <option value="offers">
                                Ofertas
                            </option>
                        </select>
                    </div>

                    <div className="qr_page_field">
                        <label>Texto del botón</label>
                        <input
                            className="qr_page_input"
                            value={form.button_label}
                            onChange={(e) =>
                                updateField(
                                    "button_label",
                                    e.target.value
                                )
                            }
                        />
                    </div>

                    <div className="qr_page_field full">
                        <label>Descripción</label>
                        <textarea
                            className="qr_page_textarea"
                            value={form.description}
                            onChange={(e) =>
                                updateField(
                                    "description",
                                    e.target.value
                                )
                            }
                        />
                    </div>

                    <div className="qr_page_field full">

                        <label>
                            Imágenes del producto
                        </label>

                        <small>
                            Máximo 4 imágenes
                        </small>

                        {
                            form.images_json.length < 4 && (
                                <MediaUploader
                                    businessId={businessId}
                                    value=""
                                    folder="products"
                                    accept="image/*"
                                    label="Agregar imagen"
                                    onChange={(media) => {

                                        if (!media?.url) {
                                            return;
                                        }

                                        updateField(
                                            "images_json",
                                            [
                                                ...form.images_json,
                                                {
                                                    url: media.url,
                                                    alt: form.title || ""
                                                }
                                            ]
                                        );

                                        if (!form.image_url) {
                                            updateField(
                                                "image_url",
                                                media.url
                                            );
                                        }
                                    }}
                                />
                            )
                        }

                        <div className="qr_page_gallery_editor">

                            {
                                form.images_json.map(
                                    (image, index) => (
                                        <div
                                            key={`${image.url}-${index}`}
                                            className="qr_page_gallery_editor_item"
                                        >

                                            <img
                                                src={image.url}
                                                alt=""
                                            />

                                            <button
                                                type="button"
                                                className="danger"
                                                onClick={() => {

                                                    const next =
                                                        form.images_json.filter(
                                                            (_, i) =>
                                                                i !== index
                                                        );

                                                    updateField(
                                                        "images_json",
                                                        next
                                                    );

                                                    if (
                                                        index === 0
                                                    ) {
                                                        updateField(
                                                            "image_url",
                                                            next[0]?.url || ""
                                                        );
                                                    }
                                                }}
                                            >
                                                Eliminar
                                            </button>

                                        </div>
                                    )
                                )
                            }

                        </div>

                    </div>

                    <div className="qr_page_field full">
                        <label>URL del botón</label>
                        <input
                            className="qr_page_input"
                            value={form.button_url}
                            placeholder="Opcional. Ej: https://..."
                            onChange={(e) =>
                                updateField(
                                    "button_url",
                                    e.target.value
                                )
                            }
                        />
                    </div>

                    <div className="qr_page_field full">
                        <label>Texto para WhatsApp</label>
                        <textarea
                            className="qr_page_textarea"
                            value={form.whatsapp_text}
                            placeholder="Ej: Hola, quiero consultar por este producto."
                            onChange={(e) =>
                                updateField(
                                    "whatsapp_text",
                                    e.target.value
                                )
                            }
                        />
                    </div>

                    <div className="qr_page_field">
                        <label className="qr_page_checkbox">
                            <input
                                type="checkbox"
                                checked={!!form.is_visible}
                                onChange={(e) =>
                                    updateField(
                                        "is_visible",
                                        e.target.checked ? 1 : 0
                                    )
                                }
                            />
                            Mostrar producto
                        </label>
                    </div>

                </div>

                <div className="qr_page_actions mt">
                    <button
                        type="button"
                        className="qr_page_btn success"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {
                            saving
                                ? "Guardando..."
                                : editing
                                    ? "Guardar cambios"
                                    : "Agregar producto"
                        }
                    </button>

                    {
                        editing && (
                            <button
                                type="button"
                                className="qr_page_btn secondary"
                                onClick={resetForm}
                            >
                                Cancelar edición
                            </button>
                        )
                    }
                </div>
            </div>

            <div className="qr_page_products_list mt-5">

                {
                    !products.length && (
                        <div className="qr_page_empty">
                            Todavía no cargaste productos.
                        </div>
                    )
                }

                {
                    products.map((product, index) => (
                        <article
                            key={product.id}
                            className="qr_page_product_admin_card mt-3"
                        >
                            <div className="qr_page_product_admin_images">
                                {
                                    (
                                        Array.isArray(product.images_json)
                                            ? product.images_json
                                            : product.image_url
                                                ? [{ url: product.image_url }]
                                                : []
                                    ).slice(0, 4).map((image, imageIndex) => (
                                        <img
                                            key={`${image.url}-${imageIndex}`}
                                            src={image.url}
                                            alt={product.title}
                                        />
                                    ))
                                }
                            </div>

                            <div className="qr_page_product_admin_body">
                                <h3>
                                    {product.title}
                                </h3>

                                {
                                    product.description && (
                                        <p>
                                            {product.description}
                                        </p>
                                    )
                                }

                                {
                                    product.price && (
                                        <strong>
                                            {product.currency || "ARS"}{" "}
                                            {product.price}
                                        </strong>
                                    )
                                }

                                <span className="qr_page_product_status">
                                    {
                                        product.is_visible
                                            ? "Visible"
                                            : "Oculto"
                                    }
                                </span>
                            </div>

                            <div className="qr_page_small_actions">
                                <button
                                    type="button"
                                    onClick={() =>
                                        handleMove(index, "up")
                                    }
                                    disabled={
                                        saving ||
                                        index === 0
                                    }
                                >
                                    ↑
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        handleMove(index, "down")
                                    }
                                    disabled={
                                        saving ||
                                        index === products.length - 1
                                    }
                                >
                                    ↓
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        handleEdit(product)
                                    }
                                    disabled={saving}
                                >
                                    Editar
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        handleToggle(product)
                                    }
                                    disabled={saving}
                                >
                                    {
                                        product.is_visible
                                            ? "Ocultar"
                                            : "Mostrar"
                                    }
                                </button>

                                <button
                                    type="button"
                                    className="danger"
                                    onClick={() =>
                                        handleDelete(product)
                                    }
                                    disabled={saving}
                                >
                                    Eliminar
                                </button>
                            </div>
                        </article>
                    ))
                }

            </div>

        </div>
    );
}