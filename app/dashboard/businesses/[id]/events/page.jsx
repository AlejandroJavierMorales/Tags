import { redirect } from "next/navigation";

import EventsPageClient from "@/app/dashboard/events/pageClient";
import { requireEventLogin } from "@/app/modules/e-events/lib/requireEventLogin";
import { businessHasSimpleEventsAddon } from "@/app/modules/e-events/lib/eventAddonAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function BusinessEventsPage({ params }) {
    const { id } = await params;
    const businessId = Number(id);
    const session = await requireEventLogin();

    if (!Number.isInteger(businessId) || businessId <= 0) {
        redirect("/dashboard");
    }

    if (session.role !== "admin" && Number(session.businessId) !== businessId) {
        redirect("/dashboard");
    }

    if (!(await businessHasSimpleEventsAddon(businessId))) {
        redirect(`/dashboard/businesses/${businessId}`);
    }

    return (
        <EventsPageClient
            session={{ ...session, businessId, managedBusinessId: businessId }}
            isStaff={false}
            productMode="simple"
        />
    );
}
