import { cache } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getHeadersHost } from "@/app/lib/channelContext";
import { getDirectoryListingBySlug, getDirectorySiteCodeByHost } from "@/app/modules/directory/lib/getDirectoryPublicData";
import { getDirectoryWebPageData } from "@/app/modules/directory/lib/getDirectoryWebPageData";
import { getDirectoryEmbeddedEvents } from "@/app/modules/directory/lib/getDirectoryEmbeddedEvents";
import DirectoryEventsShell from "@/app/modules/directory/components/public/DirectoryEventsShell";
import EventPublicRegistration from "@/app/modules/e-events/components/public/EventPublicRegistration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const listingBySlug = cache((slug, siteCode) => getDirectoryListingBySlug(slug, siteCode));
async function context(directorySlug, eventSlug) {
    const requestHeaders = await headers();
    const siteCode = await getDirectorySiteCodeByHost(getHeadersHost(requestHeaders));
    const data = await listingBySlug(directorySlug, siteCode);
    if (!data) return null;
    const [web, events] = await Promise.all([getDirectoryWebPageData(data.listing.qr_page_id), getDirectoryEmbeddedEvents(data.listing.business_id, { includePast: true })]);
    const event = events.find(item => item.public_slug === eventSlug);
    return event ? { data, web, event } : null;
}

export async function generateMetadata({ params }) {
    const { directorySlug, eventSlug } = await params;
    const result = await context(directorySlug, eventSlug);
    if (!result) return {};
    const host = String(result.data.listing.primary_host || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
    const title = result.event.public_title || result.event.name;
    const description = String(result.event.public_description || result.event.description || `Evento de ${result.data.listing.display_name}`).slice(0, 160);
    const canonical = `https://${host}/${result.data.listing.slug}/eventos/${result.event.public_slug}`;
    return { title, description, alternates: { canonical }, openGraph: { title, description, url: canonical, type: "website", ...(result.event.cover_image ? { images: [{ url: result.event.cover_image }] } : {}) } };
}

export default async function DirectoryEventDetailPage({ params }) {
    const { directorySlug, eventSlug } = await params;
    const result = await context(directorySlug, eventSlug);
    if (!result) notFound();
    return <DirectoryEventsShell data={result.data} web={result.web} title={`Evento: ${result.event.public_title || result.event.name}`}>
        <EventPublicRegistration slug={result.event.public_slug} embedded />
    </DirectoryEventsShell>;
}
