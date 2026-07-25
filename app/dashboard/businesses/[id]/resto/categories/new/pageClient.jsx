// =====================================
// FILE: /dashboard/businesses/[id]/resto/categories/new/pageClient.jsx
// Descripción:
// Editor de categorías de Tags Resto.
// Reutiliza el backend de Tags Store.
// =====================================

"use client";

import { useEffect, useState } from "react";

import { useRouter }
    from "next/navigation";

import showAlert
    from "@/app/components/showAlert";

import TagsSpinner
    from "@/app/components/TagsSpinner";

import "@/app/styles/qr-page.css";
import "@/app/styles/tags_dashboard.css";

import "../../../../../../modules/resto/styles/resto-category-editor.css";

const emptyCategory = {

    id: null,

    parent_id: "",

    name: "",

    description: "",

    image_url: "",

    sort_order: 0,

    is_visible: 1

};

export default function RestoCategoryEditorClient({
    businessId,
    categoryId,
    session
}) {

    const router =
        useRouter();

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [parents, setParents] =
        useState([]);

    const [form, setForm] =
        useState(emptyCategory);

    useEffect(() => {

        load();

        // eslint-disable-next-line
    }, []);

    async function load() {

        setLoading(true);

        try {

            const res =
                await fetch(
                    `/api/store/admin/categories/list?businessId=${businessId}&appType=resto`,
                    {
                        cache: "no-store"
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {

                throw new Error(
                    data.error ||
                    "Error cargando categorías"
                );

            }

            const categories =
                Array.isArray(data.categories)
                    ? data.categories
                    : [];

            setParents(
                categories
            );

            if (!categoryId) {
                return;
            }

            const category =
                categories.find(
                    item =>
                        String(item.id) ===
                        String(categoryId)
                );

            if (!category) {

                throw new Error(
                    "Categoría no encontrada"
                );

            }

            setForm({
                ...emptyCategory,
                ...category,
                parent_id:
                    category.parent_id || ""
            });

        } catch (err) {

            showAlert({
                icon: "error",
                title: "Error",
                text:
                    err.message ||
                    "No se pudo cargar la categoría"
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
                    "/api/store/admin/categories/save",
                    {

                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body: JSON.stringify({
                            businessId,
                            appType: "resto",
                            categoryId:
                                categoryId || null,
                            ...form
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

                title: "Categoría guardada"

            });

            router.push(
                `/dashboard/businesses/${businessId}/resto/categories`
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

                                categoryId

                                    ? "Editar categoría"

                                    : "Nueva categoría"

                            }

                        </span>

                    </h1>

                    <p className="qr_page_subtitle">

                        Organización de la carta gastronómica.

                    </p>

                    <small
                        className="resto_categories_email"
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
                            value={form.name}
                            onChange={e =>
                                update(
                                    "name",
                                    e.target.value
                                )
                            }
                        />

                    </div>

                    <div className="qr_page_field">

                        <label>

                            Categoría principal

                        </label>

                        <select
                            className="qr_page_select"
                            value={form.parent_id || ""}
                            onChange={e =>
                                update(
                                    "parent_id",
                                    e.target.value
                                )
                            }
                        >

                            <option value="">

                                Ninguna

                            </option>

                            {

                                parents
                                    .filter(cat =>
                                        cat.id !== categoryId
                                    )
                                    .map(cat => (

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
                            rows={4}
                            className="qr_page_textarea"
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

                            Orden

                        </label>

                        <input
                            type="number"
                            className="qr_page_input"
                            value={form.sort_order}
                            onChange={e =>
                                update(
                                    "sort_order",
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

                        Categoría visible

                    </label>

                </div>

            </div>

        </div>

    );

}