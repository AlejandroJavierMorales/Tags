import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getChannelContextFromHost, getHeadersHost } from "@/app/lib/channelContext";
import { getSessionUser } from "@/app/modules/users/lib/userSession";
import MyAccountPageClient from "./pageClient";
import DirectoryPublicHeader from "@/app/modules/directory/components/public/DirectoryPublicHeader";
import DirectoryPublicFooter from "@/app/modules/directory/components/public/DirectoryPublicFooter";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mi cuenta", robots: { index: false, follow: false } };

export default async function MyAccountPage() {
    const session = await getSessionUser();
    if (!session) redirect("/login");
    const requestHeaders = await headers();
    const channel = await getChannelContextFromHost(getHeadersHost(requestHeaders));
    const directorySite = channel?.siteId ? { id: channel.siteId, name: channel.name, code: channel.code } : null;
    return directorySite
        ? <div className="tags_directory_account_shell"><DirectoryPublicHeader site={directorySite} compact showSearch={false} /><MyAccountPageClient channel={channel} directoryShell /><DirectoryPublicFooter site={directorySite} /></div>
        : <MyAccountPageClient channel={channel} />;
}
