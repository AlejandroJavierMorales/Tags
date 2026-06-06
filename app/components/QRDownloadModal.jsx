"use client";

import { useEffect, useState } from "react";

import Modal from "react-modal";
import QRCode from "qrcode";

import "../styles/tagsModals.css";

Modal.setAppElement("body");

export default function QRDownloadModal({
    isOpen,
    onClose,
    qr
}) {

    const [format, setFormat] =
        useState("svg");

    const [qrPreview, setQrPreview] =
        useState("");

    // =========================
    // SAFE QR TARGET
    // =========================

    const qrTarget =
        typeof window !== "undefined"
            &&
            qr?.code
            ? `${window.location.origin}/t/${qr.code}`
            : "";

    // =========================
    // LOCAL QR PREVIEW
    // =========================

    useEffect(() => {

        async function generateQR() {

            try {

                if (!qrTarget) {

                    setQrPreview("");
                    return;
                }

                const dataUrl =
                    await QRCode.toDataURL(
                        qrTarget,
                        {
                            width: 320,
                            margin: 2
                        }
                    );

                setQrPreview(dataUrl);

            } catch (err) {

                console.log(err);
            }
        }

        generateQR();

    }, [qrTarget]);

    // =========================
    // EMPTY
    // =========================

    if (!qr) return null;

    // =========================
    // DOWNLOAD
    // =========================

    function downloadQR() {

        const filename =
            `${qr.code}-${qr.event_id}-${qr.attendee_id}`;

        const url =
            `/api/qr/download/${qr.code}?format=${format}&filename=${filename}&t=${Date.now()}`;

        window.open(
            url,
            "_blank"
        );
    }

    return (

        <Modal
            isOpen={isOpen}
            onRequestClose={onClose}
            className="tags_modal"
            overlayClassName="tags_modal_overlay"
        >

            {/* HEADER */}
            <div className="tags_modal_header">

                <div>

                    <div
                        style={{
                            fontSize: "12px",
                            color: "#6b7280",
                            marginBottom: "4px"
                        }}
                    >
                        Código QR
                    </div>

                    <h2
                        className="tags_title"
                        style={{
                            margin: 0
                        }}
                    >
                        Descargar QR
                    </h2>

                </div>

                <button
                    className="tags_modal_close"
                    onClick={onClose}
                >
                    ✕
                </button>

            </div>

            {/* BODY */}
            <div className="tags_modal_body">

                {/* PREVIEW */}
                <div className="qr_preview_container">

                    {
                        qrPreview
                        &&
                        (
                            <img
                                src={qrPreview}
                                alt={qr.code}
                                className="qr_preview_image"
                            />
                        )
                    }

                </div>

                {/* INFO */}
                <div className="qr_info_box tags_text_normal">

                    <div className="qr_info_row">

                        <span className="qr_info_label">
                            Código
                        </span>

                        <span className="qr_info_value">
                            {qr.code}
                        </span>

                    </div>

                    {
                        qr?.name
                        &&
                        (
                            <div className="qr_info_row">

                                <span className="qr_info_label">
                                    Invitado
                                </span>

                                <span className="qr_info_value">
                                    {qr.name}
                                </span>

                            </div>
                        )
                    }

                    {
                        qr?.event_name
                        &&
                        (
                            <div className="qr_info_row">

                                <span className="qr_info_label">
                                    Evento
                                </span>

                                <span className="qr_info_value">
                                    {qr.event_name}
                                </span>

                            </div>
                        )
                    }

                    {
                        qr?.event_date
                        &&
                        (
                            <div className="qr_info_row">

                                <span className="qr_info_label">
                                    Fecha
                                </span>

                                <span className="qr_info_value">
                                    {qr.event_date}
                                </span>

                            </div>
                        )
                    }

                </div>

                {/* FORMAT */}
                <div className="tags_form_group mt-3">

                    <label className="tags_form_label">
                        Formato de descarga
                    </label>

                    <select
                        className="tags_input"
                        value={format}
                        onChange={(e) =>
                            setFormat(e.target.value)
                        }
                    >

                        <option value="svg">
                            SVG (recomendado para Canva)
                        </option>

                        <option value="png">
                            PNG Alta Resolución
                        </option>

                    </select>

                </div>

                {/* TIPS */}
                <div className="qr_tip_box">

                    {
                        format === "svg"
                        &&
                        (
                            <p className="p-0 m-0">
                                SVG es vectorial y no pierde calidad.
                                Ideal para Canva e imprenta.
                            </p>
                        )
                    }

                    {
                        format === "png"
                        &&
                        (
                            <p className="p-0 m-0">
                                PNG 2000x2000 listo para compartir
                                o usar como preview.
                            </p>
                        )
                    }

                </div>

                {/* ACTIONS */}
                <div className="qr_modal_actions">

                    <button
                        className="tags_btn_modal"
                        onClick={downloadQR}
                    >
                        Descargar {format.toUpperCase()}
                    </button>

                </div>

            </div>

        </Modal>
    );
}