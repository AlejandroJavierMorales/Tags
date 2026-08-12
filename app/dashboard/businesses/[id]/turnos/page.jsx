import TurnosAdminPageClient from "./pageClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function TurnosPage({ params }) {
    const { id } = await params;
    return <TurnosAdminPageClient businessId={id} />;
}

