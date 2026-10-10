import EventRegistrationStatus from "@/app/modules/e-events/components/public/EventRegistrationStatus";

export const dynamic = "force-dynamic";
export const metadata = { title: "Estado de tu inscripción" };

export default async function EventRegistrationStatusPage({ params }) {
    const { token } = await params;
    return <EventRegistrationStatus token={token} />;
}
