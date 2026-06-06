"use client";

import { useRouter }
    from "next/navigation";

export default function InvitationNavigation({

    eventId,
    invitationId,
    active

}) {

    const router =
        useRouter();

    return (

        <div
            style={{
                display: "flex",
                gap: 4,
                flexWrap: "wrap",
                marginBottom: 16
            }}
        >

            <div className="d-flex">

                <button
                    className="icon_btn m-1"
                    title="Invitaciones"
                    onClick={() =>
                        router.push(
                            `/dashboard/events/${eventId}/invitations`
                        )
                    }
                >
                    ←
                </button>

                <button
                    className={`icon_btn m-1 ${
                        active === "builder"
                            ? "success"
                            : ""
                    }`}
                    title="Diseñador"
                    onClick={() =>
                        router.push(
                            `/dashboard/events/${eventId}/invitations/${invitationId}/builder`
                        )
                    }
                >
                    🧩
                </button>

                <button
                    className={`icon_btn m-1 ${
                        active === "media"
                            ? "success"
                            : ""
                    }`}
                    title="Media"
                    onClick={() =>
                        router.push(
                            `/dashboard/events/${eventId}/invitations/${invitationId}/media`
                        )
                    }
                >
                    🖼
                </button>

                <button
                    className={`icon_btn m-1 ${
                        active === "guests"
                            ? "success"
                            : ""
                    }`}
                    title="Invitados"
                    onClick={() =>
                        router.push(
                            `/dashboard/events/${eventId}/invitations/${invitationId}/guests`
                        )
                    }
                >
                    👥
                </button>

                <button
                    className={`icon_btn m-1 ${
                        active === "sending"
                            ? "success"
                            : ""
                    }`}
                    title="Envíos"
                    onClick={() =>
                        router.push(
                            `/dashboard/events/${eventId}/invitations/${invitationId}/sending`
                        )
                    }
                >
                    📨
                </button>

                <button
                    className={`icon_btn m-1 ${
                        active === "analytics"
                            ? "success"
                            : ""
                    }`}
                    title="Estadísticas"
                    onClick={() =>
                        router.push(
                            `/dashboard/events/${eventId}/invitations/${invitationId}/analytics`
                        )
                    }
                >
                    📊
                </button>

            </div>

        </div>
    );
}