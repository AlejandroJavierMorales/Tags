import { redirect } from "next/navigation";
import { getGoogleBusinessAdminAccess } from "@/app/modules/google-business-profile/lib/googleBusinessAccess";
import GoogleBusinessProfileAdmin from "@/app/modules/google-business-profile/components/admin/GoogleBusinessProfileAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function GoogleBusinessProfilePage({ params }) {
    const { id } = await params;
    const access = await getGoogleBusinessAdminAccess(id);
    if (!access.allowed) redirect("/login");
    return <GoogleBusinessProfileAdmin businessId={id} />;
}
