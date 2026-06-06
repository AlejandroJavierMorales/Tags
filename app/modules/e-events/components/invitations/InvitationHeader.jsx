"use client";

export default function InvitationHeader({
    headerConfig = {},
    blocks = []
}) {

    const {
        enabled = true,
        sticky = true,
        showLogo = true,
        showMenu = true,
        logoUrl = "",
        backgroundColor = "rgba(255,255,255,0.92)",
        textColor = "#111111",
        height = 72,
        logoHeight = 42
    } = headerConfig || {};

    if (enabled === false) {
        return null;
    }

    const menuBlocks =
        Array.isArray(blocks)
            ? blocks
                .filter(block =>
                    block?.is_active !== false
                    &&
                    block?.type !== "footer"
                )
                .sort((a, b) =>
                    Number(a.position || 0) - Number(b.position || 0)
                )
            : [];

    function getLabel(type) {

        const labels = {
            hero: "Inicio",
            event_info: "Evento",
            countdown: "Cuenta regresiva",
            gallery: "Galería",
            location: "Ubicación",
            video: "Video",
            timeline: "Agenda",
            gifts: "Regalos",
            rsvp: "RSVP"
        };

        return labels[type] || type;
    }

    function scrollToBlock(block) {

        const section =
            document.getElementById(
                `invite-section-${block.id}`
            );

        if (!section) return;

        section.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    return (

        <header
            style={{
                position: sticky ? "sticky" : "relative",
                top: 0,
                zIndex: 30,
                minHeight: height,
                background: backgroundColor,
                color: textColor,
                backdropFilter: "blur(12px)",
                borderBottom: "1px solid rgba(0,0,0,0.08)"
            }}
        >

            <div
                style={{
                    minHeight: height,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                    padding: "10px 18px"
                }}
            >

                {
                    showLogo
                    &&
                    logoUrl
                    &&
                    (
                        <img
                            src={logoUrl}
                            alt="Logo"
                            style={{
                                maxHeight: logoHeight,
                                maxWidth: 120,
                                objectFit: "contain",
                                flexShrink: 0
                            }}
                        />
                    )
                }

                {
                    showMenu
                    &&
                    menuBlocks.length > 0
                    &&
                    (
                        <nav
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-end",
                                gap: 8,
                                flexWrap: "wrap",
                                width: "100%"
                            }}
                        >
                            {
                                menuBlocks.map(block => (

                                    <button
                                        key={block.id}
                                        type="button"
                                        onClick={() =>
                                            scrollToBlock(block)
                                        }
                                        className="tags_text_normal"
                                        style={{
                                            border: "none",
                                            background: "rgba(0,0,0,0.06)",
                                            color: textColor,
                                            cursor: "pointer",
                                            borderRadius: 999,
                                            padding: "7px 12px",
                                            fontSize: 13,
                                            lineHeight: 1,
                                            fontWeight: 600
                                        }}
                                    >
                                        {getLabel(block.type)}
                                    </button>

                                ))
                            }
                        </nav>
                    )
                }

            </div>

        </header>
    );
}