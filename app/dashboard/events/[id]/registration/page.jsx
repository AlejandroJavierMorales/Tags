import { requireEventLogin } from "@/app/modules/e-events/lib/requireEventLogin";
import { requireEventOwnership } from "@/app/modules/e-events/lib/requireEventOwnership";
import { getVisibleEventModules } from "@/app/modules/e-events/lib/getVisibleEventModules";
import EventRegistrationAdmin from "@/app/modules/e-events/components/EventRegistrationAdmin";

export const dynamic = "force-dynamic";

export default async function EventRegistrationPage({ params }) {
    const { id } = await params;
    const session = await requireEventLogin();
    await requireEventOwnership(session, id);
    const modules = await getVisibleEventModules({ session, eventId: id });

    return <EventRegistrationAdmin session={session} eventId={id} modules={modules} />;
}
