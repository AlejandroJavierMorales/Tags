// /components/HeaderSwitcher.jsx

import { cookies, headers } from "next/headers";

import TagsHeader from "./Header";
import RestoStaffHeader
    from "@/app/modules/resto/components/admin/staff/RestoStaffHeader";
import RestoOwnerHeader
    from "@/app/modules/resto/components/admin/RestoOwnerHeader";
import "@/app/modules/resto/styles/resto-staff.css";
import { getChannelContextFromHost, getHeadersHost } from "@/app/lib/channelContext";

export default async function HeaderSwitcher({ context = null }) {

    const cookieStore =
        await cookies();

    const requestHeaders = await headers();
    const channel = await getChannelContextFromHost(
        getHeadersHost(requestHeaders)
    );

    const cookie =
        cookieStore.get("tags_session");

    if (!cookie) {
        return null;
    }

    try {

        const session =
            JSON.parse(cookie.value);

        if (
            session?.type ===
            "resto_staff"
        ) {
            return (
                <RestoStaffHeader
                    name={
                        session.name ||
                        session.email
                    }
                    roleName={
                        session.roleName
                    }
                />
            );
        }

        if (context === "resto" && session?.businessId) {
            return <RestoOwnerHeader name={session.name || session.email} channel={channel} />;
        }

        // =====================================
        // ADMIN
        // =====================================

        if (session?.role === "admin") {

            return <TagsHeader />;
        }

        // Los owners usan el encabezado propio de su dashboard o módulo.
        // El header administrativo de plataforma es exclusivo del administrador.
        if (session?.businessId) return null;

    } catch (err) {

        console.error(
            "INVALID SESSION:",
            err
        );
    }

    return null;
}
