// =====================================
// PAGE: /fidelizacion
// Descripcion: Portal inicial de la cuenta personal de Tags.
// =====================================

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSessionUser } from "@/app/modules/users/lib/userSession";
import { getChannelContextFromHost, getHeadersHost } from "@/app/lib/channelContext";
import LoyaltyUserPageClient from "./pageClient";
import DirectoryPublicHeader from "@/app/modules/directory/components/public/DirectoryPublicHeader";
import DirectoryPublicFooter from "@/app/modules/directory/components/public/DirectoryPublicFooter";
import LoyaltyBusinessPublicPage from "@/app/modules/loyalty/components/LoyaltyBusinessPublicPage";
import { db } from "@/app/lib/tags-db";

export const dynamic = "force-dynamic";

export default async function LoyaltyUserPage({ searchParams }) {
    const requestHeaders = await headers();
    const host = getHeadersHost(requestHeaders);
    const channel = await getChannelContextFromHost(host);
    // En un dominio propio resolvemos el programa del comercio. El portal
    // general de Tags continúa funcionando exactamente igual.
    if (host && host !== "tags.com.ar" && host !== "localhost" && !host.startsWith("127.")) {
        const [rows] = await db.query(`
            SELECT d.domain,d.business_id,b.display_name,b.logo_url,p.id AS program_id
              FROM tags_domains d
              INNER JOIN tags_businesses b ON b.id=d.business_id
              INNER JOIN tags_loyalty_programs p ON p.business_id=b.id AND p.status='active'
              INNER JOIN tags_business_addons ba ON ba.business_id=b.id AND ba.addon_code='loyalty' AND ba.status='active'
                    AND (ba.expires_at IS NULL OR ba.expires_at>=NOW())
             WHERE d.is_active=1
             ORDER BY p.id DESC`);
        const normalize = value => String(value || "").toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].split(":")[0];
        const match = rows.find(row => normalize(row.domain || "") === normalize(host));
        if (match) return <LoyaltyBusinessPublicPage programId={match.program_id} business={match} channel={channel} />;
    }
    const query = searchParams?.seccion ? `?seccion=${encodeURIComponent(String(searchParams.seccion))}` : "";
    redirect(`/mi-cuenta/fidelizacion${query}`);
}
