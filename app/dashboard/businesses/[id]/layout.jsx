import BusinessToolsNav from "@/app/components/businesses/BusinessToolsNav";

export default async function BusinessDashboardLayout({ children, params }) {
    const { id } = await params;
    return <>{children}<BusinessToolsNav businessId={id} /></>;
}
