"use client";

import { useState } from "react";
import Modal from "react-modal";

import "../styles/tagsModals.css";
import showAlert from "./showAlert";

Modal.setAppElement("body");

export default function QRDownloadModal({
    isOpen,
    onClose,
    qr
}) {

    const [format, setFormat] = useState("svg");

    if (!qr) return null;

    // =========================
    // QR TARGET (DINÁMICO)
    // =========================
    const qrTarget =
        typeof window !== "undefined"
            ? `${window.location.origin}/t/${qr.code}`
            : "";

    // =========================
    // DOWNLOAD
    // =========================
    function downloadQR() {

        const url =
            `/api/qr/download/${qr.code}?format=${format}&t=${Date.now()}`;

        window.open(url, "_blank");
    }
    // =========================
    // COPY URL
    // =========================
    async function copyURL() {

        try {

            await navigator.clipboard.writeText(
                qrTarget
            );

            showAlert({
                title: "OK",
                text: "URL copiada",
                icon: "success",
            });

        } catch (err) {

            console.error(err);
        }
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

                <h2 className="tags_title">
                    Descargar QR
                </h2>

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

                    {qrTarget && (

                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrTarget)}`}
                            alt={qr.code}
                            className="qr_preview_image"
                        />

                    )}

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

                    {qr.product_name && (

                        <div className="qr_info_row">

                            <span className="qr_info_label">
                                Producto
                            </span>

                            <span className="qr_info_value">
                                {qr.product_name}
                            </span>

                        </div>

                    )}

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

                    {format === "svg" && (

                        <p className="p-0 m-0">
                            SVG es vectorial y no pierde calidad.
                            Ideal para Canva e imprenta.
                        </p>

                    )}

                    {format === "png" && (

                        <p className="p-0 m-0">
                            PNG 2000x2000 listo para compartir
                            o usar como preview.
                        </p>

                    )}

                </div>

                {/* ACTIONS */}
                <div className="qr_modal_actions">

                    <button
                        className="tags_btn"
                        onClick={copyURL}
                    >
                        Copiar URL
                    </button>

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