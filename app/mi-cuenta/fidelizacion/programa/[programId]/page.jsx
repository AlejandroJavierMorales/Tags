import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/modules/users/lib/userSession";
import { getChannelContextFromHost, getHeadersHost } from "@/app/lib/channelContext";
import LoyaltyProgramPageClient from "./pageClient";
import DirectoryPublicHeader from "@/app/modules/directory/components/public/DirectoryPublicHeader";
import DirectoryPublicFooter from "@/app/modules/directory/components/public/DirectoryPublicFooter";

export const dynamic = "force-dynamic";
export const metadata = { title: "Programa de fidelización", robots: { index: false, follow: false } };

export default async function LoyaltyProgramPage({ params }) {
    const session = await getSessionUser();
    if (!session) redirect(`/login?returnTo=${encodeURIComponent(`/mi-cuenta/fidelizacion/programa/${params.programId}`)}`);
    const requestHeaders = await headers();
    const channel = await getChannelContextFromHost(getHeadersHost(requestHeaders));
    const directorySite = channel?.siteId ? { id: channel.siteId, name: channel.name, code: channel.code } : null;
    const content = <LoyaltyProgramPageClient programId={Number(params.programId)} channel={channel} directoryShell={Boolean(directorySite)} />;
    return directorySite
        ? <div className="tags_directory_account_shell"><DirectoryPublicHeader site={directorySite} compact showSearch={false} />{content}<DirectoryPublicFooter site={directorySite} /></div>
        : content;
}
