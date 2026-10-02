import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/modules/users/lib/userSession";
import { getChannelContextFromHost, getHeadersHost } from "@/app/lib/channelContext";
import LoyaltyUserPageClient from "@/app/fidelizacion/pageClient";
import DirectoryPublicHeader from "@/app/modules/directory/components/public/DirectoryPublicHeader";
import DirectoryPublicFooter from "@/app/modules/directory/components/public/DirectoryPublicFooter";

export const dynamic = "force-dynamic";

export default async function LoyaltyAccountPage({ searchParams }) {
    const session = await getSessionUser();
    if (!session) redirect(`/login?returnTo=${encodeURIComponent("/mi-cuenta/fidelizacion")}`);
    const channel = await getChannelContextFromHost(getHeadersHost(await headers()));
    const directorySite = channel?.siteId ? { id: channel.siteId, name: channel.name, code: channel.code } : null;
    const content = <LoyaltyUserPageClient channel={channel} initialSection={String(searchParams?.seccion || "")} directoryShell={Boolean(directorySite)} />;
    return directorySite
        ? <div className="tags_directory_account_shell"><DirectoryPublicHeader site={directorySite} compact showSearch={false} />{content}<DirectoryPublicFooter site={directorySite} /></div>
        : content;
}
