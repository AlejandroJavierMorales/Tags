"use client";

export default function EventOwnerHeader({

    session

}) {

    return (

        <header
            style={{

                width: "100%",

                background:
                    "linear-gradient(135deg, #ccf5bb 0%, #e8ffe0 100%)",

                borderBottom:
                    "1px solid rgba(0,0,0,.06)",

                padding:
                    "14px 20px 30px",

                display: "flex",

                alignItems: "flex-start",

                justifyContent: "space-between",

                gap: "16px",

                flexWrap: "wrap",

                position: "sticky",

                top: 0,

                zIndex: 999
            }}
        >

            {/* LEFT */}
            <div
                style={{

                    display: "flex",

                    alignItems: "center",

                    gap: "14px",

                    minWidth: 0
                }}
            >

                {/* LOGO */}
                <div
                    style={{

                        width: "56px",

                        height: "56px",

                        borderRadius: "50%",

                        background: "#fff",

                        display: "flex",

                        alignItems: "center",

                        justifyContent: "center",

                        boxShadow:
                            "0 4px 14px rgba(0,0,0,.08)",

                        flexShrink: 0
                    }}
                >

                    <img
                        src="/logo_tags_transparente.webp"
                        alt="Tags"

                        style={{

                            width: "49px",

                            height: "41px",

                            objectFit: "contain"
                        }}
                    />

                </div>

                {/* TEXT */}
                <div
                    style={{
                        minWidth: 0
                    }}
                >

                    <div
                        style={{

                            fontSize: "22px",

                            fontWeight: 800,

                            color: "#111",

                            lineHeight: 1
                        }}
                    >

                        Tags eEvents

                    </div>

                    <div
                        style={{

                            fontSize: "12px",

                            color: "#4b5563",

                            marginTop: "4px",

                            whiteSpace: "nowrap",

                            overflow: "hidden",

                            textOverflow: "ellipsis"
                        }}
                    >

                        Gestión de Eventos con Códigos QR

                    </div>

                </div>

            </div>

            {/* SESSION */}
            <div
                style={{

                    position: "absolute",

                    right: "16px",

                    bottom: "8px",

                    display: "flex",

                    alignItems: "center",

                    gap: "6px",

                    fontSize: "11px",

                    color: "rgba(0,0,0,.55)",

                    maxWidth: "60vw",

                    overflow: "hidden",

                    whiteSpace: "nowrap",

                    textOverflow: "ellipsis"
                }}
            >

                <span
                    style={{
                        fontSize: "10px"
                    }}
                >
                    👤
                </span>

                <span
                    style={{
                        fontWeight: 600
                    }}
                >

                    {session?.name || "Usuario"}

                </span>

                <span
                    style={{
                        opacity: .5
                    }}
                >
                    ·
                </span>

                <span
                    style={{

                        overflow: "hidden",

                        textOverflow: "ellipsis"
                    }}
                >

                    {session?.email || "-"}

                </span>

            </div>

        </header>
    );
}