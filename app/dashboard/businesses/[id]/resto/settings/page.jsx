import {
    cookies
} from "next/headers";
import {
    redirect
} from "next/navigation";
import HeaderSwitcher
    from "@/app/components/HeaderSwitcher";
import RestoSettingsClient
    from "./pageClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
    title: "Tags Resto | Configuración",
    robots: {
        index: false,
        follow: false
    }
};

export default async function Page({
    params
}) {
    const { id } =
        await params;
    const cookie =
        (await cookies()).get(
            "tags_session"
        );
    if (!cookie) redirect("/login");

    let session;
    try {
        session =
            JSON.parse(cookie.value);
    } catch {
        redirect("/login");
    }

    const allowed =
        session?.role === "admin" ||
        String(
            session?.business_id ||
            session?.businessId ||
            ""
        ) === String(id);

    if (!allowed) redirect("/dashboard");

    return (
        <>
            <HeaderSwitcher />
            <RestoSettingsClient
                businessId={id}
            />
        </>
    );
}
