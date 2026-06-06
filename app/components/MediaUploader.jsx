"use client";

import { useState }
    from "react";

import showAlert
    from "@/app/components/showAlert";

export default function MediaUploader({
    businessId,
    value,
    onChange,
    folder = "media",
    accept = "image/*",
    label = "Subir archivo"
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

            formData.append(
                "businessId",
                businessId
            );

            formData.append(
                "folder",
                folder
            );

            formData.append(
                "file",
                file
            );

            const res =
                await fetch(
                    "/api/qr-page/media/upload",
                    {
                        method: "POST",
                        body: formData
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "Error subiendo archivo"
                );
            }

            onChange(data.media);

            showAlert({
                type: "success",
                title: "Archivo subido",
                text: "El archivo se cargó correctamente"
            });

        } catch (err) {

            showAlert({
                type: "error",
                title: "Error",
                text: err.message
            });

        } finally {

            setUploading(false);
            e.target.value = "";
        }
    }

    return (
        <div className="qr_page_uploader">

            {
                value && (
                    <div className="qr_page_uploader_preview">
                        {
                            value.match(/\.(mp4|webm)$/i)
                                ? (
                                    <video
                                        src={value}
                                        controls
                                    />
                                )
                                : (
                                    <img
                                        src={value}
                                        alt=""
                                    />
                                )
                        }
                    </div>
                )
            }

            <label className="qr_page_upload_btn">
                {
                    uploading
                        ? "Subiendo..."
                        : label
                }

                <input
                    type="file"
                    accept={accept}
                    onChange={handleFileChange}
                    disabled={uploading}
                    hidden
                />
            </label>

            {
                value && (
                    <button
                        type="button"
                        className="qr_page_upload_remove"
                        onClick={() => onChange(null)}
                    >
                        Quitar archivo
                    </button>
                )
            }

        </div>
    );
}