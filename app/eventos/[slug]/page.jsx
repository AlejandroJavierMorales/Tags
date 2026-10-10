import { db } from "@/app/lib/tags-db";
import { permanentRedirect } from "next/navigation";
import EventPublicRegistration from "@/app/modules/e-events/components/public/EventPublicRegistration";
import { getEventDirectoryRoute } from "@/app/modules/e-events/lib/eventPublicRoute";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
    const { slug } = await params;
    try {
        const [[event]] = await db.query(
            `SELECT COALESCE(s.public_title,e.name) AS title,
                    COALESCE(s.public_description,e.description) AS description
               FROM tags_event_registration_settings s
               INNER JOIN tags_events e ON e.id=s.event_id
              WHERE s.public_slug=? LIMIT 1`,
            [slug]
        );
        return {
            title: event?.title || "Inscripción al evento",
            description: String(event?.description || "Inscripción al evento").slice(0, 160)
        };
    } catch {
        return { title: "Inscripción al evento" };
    }
}

export default async function EventPublicRegistrationPage({ params }) {
    const { slug } = await params;
    const route = await getEventDirectoryRoute({ publicSlug: slug }).catch(() => null);
    if (route?.path) {
        permanentRedirect(route.primary_host ? `https://${route.primary_host}${route.path}` : route.path);
    }
    return <EventPublicRegistration slug={slug} />;
}
