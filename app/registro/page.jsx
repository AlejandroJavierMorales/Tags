import { headers } from "next/headers";
import { getChannelContextFromHost, getHeadersHost } from "@/app/lib/channelContext";
import UserRegistrationForm from "@/app/fidelizacion/registro/pageClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Crear cuenta", robots: { index: false, follow: false } };

export default async function UserRegistrationPage() {
    const requestHeaders = await headers();
    const channel = await getChannelContextFromHost(getHeadersHost(requestHeaders));
    return <UserRegistrationForm channel={channel} />;
}
