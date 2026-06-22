// =====================================
// API: /api/store/public/coupons/validate
// Descripción: Valida y calcula descuento de un cupón público de Tags Tienda.
// Uso: Carrito público.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

function normalizeCode(value) {
    return String(value || "")
        .trim()
        .toUpperCase();
}

function calculateDiscount(coupon, subtotal) {
    const value =
        Number(coupon.discount_value || 0);

    if (coupon.discount_type === "percent") {
        return Math.round(
            subtotal * (value / 100)
        );
    }

    return Math.min(
        value,
        subtotal
    );
}

export async function POST(req) {
    try {
        const body =
            await req.json();

        const {
            storeId,
            code,
            subtotal
        } = body;

        if (!storeId) {
            return Response.json(
                { error: "storeId es requerido" },
                { status: 400 }
            );
        }

        const cleanCode =
            normalizeCode(code);

        if (!cleanCode) {
            return Response.json(
                { error: "Ingresá un código de cupón" },
                { status: 400 }
            );
        }

        const cartSubtotal =
            Number(subtotal || 0);

        if (cartSubtotal <= 0) {
            return Response.json(
                { error: "El carrito está vacío" },
                { status: 400 }
            );
        }

        const [rows] =
            await db.query(
                `
                SELECT *
                FROM tags_store_coupons
                WHERE store_id = ?
                AND UPPER(code) = ?
                AND is_active = 1
                LIMIT 1
                `,
                [
                    storeId,
                    cleanCode
                ]
            );

        const coupon =
            rows[0];

        if (!coupon) {
            return Response.json(
                { error: "Cupón inválido o inactivo" },
                { status: 404 }
            );
        }

        const now =
            new Date();

        if (
            coupon.starts_at &&
            new Date(coupon.starts_at) > now
        ) {
            return Response.json(
                { error: "Este cupón todavía no está disponible" },
                { status: 400 }
            );
        }

        if (
            coupon.ends_at &&
            new Date(coupon.ends_at) < now
        ) {
            return Response.json(
                { error: "Este cupón está vencido" },
                { status: 400 }
            );
        }

        if (
            coupon.max_uses !== null &&
            coupon.max_uses !== undefined &&
            Number(coupon.used_count || 0) >= Number(coupon.max_uses)
        ) {
            return Response.json(
                { error: "Este cupón ya alcanzó su límite de usos" },
                { status: 400 }
            );
        }

        if (
            coupon.min_order_total &&
            cartSubtotal < Number(coupon.min_order_total)
        ) {
            return Response.json(
                {
                    error:
                        `Este cupón requiere una compra mínima de ${Number(coupon.min_order_total).toLocaleString("es-AR")}`
                },
                { status: 400 }
            );
        }

        const discount =
            calculateDiscount(
                coupon,
                cartSubtotal
            );

        const total =
            Math.max(
                0,
                cartSubtotal - discount
            );

        return Response.json({
            ok: true,
            coupon: {
                id: coupon.id,
                code: coupon.code,
                discount_type: coupon.discount_type,
                discount_value: coupon.discount_value
            },
            subtotal: cartSubtotal,
            discount,
            total
        });

    } catch (err) {
        console.error(
            "STORE COUPON VALIDATE ERROR:",
            err
        );

        return Response.json(
            { error: "Error validando cupón" },
            { status: 500 }
        );
    }
}