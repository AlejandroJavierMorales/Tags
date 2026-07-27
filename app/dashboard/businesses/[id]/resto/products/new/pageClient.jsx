// =====================================
// FILE: /dashboard/businesses/[id]/resto/products/pageEditorClient.jsx
// Descripción:
// Editor de productos de Tags Resto.
// Reutiliza el backend de Store con una
// interfaz adaptada a gastronomía.
// =====================================

"use client";

import { useEffect, useState } from "react";

import { useRouter }
    from "next/navigation";

import showAlert
    from "@/app/components/showAlert";

import TagsSpinner
    from "@/app/components/TagsSpinner";

import MediaUploader
    from "@/app/components/MediaUploader";

import "@/app/styles/qr-page.css";
import "@/app/styles/tags_dashboard.css";

import "../../../../../../modules/resto/styles/resto-product-editor.css";

const emptyProduct = {

    id: null,

    title: "",

    description: "",

    category_id: "",

    image_url: "",

    price: "",

    sale_price: "",

    is_visible: 1,

    is_featured: 0,

    is_available: true,

    stock_control: 0,

    requires_preparation: 1,

    stock_qty: 0
};





export default function RestoProductEditorClient({
    businessId,
    productId,
    session,
    isAdmin
}) {



    const router =
        useRouter();

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [form, setForm] =
        useState(emptyProduct);

    const [categories, setCategories] =
        useState([]);

    useEffect(() => {

        load();

        // eslint-disable-next-line
    }, []);

    async function load() {

        setLoading(true);

        try {

            const categoriesRes =
                await fetch(
                    `/api/store/admin/categories/list?businessId=${businessId}&appType=resto`,
                    {
                        cache: "no-store"
                    }
                );

            const categoriesData =
                await categoriesRes.json();

            if (!categoriesRes.ok) {

                throw new Error(
                    categoriesData.error ||
                    "Error cargando categorías"
                );

            }

            setCategories(
                Array.isArray(
                    categoriesData.categories
                )
                    ? categoriesData.categories
                    : []
            );
            if (!productId) {

                setLoading(false);

                return;

            }

            const res =
                await fetch(
                    `/api/store/admin/products/get?id=${productId}&businessId=${businessId}&appType=resto`,
                    {
                        cache: "no-store"
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {

                throw new Error(
                    data.error
                );

            }

            const primaryImage =
                Array.isArray(data.images)
                    ? (
                        data.images.find(
                            image =>
                                Number(image.is_primary) === 1
                        ) ||
                        data.images[0] ||
                        null
                    )
                    : null;

            setForm({
                ...emptyProduct,
                ...data.product,
                is_available:
                    data.product
                        ?.settings_json
                        ?.resto_available !==
                    false,
                image_url:
                    primaryImage?.image_url ||
                    ""
            });

        } catch (err) {

            showAlert({

                icon: "error",

                title: "Error",

                text: err.message

            });

        } finally {

            setLoading(false);

        }

    }

    function update(field, value) {

        setForm(prev => ({

            ...prev,

            [field]: value

        }));

    }

    async function save() {

        setSaving(true);

        try {

            const res =
                await fetch(
                    "/api/store/admin/products/save",
                    {

                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body: JSON.stringify({
                            businessId,
                            appType: "resto",
                            productId:
                                productId || null,
                            ...form,
                            settings_json: {
                                ...(
                                    form.settings_json ||
                                    {}
                                ),
                                resto_available:
                                    form.is_available !==
                                    false
                            }
                        })

                    }
                );

            const data =
                await res.json();

            if (!res.ok) {

                throw new Error(
                    data.error
                );

            }

            showAlert({

                icon: "success",

                title: "Producto guardado"

            });

            router.push(
                `/dashboard/businesses/${businessId}/resto/products`
            );

        } catch (err) {

            showAlert({

                icon: "error",

                title: "Error",

                text: err.message

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





    /*  UI  */

    return (

        <div className="qr_page_builder">

            <div className="qr_page_header">

                <div>

                    <h1 className="qr_page_title store_admin_title">

                        <span className="store_admin_title_icon">

                            🍽️

                        </span>

                        <span>

                            {

                                productId

                                    ? "Editar producto"

                                    : "Nuevo producto"

                            }

                        </span>

                    </h1>

                    <p className="qr_page_subtitle">

                        Carta gastronómica.

                    </p>

                    <small
                        className="resto_products_email"
                    >

                        {session.email}

                    </small>

                </div>

                <div className="qr_page_actions">

                    <button
                        className="qr_page_btn secondary"
                        onClick={() =>
                            router.back()
                        }
                    >
                        Cancelar
                    </button>

                    <button
                        className="qr_page_btn success"
                        onClick={save}
                        disabled={saving}
                    >
                        {

                            saving

                                ? "Guardando..."

                                : "Guardar"

                        }
                    </button>

                </div>

            </div>

            <div className="qr_page_card">

                <div className="qr_page_grid">

                    <div className="qr_page_field">

                        <label>

                            Nombre

                        </label>

                        <input
                            className="qr_page_input"
                            value={form.title}
                            onChange={e =>
                                update(
                                    "title",
                                    e.target.value
                                )
                            }
                        />

                    </div>

                    <div className="qr_page_field">

                        <label>

                            Categoría

                        </label>

                        <select
                            className="qr_page_select"
                            value={form.category_id}
                            onChange={e =>
                                update(
                                    "category_id",
                                    e.target.value
                                )
                            }
                        >

                            <option value="">

                                Seleccionar

                            </option>

                            {

                                categories.map(cat => (

                                    <option
                                        key={cat.id}
                                        value={cat.id}
                                    >

                                        {cat.name}

                                    </option>

                                ))

                            }

                        </select>

                    </div>

                    <div className="qr_page_field full">

                        <label>

                            Descripción

                        </label>

                        <textarea
                            className="qr_page_textarea"
                            rows={5}
                            value={form.description}
                            onChange={e =>
                                update(
                                    "description",
                                    e.target.value
                                )
                            }
                        />

                    </div>

                    <div className="qr_page_field">

                        <label>

                            Imagen

                        </label>

                        <MediaUploader
                            businessId={businessId}
                            value={form.image_url}
                            folder="store/products"
                            accept="image/*"
                            label="Subir imagen"
                            onChange={media =>
                                update(
                                    "image_url",
                                    media?.url || ""
                                )
                            }
                        />

                    </div>

                    <div className="qr_page_field">

                        <label>

                            Precio

                        </label>

                        <input
                            type="number"
                            className="qr_page_input"
                            value={form.price}
                            onChange={e =>
                                update(
                                    "price",
                                    e.target.value
                                )
                            }
                        />

                    </div>

                    <div className="qr_page_field">

                        <label>

                            Precio promocional

                        </label>

                        <input
                            type="number"
                            className="qr_page_input"
                            value={form.sale_price}
                            onChange={e =>
                                update(
                                    "sale_price",
                                    e.target.value
                                )
                            }
                        />

                    </div>

                    <label className="qr_page_checkbox">

                        <input
                            type="checkbox"
                            checked={!!form.is_visible}
                            onChange={e =>
                                update(
                                    "is_visible",
                                    e.target.checked
                                        ? 1
                                        : 0
                                )
                            }
                        />

                        Visible

                    </label>

                    <label className="qr_page_checkbox">

                        <input
                            type="checkbox"
                            checked={!!form.is_featured}
                            onChange={e =>
                                update(
                                    "is_featured",
                                    e.target.checked
                                        ? 1
                                        : 0
                                )
                            }
                        />

                        Destacado

                    </label>

                    <label className="qr_page_checkbox">

                        <input
                            type="checkbox"
                            checked={
                                form.is_available !==
                                false
                            }
                            onChange={e =>
                                update(
                                    "is_available",
                                    e.target.checked
                                )
                            }
                        />

                        Disponible para pedidos

                        <small
                            className="d-block text-muted ms-4"
                        >
                            Desmarcar para mostrarlo como agotado
                            sin quitarlo de la carta.
                        </small>

                    </label>

                    <label className="qr_page_checkbox">

                        <input
                            type="checkbox"
                            checked={!!form.stock_control}
                            onChange={e =>
                                update(
                                    "stock_control",
                                    e.target.checked
                                        ? 1
                                        : 0
                                )
                            }
                        />

                        Controlar stock

                    </label>

                    <label className="qr_page_checkbox">

                        <input
                            type="checkbox"
                            checked={!!form.requires_preparation}
                            onChange={e =>
                                update(
                                    "requires_preparation",
                                    e.target.checked ? 1 : 0
                                )
                            }
                        />

                        Requiere preparación

                        <small
                            className="d-block text-muted ms-4"
                        >
                            Desmarcar para bebidas, productos
                            envasados u otros artículos que no
                            deban enviarse a cocina.
                        </small>

                    </label>

                    {

                        !!form.stock_control && (

                            <div className="qr_page_field">

                                <label>

                                    Stock

                                </label>

                                <input
                                    type="number"
                                    className="qr_page_input"
                                    value={form.stock_qty}
                                    onChange={e =>
                                        update(
                                            "stock_qty",
                                            e.target.value
                                        )
                                    }
                                />

                            </div>

                        )

                    }

                </div>

            </div>

        </div>

    );

}
