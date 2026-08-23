"use client";

import { useState } from "react";

import showAlert
    from "@/app/components/showAlert";

export default function MediaUploader({
    businessId,
    value,
    onChange,

    // Nuevo formato
    module = null,
    variant = "default",
    entityId = null,
    fileName = null,
    replace = false,
    previousUrl = "",
    previousStoragePath = "",
    previousOgStoragePath = "",

    // Legacy
    folder = "media",

    accept = "image/*",
    label = "Subir archivo",
    uploadEndpoint = "/api/qr-page/media/upload"
}) {
    const [uploading, setUploading] =
        useState(false);

    async function handleFileChange(e) {
        const file =
            e.target.files?.[0];

        if (!file) {
            return;
        }

        setUploading(true);

        try {
            const formData =
                new FormData();

            formData.append("businessId", businessId);
            formData.append("file", file);

            if (module && variant) {
                formData.append("module", module);
                formData.append("variant", variant);
                formData.append("replace", replace ? "1" : "0");

                if (entityId) {
                    formData.append("entityId", entityId);
                }

                if (fileName) {
                    formData.append("fileName", fileName);
                }

                if (previousUrl) {
                    formData.append("previousUrl", previousUrl);
                }

                if (previousStoragePath) {
                    formData.append("previousStoragePath", previousStoragePath);
                }

                if (previousOgStoragePath) {
                    formData.append("previousOgStoragePath", previousOgStoragePath);
                }
            } else {
                formData.append("folder", folder);
            }

            const res =
                await fetch(
                    uploadEndpoint,
                    {
                        method: "POST",
                        body: formData
                    }
                );

            const data =
                await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "Error subiendo archivo"
                );
            }

            onChange(data.media);

            showAlert({
                title: "Archivo subido",
                text: "El archivo se cargó correctamente.",
                icon: "success"
            });

        } catch (err) {
            showAlert({
                title: "Error",
                text: err.message,
                icon: "error"
            });

        } finally {
            setUploading(false);
            e.target.value = "";
        }
    }

    return (
        <div className="qr_page_uploader">

            {value && (
                <div className="qr_page_uploader_preview">
                    {String(value).match(/\.(mp4|webm)$/i) ? (
                        <video
                            src={value}
                            controls
                        />
                    ) : (
                        <img
                            src={value}
                            alt=""
                        />
                    )}
                </div>
            )}

            <label className="qr_page_upload_btn">
                {uploading ? "Subiendo..." : label}

                <input
                    type="file"
                    accept={accept}
                    onChange={handleFileChange}
                    disabled={uploading}
                    hidden
                />
            </label>

            {value && (
                <button
                    type="button"
                    className="qr_page_upload_remove"
                    onClick={() => onChange(null)}
                >
                    Quitar archivo
                </button>
            )}

        </div>
    );
}
