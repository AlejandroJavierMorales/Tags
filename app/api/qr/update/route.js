import { db } from "@/app/lib/tags-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";



function safe(v) {
    return v === undefined || v === "" ? null : v;
}

export async function POST(req) {
    try {
        const body = await req.json();

        const {
            code,
            label,
            value,
            business_id,
            email,
            phone,
            name,
            stop_message,
            browser_geolocation_enabled
        } = body;

        console.log('Body de QR **** ' + JSON.stringify(body, 2, null))

        if (!code) {
            return Response.json(
                { error: "Falta code" },
                { status: 400 }
            );
        }

        // =========================
        // 🔍 1. TRAER QR + PRODUCTO
        // =========================
        const [rows] = await db.execute(
            `
            SELECT 
        qr.*,

        t.code as qr_type_code,
        t.url_prefix,
        t.input_type

        FROM tags_qr_codes qr

        JOIN tags_products p 
            ON p.id = qr.product_id

        JOIN tags_qr_types t
         ON t.id = p.qr_type_id

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

        // =========================
        // 👤 2. BUSINESS
        // =========================
        let finalBusinessId = business_id ?? qr.business_id;

        if (!finalBusinessId && email) {
            const [existing] = await db.execute(
                "SELECT id FROM tags_businesses WHERE email = ?",
                [email]
            );

            if (existing.length > 0) {
                finalBusinessId = existing[0].id;
            } else {
                const [result] = await db.execute(
                    "INSERT INTO tags_businesses (name, email) VALUES (?, ?)",
                    [name || email, email]
                );

                finalBusinessId = result.insertId;
            }
        }

        // =========================
        // 🔗 3. BUILD FINAL URL
        // =========================
        let finalUrl = qr.final_url;

        const cleanValue = value ?? qr.value;

        if (cleanValue) {

            const productCode = qr.qr_type_code;

            // 🔥 WHATSAPP
            if (productCode === "whatsapp") {
                let phoneClean = cleanValue.replace(/\D/g, "");

                if (!phoneClean.startsWith("54")) phoneClean = "54" + phoneClean;
                if (!phoneClean.startsWith("549")) phoneClean = "549" + phoneClean.slice(2);

                finalUrl = `https://wa.me/${phoneClean}`;
            }

            // 🔥 INSTAGRAM
            else if (productCode === "instagram") {
                finalUrl = `https://instagram.com/${cleanValue}`;
            }

            // 🔥 FACEBOOK
            else if (productCode === "facebook") {
                finalUrl = `https://facebook.com/${cleanValue}`;
            }

            // 🔥 GOOGLE / WEBSITE
            else if (
                productCode === "website" ||
                productCode === "google" ||
                productCode === "url"
            ) {
                finalUrl = cleanValue.startsWith("http")
                    ? cleanValue
                    : `https://${cleanValue}`;
            }

            // 🔥 DIGITAL (raw)
            else if (productCode === "digital") {
                finalUrl = cleanValue;
            }

            else {
                finalUrl = cleanValue;
            }
        }

        const safeLabel = safe(label ?? qr.label);
        const safeValue = safe(cleanValue);
        const safeBusinessId = finalBusinessId ?? qr.business_id;

        // =========================
        // 💾 4. UPDATE FINAL
        // =========================
        await db.execute(
            `
            UPDATE tags_qr_codes
            SET
                label = ?,
                value = ?,
                business_id = ?,
                final_url = ?,                
                stop_message = ?,
                browser_geolocation_enabled = ?,
                status = 'active'
            WHERE code = ?
            `,
            [
                safeLabel,
                safeValue,
                safe(safeBusinessId),
                safe(finalUrl),
                safe(stop_message ?? qr.stop_message),
                browser_geolocation_enabled ? 1 : 0,
                code
            ]
        );

        return Response.json({
            ok: true,
            finalUrl
        });

    } catch (err) {
        console.error("UPDATE QR ERROR:", err);

        return Response.json(
            { error: "Error interno" },
            { status: 500 }
        );
    }
}
