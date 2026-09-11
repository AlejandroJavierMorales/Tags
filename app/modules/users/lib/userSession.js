// =====================================
// MODULE: Usuarios Tags
// Descripcion: Lectura de la sesion personal sin interferir con negocios.
// =====================================

import { cookies } from "next/headers";

export async function getSessionUser() {
    try {
        const cookieStore = await cookies();
        const cookie = cookieStore.get("tags_session");
        if (!cookie) return null;

        const session = JSON.parse(cookie.value);
        if (session?.role !== "user" || !session?.userId) return null;
        return session;
    } catch {
        return null;
    }
}
