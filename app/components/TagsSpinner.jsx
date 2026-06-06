// components/ui/TagsSpinner.jsx

export default function TagsSpinner({

    size = 200,
    logoSize = 110,
    borderSize = 6,
    speed = "1s",
    background = "transparent",

}) {

    return (

        <div
            style={{

                position: "fixed",

                inset: 0,

                display: "flex",

                alignItems: "center",

                justifyContent: "center",

                background,

                zIndex: 9999
            }}
        >

            <div
                style={{

                    width: size,

                    height: size,

                    border:
                        `${borderSize}px solid rgba(255,255,255,0.15)`,

                    borderTop:
                        `${borderSize}px solid #00c950`,

                    borderRadius: "50%",

                    display: "flex",

                    alignItems: "center",

                    justifyContent: "center",

                    animation:
                        `tags-spin ${speed} linear infinite`,

                    background: "#ccf5bb",

                    boxShadow:
                        "0 10px 30px rgba(0,0,0,.12)"
                }}
            >

                <img
                    src="/logo_tags_transparente.webp"
                    alt="Tags Logo"
                    style={{

                        width: logoSize,

                        height: logoSize,

                        objectFit: "contain"
                    }}
                />

            </div>

            <style jsx>{`

                @keyframes tags-spin {

                    0% {
                        transform: rotate(0deg);
                    }

                    100% {
                        transform: rotate(360deg);
                    }
                }

            `}</style>

        </div>
    );
}