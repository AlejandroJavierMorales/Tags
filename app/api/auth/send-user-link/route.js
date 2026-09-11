export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getChannelContextFromHost, getRequestHost } from "@/app/lib/channelContext";
import { sendUserMagicLink } from "@/app/modules/users/lib/sendUserMagicLink";

export async function POST(request) {
    try {
        const body = await request.json().catch(() => null);
        const email = String(body?.email || "").trim().toLowerCase();
        if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
            return Response.json({ error: "Ingresá un email válido" }, { status: 400 });
        }

        const [rows] = await db.query(
            `SELECT id,email,first_name,last_name,status FROM tags_users WHERE email_normalized=? LIMIT 1`,
            [email]
        );
        const user = rows[0];
        if (!user || user.status !== "active") {
            return Response.json({ error: "No encontramos una cuenta de usuario activa con ese email" }, { status: 404 });
        }

        const channel = await getChannelContextFromHost(getRequestHost(request));
        await sendUserMagicLink({ request, user, channel, returnTo: body?.returnTo });
        return Response.json({ ok: true, accountType: "user" });
    } catch (error) {
        console.error("AUTH SEND USER LINK ERROR", { code: error?.code, message: error?.message });
        return Response.json({ error: "No se pudo enviar el enlace de acceso" }, { status: 500 });
    }
}
