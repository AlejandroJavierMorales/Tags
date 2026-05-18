// /components/HeaderSwitcher.jsx

import { cookies } from "next/headers";

import HeaderBusinesses from "./businesses/HeaderBusinesses";
import TagsHeader from "./Header";

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