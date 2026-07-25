// /components/HeaderSwitcher.jsx

import { cookies } from "next/headers";

import HeaderBusinesses from "./businesses/HeaderBusinesses";
import TagsHeader from "./Header";
import RestoStaffHeader
    from "@/app/modules/resto/components/admin/staff/RestoStaffHeader";
import "@/app/modules/resto/styles/resto-staff.css";

export default async function HeaderSwitcher() {

    const cookieStore =
        await cookies();

    const cookie =
        cookieStore.get("tags_session");

    if (!cookie) {

        return <TagsHeader />;
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

        // =====================================
        // ADMIN
        // =====================================

        if (session?.role === "admin") {

            return <TagsHeader />;
        }

        // =====================================
        // BUSINESS
        // =====================================

        if (session?.businessId) {

            return <HeaderBusinesses />;
        }

    } catch (err) {

        console.error(
            "INVALID SESSION:",
            err
        );
    }

    return <TagsHeader />;
}
