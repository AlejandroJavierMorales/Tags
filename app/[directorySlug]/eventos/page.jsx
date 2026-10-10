import { cache } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getHeadersHost } from "@/app/lib/channelContext";
import { getDirectoryListingBySlug, getDirectorySiteCodeByHost } from "@/app/modules/directory/lib/getDirectoryPublicData";
import { getDirectoryWebPageData } from "@/app/modules/directory/lib/getDirectoryWebPageData";
import { getDirectoryEmbeddedEvents } from "@/app/modules/directory/lib/getDirectoryEmbeddedEvents";
import DirectoryEventsBlock from "@/app/modules/directory/components/public/DirectoryEventsBlock";
import DirectoryEventsShell from "@/app/modules/directory/components/public/DirectoryEventsShell";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const listingBySlug = cache((slug, siteCode) => getDirectoryListingBySlug(slug, siteCode));
async function context(slug) {
    const requestHeaders = await headers();
    const siteCode = await getDirectorySiteCodeByHost(getHeadersHost(requestHeaders));
    const data = await listingBySlug(slug, siteCode);
    if (!data) return null;
    const [web, events] = await Promise.all([getDirectoryWebPageData(data.listing.qr_page_id), getDirectoryEmbeddedEvents(data.listing.business_id)]);
    return { data, web, events };
}

export async function generateMetadata({ params }) {
    const { directorySlug } = await params;
    const result = await context(directorySlug);
    if (!result) return {};
    const host = String(result.data.listing.primary_host || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
    const title = `Eventos de ${result.data.listing.display_name}`;
    const description = `Próximos eventos, charlas y actividades de ${result.data.listing.display_name}.`;
    const canonical = `https://${host}/${result.data.listing.slug}/eventos`;
    return { title, description, alternates: { canonical }, openGraph: { title, description, url: canonical, type: "website" } };
}

export default async function DirectoryEventsPage({ params }) {
    const { directorySlug } = await params;
    const result = await context(directorySlug);
    if (!result) notFound();
    return <DirectoryEventsShell data={result.data} web={result.web} title="Eventos" description="Charlas, encuentros y actividades disponibles.">
        {result.events.length ? <DirectoryEventsBlock events={result.events} listingSlug={result.data.listing.slug} content={{ title: "Próximos eventos", description: "Elegí un evento para consultar los detalles e inscribirte.", limit: result.events.length }} /> : <section><h2>No hay próximos eventos publicados</h2><p>Volvé a consultar más adelante.</p></section>}
    </DirectoryEventsShell>;
}
