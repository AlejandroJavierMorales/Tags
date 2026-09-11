// =====================================
// PAGE: /fidelizacion
// Descripcion: Portal inicial de la cuenta personal de Tags.
// =====================================

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSessionUser } from "@/app/modules/users/lib/userSession";
import { getChannelContextFromHost, getHeadersHost } from "@/app/lib/channelContext";
import LoyaltyUserPageClient from "./pageClient";

export const dynamic = "force-dynamic";

export default async function LoyaltyUserPage({ searchParams }) {
    const session = await getSessionUser();
    if (!session) redirect("/login");
    const requestHeaders = await headers();
    const channel = await getChannelContextFromHost(getHeadersHost(requestHeaders));
    return <LoyaltyUserPageClient channel={channel} initialSection={String(searchParams?.seccion || "")} />;
}
