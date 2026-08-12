import TurnosBookingDetail from "@/app/modules/turnos/components/public/TurnosBookingDetail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function TurnosBookingPage({ params }) {
    const { slug, token } = await params;
    return <TurnosBookingDetail slug={slug} token={token} />;
}
