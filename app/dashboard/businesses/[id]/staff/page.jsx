import BusinessStaffAdminPage from "@/app/modules/business-staff/components/BusinessStaffAdminPage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function BusinessStaffPage({ params }) {
  const { id } = await params;
  return <BusinessStaffAdminPage businessId={id} />;
}
