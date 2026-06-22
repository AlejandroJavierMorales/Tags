// =====================================
// PAGE CLIENT: /dashboard/businesses/[id]/store/categories
// Descripción: Administra categorías de Tags Tienda.
// =====================================

"use client";

import "@/app/styles/tags_store_admin.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import showAlert from "@/app/components/showAlert";
import TagsSpinner from "@/app/components/TagsSpinner";
import MediaUploader from "@/app/components/MediaUploader";

import "@/app/styles/qr-page.css";
import "@/app/styles/tags_dashboard.css";

const emptyCategory = {
    id: null,
    parent_id: "",
    name: "",
    slug: "",
    image_url: "",
    description: "",
    sort_order: 0,
    is_visible: 1
};

function createSlug(value) {
    return String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
}

export default function StoreCategoriesClient({
    businessId,
    session,
    isAdmin
}) {
    const router =
        useRouter();

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [categories, setCategories] =
        useState([]);

    const [storeId, setStoreId] =
        useState(null);

    const [form, setForm] =
        useState(emptyCategory);

    const [editing, setEditing] =
        useState(false);

    const [storeMissing, setStoreMissing] =
        useState(false);

    useEffect(() => {
        loadCategories();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [businessId]);

    async function loadCategories() {
        setLoading(true);

        try {
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

            setStoreMissing(!!data.storeMissing);
            setCategories(data.categories || []);
            setStoreId(data.storeId || null);

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

    function updateForm(field, value) {
        setForm(prev => ({
            ...prev,
            [field]: value
        }));
    }

    function handleNameChange(value) {
        setForm(prev => ({
            ...prev,
            name: value,
            slug: prev.id
                ? prev.slug
                : createSlug(value)
        }));
    }

    function resetForm() {
        setForm(emptyCategory);
        setEditing(false);
    }

    function editCategory(category) {
        setForm({
            ...emptyCategory,
            ...category,
            parent_id: category.parent_id || "",
            is_visible:
                Number(category.is_visible) === 0
                    ? 0
                    : 1
        });

        setEditing(true);

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }

    async function saveCategory() {
        if (!form.name) {
            showAlert({
                title: "Nombre requerido",
                text: "Ingresá el nombre de la categoría.",
                icon: "error"
            });

            return;
        }

        if (!form.slug) {
            showAlert({
                title: "URL requerida",
                text: "Ingresá el slug de la categoría.",
                icon: "error"
            });

            return;
        }

        setSaving(true);

        try {
            const res =
                await fetch(
                    "/api/store/admin/categories/save",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            businessId,
                            categoryId: form.id,
                            parent_id: form.parent_id || null,
                            name: form.name,
                            slug: form.slug,
                            image_url: form.image_url,
                            description: form.description,
                            sort_order: form.sort_order,
                            is_visible: form.is_visible
                        })
                    }
                );

            const data =
                await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "No se pudo guardar la categoría"
                );
            }

            showAlert({
                title: "OK",
                text: data.message || "Categoría guardada",
                icon: "success"
            });

            resetForm();
            await loadCategories();

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

    async function deleteCategory(category) {
        const confirm =
            await showAlert({
                title: "Eliminar categoría",
                text: `¿Querés eliminar "${category.name}"?`,
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
                    "/api/store/admin/categories/delete",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            businessId,
                            categoryId: category.id
                        })
                    }
                );

            const data =
                await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "No se pudo eliminar la categoría"
                );
            }

            showAlert({
                title: "OK",
                text: data.message || "Categoría eliminada",
                icon: "success"
            });

            await loadCategories();

        } catch (err) {
            showAlert({
                title: "Error",
                text: err.message,
                icon: "error"
            });
        }
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
                                🏷️
                            </span>

                            <span>
                                Categorías
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
                        Para crear categorías, primero tenés que guardar la configuración general de Tags Tienda.
                    </div>
                </div>

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
                            🏷️
                        </span>

                        <span>
                            Categorías
                        </span>
                    </h1>

                    <p className="qr_page_subtitle">
                        Organizá los productos de Tags Tienda.
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
                        Volver a tienda
                    </button>

                    <button
                        type="button"
                        className="qr_page_btn success"
                        onClick={saveCategory}
                        disabled={saving}
                    >
                        {
                            saving
                                ? "Guardando..."
                                : editing
                                    ? "Guardar cambios"
                                    : "Crear categoría"
                        }
                    </button>

                </div>

            </div>

            <div className="qr_page_status">
                Total categorías:{" "}
                <strong>
                    {categories.length}
                </strong>
            </div>

            <div className="qr_page_card">

                <h2 className="qr_page_section_title">
                    {
                        editing
                            ? "Editar categoría"
                            : "Nueva categoría"
                    }
                </h2>

                <div className="qr_page_grid">

                    <div className="qr_page_field">
                        <label>Nombre</label>

                        <input
                            className="qr_page_input"
                            value={form.name || ""}
                            onChange={(e) =>
                                handleNameChange(e.target.value)
                            }
                            placeholder="Ej: Remeras"
                        />
                    </div>

                    <div className="qr_page_field">
                        <label>URL</label>

                        <input
                            className="qr_page_input"
                            value={form.slug || ""}
                            onChange={(e) =>
                                updateForm(
                                    "slug",
                                    createSlug(e.target.value)
                                )
                            }
                            placeholder="remeras"
                        />

                        <small className="qr_page_help">
                            URL interna de la categoría.
                        </small>
                    </div>

                    <div className="qr_page_field">
                        <label>Categoría padre</label>

                        <select
                            className="qr_page_select"
                            value={form.parent_id || ""}
                            onChange={(e) =>
                                updateForm(
                                    "parent_id",
                                    e.target.value
                                )
                            }
                        >
                            <option value="">
                                Sin categoría padre
                            </option>

                            {categories
                                .filter(cat =>
                                    Number(cat.id) !== Number(form.id)
                                )
                                .map(cat => (
                                    <option
                                        key={cat.id}
                                        value={cat.id}
                                    >
                                        {cat.name}
                                    </option>
                                ))}
                        </select>
                    </div>

                    <div className="qr_page_field">
                        <label>Orden</label>

                        <input
                            type="number"
                            className="qr_page_input"
                            value={form.sort_order || 0}
                            onChange={(e) =>
                                updateForm(
                                    "sort_order",
                                    Number(e.target.value)
                                )
                            }
                        />
                    </div>

                    <div className="qr_page_field full">
                        <label>Descripción</label>

                        <textarea
                            className="qr_page_textarea"
                            value={form.description || ""}
                            onChange={(e) =>
                                updateForm(
                                    "description",
                                    e.target.value
                                )
                            }
                        />
                    </div>

                    <div className="qr_page_field">
                        <label>Imagen</label>

                        <MediaUploader
                            businessId={businessId}
                            value={form.image_url || ""}
                            folder="store/categories"
                            accept="image/*"
                            label="Subir imagen"
                            onChange={(media) =>
                                updateForm(
                                    "image_url",
                                    media?.url || null
                                )
                            }
                        />
                    </div>

                    <div className="qr_page_field">
                        <label className="qr_page_checkbox">
                            <input
                                type="checkbox"
                                checked={Number(form.is_visible) === 1}
                                onChange={(e) =>
                                    updateForm(
                                        "is_visible",
                                        e.target.checked ? 1 : 0
                                    )
                                }
                            />

                            Visible
                        </label>
                    </div>

                </div>

                <div className="qr_page_actions mt-4">

                    <button
                        type="button"
                        className="qr_page_btn success"
                        onClick={saveCategory}
                        disabled={saving}
                    >
                        {
                            saving
                                ? "Guardando..."
                                : editing
                                    ? "Guardar cambios"
                                    : "Crear categoría"
                        }
                    </button>

                    {editing && (
                        <button
                            type="button"
                            className="qr_page_btn secondary"
                            onClick={resetForm}
                        >
                            Cancelar edición
                        </button>
                    )}

                </div>

            </div>

            <div className="qr_page_card mt-4">

                <h2 className="qr_page_section_title">
                    Categorías cargadas
                </h2>

                <div className="tags_table_wrapper mt-3">

                    <table className="tags_table tags_text_normal">

                        <thead>
                            <tr>
                                <th>Orden</th>
                                <th>Nombre</th>
                                <th>URL</th>
                                <th>Padre</th>
                                <th>Visible</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>

                        <tbody>
                            {categories.map(category => {
                                const parent =
                                    categories.find(cat =>
                                        Number(cat.id) === Number(category.parent_id)
                                    );

                                return (
                                    <tr key={category.id}>
                                        <td>
                                            {category.sort_order || 0}
                                        </td>

                                        <td>
                                            <strong>
                                                {category.name}
                                            </strong>
                                        </td>

                                        <td>
                                            {category.slug}
                                        </td>

                                        <td>
                                            {parent?.name || "-"}
                                        </td>

                                        <td>
                                            {Number(category.is_visible) === 1
                                                ? "✅"
                                                : "🚫"}
                                        </td>

                                        <td>
                                            <div className="d-flex gap-2 flex-wrap">
                                                <button
                                                    type="button"
                                                    className="qr_page_btn secondary"
                                                    onClick={() =>
                                                        editCategory(category)
                                                    }
                                                >
                                                    Editar
                                                </button>

                                                <button
                                                    type="button"
                                                    className="qr_page_btn"
                                                    onClick={() =>
                                                        deleteCategory(category)
                                                    }
                                                >
                                                    Eliminar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}

                            {!categories.length && (
                                <tr>
                                    <td colSpan={6}>
                                        Todavía no hay categorías cargadas.
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