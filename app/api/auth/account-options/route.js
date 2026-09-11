export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

export async function POST(request) {
    try {
        const body = await request.json().catch(() => null);
        const email = String(body?.email || "").trim().toLowerCase();
        if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
            return Response.json({ error: "Ingresá un email válido" }, { status: 400 });
        }

        const [businessResult, userResult] = await Promise.all([
            db.query(`SELECT id FROM tags_businesses WHERE LOWER(TRIM(email))=? LIMIT 1`, [email]),
            db.query(`SELECT id,status FROM tags_users WHERE email_normalized=? LIMIT 1`, [email])
        ]);
        const businessRows = businessResult[0];
        const userRows = userResult[0];

        const options = [];
        if (businessRows[0]) options.push({ type: "business", label: "Panel de mi negocio" });
        if (userRows[0]?.status === "active") options.push({ type: "user", label: "Mi cuenta personal" });

        if (!options.length) {
            return Response.json({ error: "No encontramos una cuenta con ese email" }, { status: 404 });
        }

        return Response.json({ success: true, options });
    } catch (error) {
        console.error("AUTH ACCOUNT OPTIONS ERROR", error);
        return Response.json({ error: "No se pudo verificar la cuenta" }, { status: 500 });
    }
}
