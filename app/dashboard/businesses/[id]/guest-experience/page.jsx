import GuestExperienceAdminPage from "@/app/modules/guest-experience/components/admin/GuestExperienceAdminPage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function GuestExperienceDashboardPage({ params }) {
    const { id } = await params;
    return <GuestExperienceAdminPage businessId={id} />;
}
