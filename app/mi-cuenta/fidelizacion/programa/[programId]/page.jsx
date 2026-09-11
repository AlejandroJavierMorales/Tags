import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/modules/users/lib/userSession";
import { getChannelContextFromHost, getHeadersHost } from "@/app/lib/channelContext";
import LoyaltyProgramPageClient from "./pageClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Programa de fidelización", robots: { index: false, follow: false } };

export default async function LoyaltyProgramPage({ params }) {
    const session = await getSessionUser();
    if (!session) redirect(`/login?returnTo=${encodeURIComponent(`/mi-cuenta/fidelizacion/programa/${params.programId}`)}`);
    const requestHeaders = await headers();
    const channel = await getChannelContextFromHost(getHeadersHost(requestHeaders));
    return <LoyaltyProgramPageClient programId={Number(params.programId)} channel={channel} />;
}
