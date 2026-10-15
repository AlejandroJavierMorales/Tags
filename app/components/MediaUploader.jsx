"use client";

import { useState } from "react";
import { FaSpinner, FaUpload } from "react-icons/fa6";

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
    const [progress, setProgress] = useState(0);

    function uploadWithProgress(formData) {
        return new Promise((resolve, reject) => {
            const request = new XMLHttpRequest();
            request.open("POST", uploadEndpoint);
            request.responseType = "json";
            request.upload.addEventListener("progress", event => {
                if (event.lengthComputable) setProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
            });
            request.addEventListener("load", () => {
                const data = request.response || {};
                if (request.status >= 200 && request.status < 300) resolve(data);
                else reject(new Error(data.error || "Error subiendo archivo"));
            });
            request.addEventListener("error", () => reject(new Error("No se pudo conectar con el servidor para subir el archivo")));
            request.addEventListener("abort", () => reject(new Error("La carga fue cancelada")));
            request.send(formData);
        });
    }

    async function handleFileChange(e) {
        const file =
            e.target.files?.[0];

        if (!file) {
            return;
        }

        setUploading(true);
        setProgress(0);

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

            const data = await uploadWithProgress(formData);

            onChange(data.media);

            showAlert(data.warning ? {
                title: "Archivo subido sin optimizar",
                text: data.warning,
                icon: "warning"
            } : {
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
            setProgress(0);
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
                {uploading ? <><FaSpinner className="qr_page_upload_spinner" /> Subiendo {progress}%</> : <><FaUpload /> {label}</>}

                <input
                    type="file"
                    accept={accept}
                    onChange={handleFileChange}
                    disabled={uploading}
                    hidden
                />
            </label>

            {uploading && (
                <div className="qr_page_upload_progress" role="progressbar" aria-label="Progreso de carga" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}>
                    <span style={{ width: `${progress}%` }} />
                </div>
            )}

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
