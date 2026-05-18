import { db } from "@/app/lib/tags-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";



function clean(v) {
    return v === undefined ? null : v;
}

export async function POST(req) {
    try {
        const {
            code,
            action,
            email = null,
            business_id = null,
            label = null,
            value,
            name,
            phone,
            stop_message
        } = await req.json();

        if (!code || !action) {
            return Response.json(
                { error: "Faltan datos" },
                { status: 400 }
            );
        }

        // =====================================
        // 🔥 GET QR + PRODUCT
        // =====================================
        const [rows] = await db.execute(
            `
            SELECT qr.*, p.id as product_code, p.is_digital
            FROM tags_qr_codes qr
            JOIN tags_products p ON p.id = qr.product_id
            WHERE qr.code = ?
            `,
            [code]
        );

        const qr = rows[0];

        if (!qr) {
            return Response.json(
                { error: "QR no encontrado" },
                { status: 404 }
            );
        }

        // =====================================
        // 🧠 BASE UPDATE OBJECT
        // =====================================
        let updateFields = {
            status: qr.status,
            email: qr.email,
            business_id: qr.business_id,
            label: qr.label,
            value: qr.value,
            final_url: qr.final_url,
            stop_message: qr.stop_message
        };

        // =====================================
        // 🔄 SWITCH
        // =====================================
        switch (action) {

            // =====================================
            // ⛔ STOPPED
            // =====================================
            case "stopped":
                updateFields.status = "stopped";
                updateFields.stop_message =
                    stop_message ||
                    "Este código QR está temporalmente fuera de servicio.";
                break;

            // =====================================
            // 📌 ASSIGN
            // =====================================
            case "assign":

                updateFields.status = "assigned";
                updateFields.email = email || null;
                updateFields.business_id = business_id || qr.business_id;

                // 🔥 STOCK / PRODUCCIÓN
                if (!qr.is_digital) {

                    const [stockRows] = await db.execute(
                        "SELECT quantity FROM tags_stock WHERE product_id = ?",
                        [qr.product_id]
                    );

                    const stock = stockRows[0];

                    if (!stock || stock.quantity <= 0) {

                        // 🚨 PRODUCCIÓN
                        await db.execute(`
                            INSERT INTO tags_production_orders 
                            (product_id, quantity, status)
                            VALUES (?, 1, 'pending')
                        `, [qr.product_id]);

                    } else {

                        // 📦 STOCK
                        await db.execute(`
                            UPDATE tags_stock
                            SET quantity = quantity - 1
                            WHERE product_id = ?
                        `, [qr.product_id]);

                    }
                }

                break;

            // =====================================
            // 🟡 PENDING
            // =====================================
            case "deactivate":
                updateFields.status = "pending";
                break;

            // =====================================
            // 🔴 DISABLED
            // =====================================
            case "disable":
                updateFields.status = "disabled";
                break;

            // =====================================
            // ⚪ RESET
            // =====================================
            case "available":

                updateFields.status = "available";
                updateFields.email = null;
                updateFields.business_id = null;
                updateFields.label = null;
                updateFields.value = null;
                updateFields.final_url = null;
                updateFields.stop_message = null;

                break;

            // =====================================
            // 🟢RE-ACTIVE (solo cambia el estado despues de estar Stopped)
            // =====================================
            case "reactive": {
                updateFields.status = "active";
                break
            }

            // =====================================
            // 🟢 ACTIVE
            // =====================================
            case "active": {

                if (!email) {
                    return Response.json(
                        { error: "Email requerido" },
                        { status: 400 }
                    );
                }

                // -----------------------------
                // 🔗 BUILD URL DESDE PRODUCT
                // -----------------------------
                let normalizedValue = value || qr.value || null;
                let finalUrl = qr.final_url;

                if (normalizedValue) {

                    const type = qr.product_code;

                    if (type === "whatsapp") {
                        let phoneClean = normalizedValue.replace(/\D/g, "");
                        if (!phoneClean.startsWith("54")) phoneClean = "54" + phoneClean;
                        if (!phoneClean.startsWith("549")) phoneClean = "549" + phoneClean.slice(2);
                        finalUrl = `https://wa.me/${phoneClean}`;
                    }

                    else if (type === "instagram") {
                        finalUrl = `https://instagram.com/${normalizedValue}`;
                    }

                    else if (type === "facebook") {
                        finalUrl = `https://facebook.com/${normalizedValue}`;
                    }

                    else if (
                        type === "website" ||
                        type === "google" ||
                        type === "url"
                    ) {
                        finalUrl = normalizedValue.startsWith("http")
                            ? normalizedValue
                            : `https://${normalizedValue}`;
                    }

                    else if (type === "digital") {
                        finalUrl = normalizedValue;
                    }

                    else {
                        finalUrl = normalizedValue;
                    }
                }

                // -----------------------------
                // 👤 BUSINESS
                // -----------------------------
                let finalBusinessId = qr.business_id;

                if (!qr.business_id) {

                    if (business_id) {
                        finalBusinessId = business_id;
                    } else {

                        const [existing] = await db.execute(
                            `SELECT id FROM tags_businesses WHERE email = ?`,
                            [email]
                        );

                        if (existing.length > 0) {
                            finalBusinessId = existing[0].id;
                        } else {

                            const [insert] = await db.execute(
                                `
                                INSERT INTO tags_businesses (name, email, phone)
                                VALUES (?, ?, ?)
                                `,
                                [
                                    name || null,
                                    email,
                                    phone || null
                                ]
                            );

                            finalBusinessId = insert.insertId;
                        }
                    }

                } else {

                    if (business_id && business_id !== qr.business_id) {
                        return Response.json(
                            { error: "No se puede cambiar el cliente" },
                            { status: 400 }
                        );
                    }

                    if (email && email !== qr.email) {
                        return Response.json(
                            { error: "No se puede cambiar email" },
                            { status: 400 }
                        );
                    }
                }

                // -----------------------------
                // FINAL UPDATE
                // -----------------------------
                updateFields.status = "active";
                updateFields.email = email;
                updateFields.business_id = finalBusinessId;
                updateFields.label = label || qr.label;
                updateFields.value = normalizedValue;
                updateFields.final_url = finalUrl;

                break;
            }

            default:
                return Response.json(
                    { error: "Acción inválida" },
                    { status: 400 }
                );
        }

        // =====================================
        // 💾 UPDATE FINAL
        // =====================================
        await db.execute(
            `
            UPDATE tags_qr_codes
            SET
                status = ?,
                email = ?,
                business_id = ?,
                label = ?,
                value = ?,
                final_url = ?,
                stop_message = ?
            WHERE code = ?
            `,
            [
                clean(updateFields.status),
                clean(updateFields.email),
                clean(updateFields.business_id),
                clean(updateFields.label),
                clean(updateFields.value),
                clean(updateFields.final_url),
                clean(updateFields.stop_message),
                code
            ]
        );

        return Response.json({
            ok: true,
            code,
            status: updateFields.status
        });

    } catch (err) {
        console.error("QR STATUS ERROR:", err);

        return Response.json(
            { error: "Error interno" },
            { status: 500 }
        );
    }
}