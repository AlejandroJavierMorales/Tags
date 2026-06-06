"use client";

import Link from "next/link";

export default function OwnerNavigation({ session, staffPermissions={} }) {

    // =========================
    // PERMISSIONS
    // =========================

    const canManageGlobalStaff =

        // admins
        session?.role === "admin"

        ||

        // clientes del evento
        session?.role === "event_client"

        ||

        // staff con permisos
        (
            session?.type === "event_staff"
            &&
            (
                session?.permissions?.includes("staff.create")
                ||
                session?.permissions?.includes("staff.update")
                ||
                session?.permissions?.includes("staff.delete")
                ||
                session?.permissions?.includes("staff.view")
                ||
                staffPermissions.staff
            )
        );

      const canManageGlobalTags =

        // admins
        session?.role === "admin"

        ||

        // clientes del evento
        session?.role === "event_client"

        ||

        // staff con permisos
        (
            session?.type === "event_staff"
            &&
            (
                session?.permissions?.includes("tags.create")
                ||
                session?.permissions?.includes("tags.update")
                ||
                session?.permissions?.includes("tags.delete")
                ||
                session?.permissions?.includes("tags.view")
                ||
                staffPermissions.staff
            )
        );  

    return (

        <div
            className="d-flex flex-wrap gap-2 mb-4"
        >

            <Link
                href="/dashboard/events"
                className="tags_btn_secondary card p-2"
            >
                🎫 Eventos
            </Link>

            {
                canManageGlobalStaff
                &&
                (
                    <Link
                        href="/dashboard/events/staff"
                        className="tags_btn_secondary card p-2"
                    >
                        👥 Staff Global
                    </Link>
                )
            }
            {
                canManageGlobalTags
                &&
                (
                    <Link
                        href="/dashboard/events/tags"
                        className="tags_btn_secondary card p-2"
                    >
                        🏷️ Terjetas/Pases
                    </Link>
                )
            }

        </div>
    );
}