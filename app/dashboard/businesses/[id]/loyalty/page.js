// =====================================
// PAGE: /dashboard/businesses/[id]/loyalty
// Descripcion: Administracion de Tags Fidelizacion por negocio.
// =====================================

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LoyaltyAdminPageClient from "./pageClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function LoyaltyAdminPage({ params }) {
    const { id } = await params;
    const cookie = (await cookies()).get("tags_session");
    if (!cookie) redirect("/login");

    let session = null;
    try { session = JSON.parse(cookie.value); } catch { redirect("/login"); }

    if (session?.role !== "admin" && String(session?.businessId) !== String(id)) {
        redirect("/login");
    }

    return <LoyaltyAdminPageClient businessId={id} isAdmin={session?.role === "admin"} />;
}
