// =====================================
// API: /api/store/admin/variants/save
// Descripción: Guarda opciones, valores y variantes de un producto.
// Uso: Dashboard Tags Tienda.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

function safe(value) {
    return value === undefined || value === ""
        ? null
        : value;
}

export async function POST(req) {
    const conn =
        await db.getConnection();

    try {
        const body =
            await req.json();

        const {
            businessId,
            productId,
            options,
            variants
        } = body;

        if (!businessId || !productId) {
            return Response.json(
                {
                    error: "businessId y productId son requeridos"
                },
                {
                    status: 400
                }
            );
        }

        const [storeRows] =
            await conn.query(
                `
                SELECT id
                FROM tags_stores
                WHERE business_id = ?
                LIMIT 1
                `,
                [
                    businessId
                ]
            );

        const store =
            storeRows[0];

        if (!store) {
            return Response.json(
                {
                    error: "Tienda no encontrada"
                },
                {
                    status: 404
                }
            );
        }

        const [productRows] =
            await conn.query(
                `
                SELECT id
                FROM tags_store_products
                WHERE id = ?
                AND store_id = ?
                LIMIT 1
                `,
                [
                    productId,
                    store.id
                ]
            );

        if (!productRows.length) {
            return Response.json(
                {
                    error: "Producto no encontrado"
                },
                {
                    status: 404
                }
            );
        }

        await conn.beginTransaction();

        // =====================================
        // BORRAR ESTRUCTURA ANTERIOR
        // =====================================

        const [oldVariants] =
            await conn.query(
                `
                SELECT id
                FROM tags_store_variants
                WHERE product_id = ?
                `,
                [
                    productId
                ]
            );

        const oldVariantIds =
            oldVariants.map(v => v.id);

        if (oldVariantIds.length) {
            await conn.query(
                `
                DELETE FROM tags_store_variant_values
                WHERE variant_id IN (${oldVariantIds.map(() => "?").join(",")})
                `,
                oldVariantIds
            );
        }

        await conn.query(
            `
            DELETE FROM tags_store_variants
            WHERE product_id = ?
            `,
            [
                productId
            ]
        );

        const [oldOptions] =
            await conn.query(
                `
                SELECT id
                FROM tags_store_options
                WHERE product_id = ?
                `,
                [
                    productId
                ]
            );

        const oldOptionIds =
            oldOptions.map(o => o.id);

        if (oldOptionIds.length) {
            await conn.query(
                `
                DELETE FROM tags_store_option_values
                WHERE option_id IN (${oldOptionIds.map(() => "?").join(",")})
                `,
                oldOptionIds
            );
        }

        await conn.query(
            `
            DELETE FROM tags_store_options
            WHERE product_id = ?
            `,
            [
                productId
            ]
        );

        // =====================================
        // INSERTAR OPCIONES Y VALORES
        // =====================================

        const optionMap =
            new Map();

        const valueMap =
            new Map();

        const cleanOptions =
            Array.isArray(options)
                ? options.filter(option =>
                    String(option.name || "").trim()
                )
                : [];

        for (let optionIndex = 0; optionIndex < cleanOptions.length; optionIndex++) {
            const option =
                cleanOptions[optionIndex];

            const [optionResult] =
                await conn.query(
                    `
                    INSERT INTO tags_store_options (
                        product_id,
                        name,
                        sort_order,
                        created_at
                    )
                    VALUES (?, ?, ?, NOW())
                    `,
                    [
                        productId,
                        option.name,
                        optionIndex
                    ]
                );

            const newOptionId =
                optionResult.insertId;

            optionMap.set(
                option.tempId || option.id || option.name,
                newOptionId
            );

            const values =
                Array.isArray(option.values)
                    ? option.values.filter(value =>
                        String(value.value || "").trim()
                    )
                    : [];

            for (let valueIndex = 0; valueIndex < values.length; valueIndex++) {
                const value =
                    values[valueIndex];

                const [valueResult] =
                    await conn.query(
                        `
                        INSERT INTO tags_store_option_values (
                            option_id,
                            value,
                            sort_order,
                            created_at
                        )
                        VALUES (?, ?, ?, NOW())
                        `,
                        [
                            newOptionId,
                            value.value,
                            valueIndex
                        ]
                    );

                valueMap.set(
                    value.tempId || value.id || `${option.name}:${value.value}`,
                    {
                        optionId: newOptionId,
                        valueId: valueResult.insertId
                    }
                );
            }
        }

        // =====================================
        // INSERTAR VARIANTES
        // =====================================

        const cleanVariants =
            Array.isArray(variants)
                ? variants.filter(variant =>
                    Array.isArray(variant.values) &&
                    variant.values.length
                )
                : [];

        for (const variant of cleanVariants) {
            const [variantResult] =
                await conn.query(
                    `
                    INSERT INTO tags_store_variants (
                        product_id,
                        sku,
                        title,
                        price,
                        sale_price,
                        stock_qty,
                        image_url,
                        is_visible,
                        created_at,
                        updated_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                    `,
                    [
                        productId,
                        safe(variant.sku),
                        safe(variant.title),
                        variant.price === "" ||
                        variant.price === undefined ||
                        variant.price === null
                            ? null
                            : Number(variant.price),
                        variant.sale_price === "" ||
                        variant.sale_price === undefined ||
                        variant.sale_price === null
                            ? null
                            : Number(variant.sale_price),
                        Number(variant.stock_qty || 0),
                        safe(variant.image_url),
                        Number(variant.is_visible) === 0 ? 0 : 1
                    ]
                );

            const newVariantId =
                variantResult.insertId;

            for (const selectedValue of variant.values) {
                const valueKey =
                    selectedValue.tempId ||
                    selectedValue.option_value_temp_id ||
                    selectedValue.option_value_id ||
                    selectedValue.id ||
                    `${selectedValue.option_name}:${selectedValue.option_value}`;

                const relation =
                    valueMap.get(valueKey);

                if (!relation) {
                    continue;
                }

                await conn.query(
                    `
                    INSERT INTO tags_store_variant_values (
                        variant_id,
                        option_id,
                        option_value_id
                    )
                    VALUES (?, ?, ?)
                    `,
                    [
                        newVariantId,
                        relation.optionId,
                        relation.valueId
                    ]
                );
            }
        }

        await conn.commit();

        return Response.json({
            ok: true,
            message: "Variantes guardadas correctamente"
        });

    } catch (err) {
        await conn.rollback();

        console.error(
            "STORE VARIANTS SAVE ERROR:",
            err
        );

        return Response.json(
            {
                error: "Error guardando variantes"
            },
            {
                status: 500
            }
        );

    } finally {
        conn.release();
    }
}