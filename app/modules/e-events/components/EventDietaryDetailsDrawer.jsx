"use client";

import {
    FiX
} from "react-icons/fi";

export default function EventDietaryDetailsDrawer({

    open,
    item,
    onClose

}) {

    if (!open || !item) {

        return null;
    }

    return (

        <>

            {/* OVERLAY */}
            <div
                onClick={onClose}
                style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(0,0,0,.45)",
                    zIndex: 9998
                }}
            />

            {/* DRAWER */}
            <div
                style={{
                    position: "fixed",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: "80vh",
                    background: "#fff",
                    zIndex: 9999,
                    borderTopLeftRadius: 30,
                    borderTopRightRadius: 30,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column"
                }}
            >

                {/* TOP */}
                <div
                    style={{
                        padding: 24,
                        borderBottom: "1px solid #eee",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                    }}
                >

                    <div>

                        <div
                            style={{
                                fontSize: 13,
                                color: "#666",
                                marginBottom: 6
                            }}
                        >
                            Restricción
                        </div>

                        <h3
                            style={{
                                margin: 0
                            }}
                        >
                            {item.name}
                        </h3>

                    </div>

                    <button
                        onClick={onClose}
                        className="tags_btn secondary"
                    >
                        <FiX />
                    </button>

                </div>

                {/* CONTENT */}
                <div
                    style={{
                        flex: 1,
                        overflowY: "auto",
                        padding: 24
                    }}
                >

                    <div className="row g-3">

                        {
                            item.attendees?.map(att => (

                                <div
                                    key={att.id}
                                    className="col-12 col-lg-6"
                                >

                                    <div
                                        style={{
                                            border:
                                                "1px solid #ececec",

                                            borderRadius: 20,
                                            padding: 18
                                        }}
                                    >

                                        <div
                                            style={{
                                                fontWeight: 700,
                                                marginBottom: 10
                                            }}
                                        >
                                            {att.name}
                                        </div>

                                        {
                                            att.email
                                            &&
                                            (
                                                <div
                                                    style={{
                                                        marginBottom: 6,
                                                        color: "#666"
                                                    }}
                                                >
                                                    📧 {att.email}
                                                </div>
                                            )
                                        }

                                        {
                                            att.phone
                                            &&
                                            (
                                                <div
                                                    style={{
                                                        marginBottom: 6,
                                                        color: "#666"
                                                    }}
                                                >
                                                    📱 {att.phone}
                                                </div>
                                            )
                                        }

                                        {
                                            att.custom_dietary_notes
                                            &&
                                            (
                                                <div
                                                    style={{
                                                        marginTop: 14,
                                                        background: "#fff7ed",
                                                        border:
                                                            "1px solid #fed7aa",

                                                        padding: 12,
                                                        borderRadius: 14
                                                    }}
                                                >
                                                    📝 {
                                                        att.custom_dietary_notes
                                                    }
                                                </div>
                                            )
                                        }

                                    </div>

                                </div>

                            ))
                        }

                    </div>

                </div>

            </div>

        </>
    );
}