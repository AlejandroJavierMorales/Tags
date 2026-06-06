"use client";

import DietarySeverityBadge
    from "./DietarySeverityBadge";

export default function DietaryRestrictionCard({

    item,
    onEdit,
    onDelete,
    session

}) {

    const locked =

        item.is_system === 1
        &&
        session.role !== "admin";

    return (

        <div
            style={{
                background: "#fff",
                borderRadius: 24,
                padding: 22,
                border: "1px solid #ececec",
                height: "100%",
                display: "flex",
                flexDirection: "column"
            }}
        >

            {/* TOP */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    marginBottom: 18
                }}
            >

                <div
                    style={{
                        minWidth: 0
                    }}
                >

                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            marginBottom: 8
                        }}
                    >

                        <div
                            style={{
                                fontSize: 26,
                                flexShrink: 0
                            }}
                        >
                            {item.icon || "🍽️"}
                        </div>

                        <div
                            style={{
                                fontSize: 22,
                                fontWeight: 700,
                                color: "#111827",
                                lineHeight: 1.1
                            }}
                        >
                            {item.name}
                        </div>

                    </div>

                    <div
                        style={{
                            fontSize: 13,
                            color: "#666"
                        }}
                    >
                        {item.slug}
                    </div>

                </div>

                <DietarySeverityBadge
                    severity={item.severity}
                />

            </div>

            {/* BADGES */}
            <div
                style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    marginBottom: 18
                }}
            >

                {
                    item.is_system === 1
                    &&
                    (
                        <Badge>
                            🌍 Sistema
                        </Badge>
                    )
                }

                {
                    Number(
                        item.requires_kitchen_attention
                    ) === 1
                    &&
                    (
                        <Badge>
                            🍽 Catering
                        </Badge>
                    )
                }

            </div>

            {/* SPACER */}
            <div
                style={{
                    flex: 1
                }}
            />

            {/* FOOTER */}
            <div
                style={{
                    marginBottom: 18,
                    fontSize: 13,
                    color: "#666"
                }}
            >
                {
                    Number(item.attendees_count || 0)
                } invitados
            </div>

            {/* ACTIONS */}
            <div
                style={{
                    display: "flex",
                    gap: 10
                }}
            >

                <button
                    className="tags_btn"
                    style={{
                        flex: 1
                    }}
                    onClick={onEdit}
                    disabled={locked}
                >
                    Editar
                </button>

                <button
                    className="tags_modal_btn tags_modal_btn_cancel"
                    onClick={onDelete}
                    disabled={locked}
                >
                    Eliminar
                </button>

            </div>

        </div>

    );
}

function Badge({
    children
}) {

    return (

        <div
            style={{
                background: "#f3f4f6",
                border: "1px solid #e5e7eb",
                borderRadius: 999,
                padding: "6px 10px",
                fontSize: 12,
                fontWeight: 600,
                color: "#374151"
            }}
        >
            {children}
        </div>

    );
}


