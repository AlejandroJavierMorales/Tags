// =====================================
// PAGE CLIENT: /dashboard/businesses/[id]/store/products/[productId]/variants
// Descripción: Administra opciones, valores y variantes de un producto.
// =====================================

"use client";

import "@/app/styles/tags_store_admin.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import showAlert from "@/app/components/showAlert";
import TagsSpinner from "@/app/components/TagsSpinner";

import "@/app/styles/qr-page.css";
import "@/app/styles/tags_dashboard.css";

function makeTempId(prefix = "tmp") {
    return `${prefix}_${Date.now()}_${Math.random()
        .toString(16)
        .slice(2)}`;
}

function buildVariantTitle(values = []) {
    return values
        .map(value =>
            value.option_value ||
            value.value ||
            ""
        )
        .filter(Boolean)
        .join(" / ");
}

function getCombinations(groups) {
    if (!groups.length) {
        return [];
    }

    return groups.reduce(
        (acc, group) => {
            const values =
                group.values || [];

            if (!values.length) {
                return acc;
            }

            if (!acc.length) {
                return values.map(value => [value]);
            }

            const next = [];

            acc.forEach(combo => {
                values.forEach(value => {
                    next.push([
                        ...combo,
                        value
                    ]);
                });
            });

            return next;
        },
        []
    );
}

export default function StoreProductVariantsClient({
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

    const [product, setProduct] =
        useState(null);

    const [options, setOptions] =
        useState([]);

    const [variants, setVariants] =
        useState([]);

    useEffect(() => {
        loadVariants();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [businessId, productId]);

    async function loadVariants() {
        setLoading(true);

        try {
            const res =
                await fetch(
                    `/api/store/admin/variants/get?businessId=${businessId}&productId=${productId}`,
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

            setProduct(data.product || null);

            const loadedOptions =
                (data.options || []).map(option => ({
                    ...option,
                    tempId:
                        `option_${option.id}`,
                    values:
                        (data.optionValues || [])
                            .filter(value =>
                                Number(value.option_id) === Number(option.id)
                            )
                            .map(value => ({
                                ...value,
                                tempId:
                                    `value_${value.id}`,
                                option_name:
                                    option.name,
                                option_value:
                                    value.value
                            }))
                }));

            setOptions(loadedOptions);

            setVariants(
                (data.variants || []).map(variant => ({
                    ...variant,
                    values:
                        (variant.values || []).map(value => ({
                            ...value,
                            tempId:
                                `value_${value.option_value_id}`,
                            option_value_temp_id:
                                `value_${value.option_value_id}`,
                            option_name:
                                value.option_name,
                            option_value:
                                value.option_value
                        }))
                }))
            );

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

    function addOption() {
        setOptions(prev => [
            ...prev,
            {
                tempId: makeTempId("option"),
                name: "",
                values: []
            }
        ]);
    }

    function updateOption(index, field, value) {
        setOptions(prev =>
            prev.map((option, i) =>
                i === index
                    ? {
                        ...option,
                        [field]: value
                    }
                    : option
            )
        );
    }

    function removeOption(index) {
        setOptions(prev =>
            prev.filter((_, i) => i !== index)
        );
    }

    function addOptionValue(optionIndex) {
        setOptions(prev =>
            prev.map((option, i) =>
                i === optionIndex
                    ? {
                        ...option,
                        values: [
                            ...(option.values || []),
                            {
                                tempId: makeTempId("value"),
                                value: "",
                                option_name: option.name,
                                option_value: ""
                            }
                        ]
                    }
                    : option
            )
        );
    }

    function updateOptionValue(optionIndex, valueIndex, field, value) {
        setOptions(prev =>
            prev.map((option, i) => {
                if (i !== optionIndex) {
                    return option;
                }

                const nextValues =
                    (option.values || []).map((item, j) =>
                        j === valueIndex
                            ? {
                                ...item,
                                [field]: value,
                                option_name:
                                    option.name,
                                option_value:
                                    value
                            }
                            : item
                    );

                return {
                    ...option,
                    values: nextValues
                };
            })
        );
    }

    function removeOptionValue(optionIndex, valueIndex) {
        setOptions(prev =>
            prev.map((option, i) =>
                i === optionIndex
                    ? {
                        ...option,
                        values:
                            (option.values || []).filter(
                                (_, j) => j !== valueIndex
                            )
                    }
                    : option
            )
        );
    }

    function generateVariants() {
        const cleanOptions =
            options
                .map(option => ({
                    ...option,
                    name:
                        String(option.name || "").trim(),
                    values:
                        (option.values || [])
                            .map(value => ({
                                ...value,
                                value:
                                    String(value.value || "").trim(),
                                option_name:
                                    String(option.name || "").trim(),
                                option_value:
                                    String(value.value || "").trim()
                            }))
                            .filter(value =>
                                value.value
                            )
                }))
                .filter(option =>
                    option.name &&
                    option.values.length
                );

        if (!cleanOptions.length) {
            showAlert({
                title: "Opciones incompletas",
                text: "Cargá al menos una opción con valores.",
                icon: "info"
            });

            return;
        }

        const combinations =
            getCombinations(cleanOptions);

        const generated =
            combinations.map(combo => ({
                tempId:
                    makeTempId("variant"),
                sku: "",
                title:
                    buildVariantTitle(combo),
                price: "",
                sale_price: "",
                stock_qty: 0,
                image_url: "",
                is_visible: 1,
                values:
                    combo.map(value => ({
                        tempId:
                            value.tempId,
                        option_value_temp_id:
                            value.tempId,
                        option_name:
                            value.option_name,
                        option_value:
                            value.option_value || value.value
                    }))
            }));

        setVariants(generated);
    }

    function updateVariant(index, field, value) {
        setVariants(prev =>
            prev.map((variant, i) =>
                i === index
                    ? {
                        ...variant,
                        [field]: value
                    }
                    : variant
            )
        );
    }

    function removeVariant(index) {
        setVariants(prev =>
            prev.filter((_, i) => i !== index)
        );
    }

    async function saveVariants() {
        setSaving(true);

        try {
            const cleanOptions =
                options
                    .map(option => ({
                        ...option,
                        name:
                            String(option.name || "").trim(),
                        values:
                            (option.values || [])
                                .map(value => ({
                                    ...value,
                                    value:
                                        String(value.value || "").trim()
                                }))
                                .filter(value =>
                                    value.value
                                )
                    }))
                    .filter(option =>
                        option.name &&
                        option.values.length
                    );

            const cleanVariants =
                variants
                    .map(variant => ({
                        ...variant,
                        values:
                            (variant.values || []).filter(value =>
                                value.option_value_temp_id ||
                                value.tempId ||
                                value.option_value_id
                            )
                    }))
                    .filter(variant =>
                        variant.values.length
                    );

            const res =
                await fetch(
                    "/api/store/admin/variants/save",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            businessId,
                            productId,
                            options:
                                cleanOptions,
                            variants:
                                cleanVariants
                        })
                    }
                );

            const data =
                await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "No se pudieron guardar las variantes"
                );
            }

            showAlert({
                title: "OK",
                text: data.message || "Variantes guardadas",
                icon: "success"
            });

            await loadVariants();

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
                    <h1 className="qr_page_title store_admin_title">
                        <span className="store_admin_title_icon">
                            🎛️
                        </span>

                        <span>
                            Variantes
                        </span>
                    </h1>

                    <p className="qr_page_subtitle">
                        {product?.title || "Producto"} — talles, colores, tamaños y stock.
                    </p>
                </div>

                <div className="qr_page_actions">

                    <button
                        type="button"
                        className="qr_page_btn secondary"
                        onClick={() =>
                            router.push(
                                `/dashboard/businesses/${businessId}/store/products/${productId}`
                            )
                        }
                    >
                        Volver al producto
                    </button>

                    <button
                        type="button"
                        className="qr_page_btn success"
                        onClick={saveVariants}
                        disabled={saving}
                    >
                        {
                            saving
                                ? "Guardando..."
                                : "Guardar variantes"
                        }
                    </button>

                </div>

            </div>

            <div className="qr_page_status">
                Variantes:{" "}
                <strong>
                    {variants.length}
                </strong>
            </div>

            <div className="qr_page_card">

                <h2 className="qr_page_section_title">
                    Opciones del producto
                </h2>

                <p className="qr_page_help">
                    Ejemplo: Color, Talle, Tamaño. Cada opción puede tener varios valores.
                </p>

                <div className="qr_page_actions mt-3">
                    <button
                        type="button"
                        className="qr_page_btn secondary"
                        onClick={addOption}
                    >
                        + Agregar opción
                    </button>
                </div>

                {options.map((option, optionIndex) => (
                    <div
                        key={option.tempId || option.id || optionIndex}
                        className="qr_page_card mt-3"
                        style={{
                            border: "1px solid #e5e7eb"
                        }}
                    >
                        <div className="qr_page_grid">

                            <div className="qr_page_field">
                                <label>Nombre opción</label>

                                <input
                                    className="qr_page_input"
                                    value={option.name || ""}
                                    onChange={(e) =>
                                        updateOption(
                                            optionIndex,
                                            "name",
                                            e.target.value
                                        )
                                    }
                                    placeholder="Ej: Color"
                                />
                            </div>

                            <div className="qr_page_field">
                                <label>Acciones</label>

                                <div className="d-flex gap-2 flex-wrap">
                                    <button
                                        type="button"
                                        className="qr_page_btn secondary"
                                        onClick={() =>
                                            addOptionValue(optionIndex)
                                        }
                                    >
                                        + Valor
                                    </button>

                                    <button
                                        type="button"
                                        className="qr_page_btn"
                                        onClick={() =>
                                            removeOption(optionIndex)
                                        }
                                    >
                                        Eliminar opción
                                    </button>
                                </div>
                            </div>

                        </div>

                        <div className="row mt-3">
                            {(option.values || []).map((value, valueIndex) => (
                                <div
                                    key={value.tempId || value.id || valueIndex}
                                    className="col-12 col-md-4 mb-2"
                                >
                                    <div className="d-flex gap-2">
                                        <input
                                            className="qr_page_input"
                                            value={value.value || ""}
                                            onChange={(e) =>
                                                updateOptionValue(
                                                    optionIndex,
                                                    valueIndex,
                                                    "value",
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Ej: Negro"
                                        />

                                        <button
                                            type="button"
                                            className="qr_page_btn"
                                            onClick={() =>
                                                removeOptionValue(
                                                    optionIndex,
                                                    valueIndex
                                                )
                                            }
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {!options.length && (
                    <div className="qr_page_info_box mt-3">
                        Todavía no cargaste opciones. Si el producto no tiene talle/color, no necesitás variantes.
                    </div>
                )}

            </div>

            <div className="qr_page_card mt-4">

                <h2 className="qr_page_section_title">
                    Generar combinaciones
                </h2>

                <p className="qr_page_help">
                    A partir de las opciones y valores cargados, se generan las combinaciones posibles.
                </p>

                <button
                    type="button"
                    className="qr_page_btn success"
                    onClick={generateVariants}
                >
                    Generar variantes
                </button>

            </div>

            <div className="qr_page_card mt-4">

                <h2 className="qr_page_section_title">
                    Variantes generadas
                </h2>

                <div className="tags_table_wrapper mt-3">

                    <table className="tags_table tags_text_normal">

                        <thead>
                            <tr>
                                <th>Variante</th>
                                <th>SKU</th>
                                <th>Precio</th>
                                <th>Oferta</th>
                                <th>Stock</th>
                                <th>Visible</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>

                        <tbody>
                            {variants.map((variant, index) => (
                                <tr key={variant.tempId || variant.id || index}>

                                    <td>
                                        <input
                                            className="qr_page_input"
                                            value={
                                                variant.title ||
                                                buildVariantTitle(variant.values)
                                            }
                                            onChange={(e) =>
                                                updateVariant(
                                                    index,
                                                    "title",
                                                    e.target.value
                                                )
                                            }
                                        />
                                    </td>

                                    <td>
                                        <input
                                            className="qr_page_input"
                                            value={variant.sku || ""}
                                            onChange={(e) =>
                                                updateVariant(
                                                    index,
                                                    "sku",
                                                    e.target.value
                                                )
                                            }
                                        />
                                    </td>

                                    <td>
                                        <input
                                            type="number"
                                            className="qr_page_input"
                                            value={variant.price || ""}
                                            onChange={(e) =>
                                                updateVariant(
                                                    index,
                                                    "price",
                                                    e.target.value
                                                )
                                            }
                                        />
                                    </td>

                                    <td>
                                        <input
                                            type="number"
                                            className="qr_page_input"
                                            value={variant.sale_price || ""}
                                            onChange={(e) =>
                                                updateVariant(
                                                    index,
                                                    "sale_price",
                                                    e.target.value
                                                )
                                            }
                                        />
                                    </td>

                                    <td>
                                        <input
                                            type="number"
                                            className="qr_page_input"
                                            value={variant.stock_qty || 0}
                                            onChange={(e) =>
                                                updateVariant(
                                                    index,
                                                    "stock_qty",
                                                    e.target.value
                                                )
                                            }
                                        />
                                    </td>

                                    <td>
                                        <label className="qr_page_checkbox">
                                            <input
                                                type="checkbox"
                                                checked={
                                                    Number(variant.is_visible) !== 0
                                                }
                                                onChange={(e) =>
                                                    updateVariant(
                                                        index,
                                                        "is_visible",
                                                        e.target.checked ? 1 : 0
                                                    )
                                                }
                                            />
                                        </label>
                                    </td>

                                    <td>
                                        <button
                                            type="button"
                                            className="qr_page_btn"
                                            onClick={() =>
                                                removeVariant(index)
                                            }
                                        >
                                            Eliminar
                                        </button>
                                    </td>

                                </tr>
                            ))}

                            {!variants.length && (
                                <tr>
                                    <td colSpan={7}>
                                        Todavía no hay variantes generadas.
                                    </td>
                                </tr>
                            )}
                        </tbody>

                    </table>

                </div>

            </div>

            <div className="qr_page_tab_savebar mt-4">
                <button
                    type="button"
                    className="primary tags_btn py-3 px-2"
                    style={{
                        fontWeight: "500"
                    }}
                    onClick={saveVariants}
                    disabled={saving}
                >
                    {
                        saving
                            ? "Guardando..."
                            : "Guardar variantes"
                    }
                </button>
            </div>

        </div>
    );
}