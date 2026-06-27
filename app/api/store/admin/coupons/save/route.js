// =====================================
// API: /api/store/admin/coupons/save
// Descripción: Crea o edita un cupón.
// Contexto: store
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

const validTypes = [
    "percent",
    "fixed",
    "free_shipping"
];

function cleanCode(value) {
    return String(value || "")
        .trim()
        .toUpperCase();
}

function safeNumber(value, fallback = 0) {
    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;
}

function safeDate(value) {
    return value || null;
}

export async function POST(req) {
    try {
        const body = await req.json();

        const {
            businessId,
            couponId,
            code,
            discount_type,
            discount_value,
            starts_at,
            ends_at,
            max_uses,
            min_order_total,
            is_active
        } = body;

        if (!businessId) {
            return Response.json(
                { error: "businessId requerido" },
                { status: 400 }
            );
        }

        const finalCode = cleanCode(code);

        if (!finalCode) {
            return Response.json(
                { error: "Código requerido" },
                { status: 400 }
            );
        }

        if (!validTypes.includes(discount_type)) {
            return Response.json(
                { error: "Tipo de cupón inválido" },
                { status: 400 }
            );
        }

        const finalValue =
            discount_type === "free_shipping"
                ? 0
                : safeNumber(discount_value);

        if (
            discount_type !== "free_shipping" &&
            finalValue <= 0
        ) {
            return Response.json(
                { error: "Valor de descuento inválido" },
                { status: 400 }
            );
        }

        const [storeRows] = await db.execute(
            `
            SELECT id
            FROM tags_stores
            WHERE business_id = ?
            LIMIT 1
            `,
            [businessId]
        );

        const store = storeRows?.[0];

        if (!store) {
            return Response.json(
                { error: "Tienda no encontrada" },
                { status: 404 }
            );
        }

        const [duplicatedRows] = await db.execute(
            `
            SELECT id
            FROM tags_store_coupons
            WHERE store_id = ?
            AND code = ?
            AND id <> ?
            LIMIT 1
            `,
            [
                store.id,
                finalCode,
                couponId || 0
            ]
        );

        if (duplicatedRows?.length) {
            return Response.json(
                { error: "Ya existe un cupón con ese código" },
                { status: 409 }
            );
        }

        if (couponId) {
            await db.execute(
                `
                UPDATE tags_store_coupons
                SET
                    code = ?,
                    discount_type = ?,
                    discount_value = ?,
                    starts_at = ?,
                    ends_at = ?,
                    max_uses = ?,
                    min_order_total = ?,
                    is_active = ?,
                    updated_at = NOW()
                WHERE id = ?
                AND store_id = ?
                `,
                [
                    finalCode,
                    discount_type,
                    finalValue,
                    safeDate(starts_at),
                    safeDate(ends_at),
                    max_uses ? safeNumber(max_uses) : null,
                    safeNumber(min_order_total),
                    Number(is_active) === 0 ? 0 : 1,
                    couponId,
                    store.id
                ]
            );

            return Response.json({
                success: true,
                message: "Cupón actualizado"
            });
        }

        await db.execute(
            `
            INSERT INTO tags_store_coupons
            (
                store_id,
                code,
                discount_type,
                discount_value,
                starts_at,
                ends_at,
                max_uses,
                used_count,
                min_order_total,
                is_active,
                created_at,
                updated_at
            )
            VALUES
            (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, NOW(), NOW())
            `,
            [
                store.id,
                finalCode,
                discount_type,
                finalValue,
                safeDate(starts_at),
                safeDate(ends_at),
                max_uses ? safeNumber(max_uses) : null,
                safeNumber(min_order_total),
                Number(is_active) === 0 ? 0 : 1
            ]
        );

        return Response.json({
            success: true,
            message: "Cupón creado"
        });

    } catch (error) {
        console.error("STORE COUPONS SAVE:", error);

        return Response.json(
            { error: "Error guardando cupón" },
            { status: 500 }
        );
    }
}