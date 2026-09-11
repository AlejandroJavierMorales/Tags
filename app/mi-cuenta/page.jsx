import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getChannelContextFromHost, getHeadersHost } from "@/app/lib/channelContext";
import { getSessionUser } from "@/app/modules/users/lib/userSession";
import MyAccountPageClient from "./pageClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mi cuenta", robots: { index: false, follow: false } };

export default async function MyAccountPage() {
    const session = await getSessionUser();
    if (!session) redirect("/login");
    const requestHeaders = await headers();
    const channel = await getChannelContextFromHost(getHeadersHost(requestHeaders));
    return <MyAccountPageClient channel={channel} />;
}
