import { redirect } from "next/navigation";
import HeaderSwitcher from "@/app/components/HeaderSwitcher";
import { db } from "@/app/lib/tags-db";
import { getRestoAccess } from "@/app/modules/resto/lib/staff/getRestoAccess";
import ClientReviewsAdminClient from "@/app/dashboard/businesses/[id]/qrs/[qrCodeId]/client-reviews/pageClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Page({ params }) {
    const { id: businessId } = await params;
    const access = await getRestoAccess({ businessId, permission: "reviews.view" });
if (!access.allowed) return redirect(access.status === 401 ? "/resto/login" : `/dashboard/businesses/${businessId}/resto`);
    const [rows] = await db.query(`
        SELECT p.qr_code_id
        FROM tags_qr_pages p
        INNER JOIN tags_business_addons ba ON ba.business_id=p.business_id AND ba.addon_code='client_reviews' AND ba.status='active'
        WHERE p.business_id=? AND p.page_type='client_reviews' AND p.status='published'
        ORDER BY p.id DESC LIMIT 1`, [businessId]);
    if (!rows?.[0]?.qr_code_id) return redirect(`/dashboard/businesses/${businessId}/resto/settings`);
return <><HeaderSwitcher context="resto" /><ClientReviewsAdminClient businessId={businessId} qrCodeId={rows[0].qr_code_id} session={access.session} isAdmin={access.isOwner} /></>;
}
