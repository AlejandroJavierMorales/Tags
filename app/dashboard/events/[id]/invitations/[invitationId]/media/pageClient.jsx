"use client";

import { useEffect, useState }
    from "react";

import { useRouter }
    from "next/navigation";

import showAlert
    from "@/app/components/showAlert";

import "../../../../../../styles/tagsModals.css";

import OwnerNavigation
    from "@/app/modules/e-events/components/OwnerNavigation";

import EventNavigation
    from "@/app/modules/e-events/components/EventNavigation";

import EventOwnerHeader
    from "@/app/modules/e-events/components/EventOwnerHeader";
import TagsSpinner from "@/app/components/TagsSpinner";
import InvitationNavigation from "@/app/modules/e-events/components/invitations/InvitationNavigation";

export default function InvitationMediaPageClient({

    session,
    eventId,
    invitationId,
    modules

}) {

    const router =
        useRouter();

    const [media, setMedia] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [showModal, setShowModal] =
        useState(false);

    const [selectedFile, setSelectedFile] =
        useState(null);

    const [previewUrl, setPreviewUrl] =
        useState("");

    const [altText, setAltText] =
        useState("");

    useEffect(() => {

        if (!invitationId) return;

        load();

    }, [invitationId]);

    async function load() {

        try {

            setLoading(true);

            const res =
                await fetch(
                    `/api/events/invitations/media/list?invitation_id=${invitationId}`,
                    {
                        cache: "no-store"
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {

                showAlert({

                    title: "Error",

                    text:
                        data.error ||
                        "Error cargando media",

                    icon: "error"
                });

                return;
            }

            setMedia(
                data.media || []
            );

        } catch (err) {

            console.log(err);

        } finally {

            setLoading(false);
        }
    }

    function openCreate() {

        setSelectedFile(null);
        setPreviewUrl("");
        setAltText("");
        setShowModal(true);
    }

    function handleFileChange(e) {

        const file =
            e.target.files?.[0];

        if (!file) return;

        setSelectedFile(file);

        setPreviewUrl(
            URL.createObjectURL(file)
        );

        if (!altText) {

            setAltText(
                file.name
                    .replace(/\.[^/.]+$/, "")
                    .replaceAll("-", " ")
                    .replaceAll("_", " ")
            );
        }
    }

    function getImageSize(file) {

        return new Promise((resolve) => {

            if (!file.type.startsWith("image/")) {

                resolve({
                    width: null,
                    height: null
                });

                return;
            }

            const img =
                new Image();

            img.onload = () => {

                resolve({
                    width: img.width,
                    height: img.height
                });

                URL.revokeObjectURL(img.src);
            };

            img.onerror = () => {

                resolve({
                    width: null,
                    height: null
                });
            };

            img.src =
                URL.createObjectURL(file);
        });
    }


    async function saveMedia() {

        try {

            if (!selectedFile) {

                showAlert({
                    title: "Error",
                    text: "Seleccioná una imagen",
                    icon: "error"
                });

                return;
            }

            setSaving(true);

            const imageSize =
                await getImageSize(
                    selectedFile
                );

            const formData =
                new FormData();

            formData.append(
                "file",
                selectedFile
            );

            formData.append(
                "folder",
                `events/invitations/${invitationId}`
            );

            const uploadRes =
                await fetch(
                    "/api/files/upload",
                    {
                        method: "POST",
                        body: formData
                    }
                );

            const uploadData =
                await uploadRes.json();

            if (!uploadRes.ok) {

                showAlert({
                    title: "Error",
                    text:
                        uploadData.error ||
                        "No se pudo subir la imagen",
                    icon: "error"
                });

                return;
            }

            const fileUrl =
                uploadData.file_url
                ||
                uploadData.url
                ||
                uploadData.publicUrl
                ||
                uploadData.downloadURL;

            const storagePath =
                uploadData.storage_path
                ||
                uploadData.path
                ||
                uploadData.filePath
                ||
                uploadData.storagePath;

            if (!fileUrl) {

                showAlert({
                    title: "Error",
                    text: "La API de upload no devolvió la URL del archivo",
                    icon: "error"
                });

                return;
            }

            const registerRes =
                await fetch(
                    "/api/events/invitations/media/upload",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({

                                invitation_id:
                                    Number(invitationId),

                                file_url:
                                    fileUrl,

                                storage_path:
                                    storagePath || fileUrl,

                                mime_type:
                                    selectedFile.type,

                                size_bytes:
                                    selectedFile.size,

                                width:
                                    imageSize.width,

                                height:
                                    imageSize.height,

                                alt_text:
                                    altText || selectedFile.name
                            })
                    }
                );

            const registerData =
                await registerRes.json();

            if (!registerRes.ok) {

                showAlert({
                    title: "Error",
                    text:
                        registerData.error ||
                        "La imagen subió, pero no se pudo registrar",
                    icon: "error"
                });

                return;
            }

            setShowModal(false);

            setSelectedFile(null);
            setPreviewUrl("");
            setAltText("");

            await load();

            showAlert({
                title: "OK",
                text: "Imagen subida correctamente",
                icon: "success"
            });

        } catch (err) {

            console.log(err);

            showAlert({
                title: "Error",
                text: "No se pudo subir la imagen",
                icon: "error"
            });

        } finally {

            setSaving(false);
        }
    }

    async function deleteMedia(id) {

        const confirm =
            await showAlert({

                title:
                    "Eliminar media",

                text:
                    "Esta acción no se puede deshacer",

                icon: "warning",

                showCancelButton: true
            });

        if (!confirm) return;

        try {

            const res =
                await fetch(
                    "/api/events/invitations/media/delete",
                    {

                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({

                                media_id:
                                    id
                            })
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {

                showAlert({

                    title: "Error",

                    text:
                        data.error ||
                        "No se pudo eliminar",

                    icon: "error"
                });

                return;
            }

            await load();

            showAlert({

                title: "OK",

                text:
                    "Media eliminada",

                icon: "success"
            });

        } catch (err) {

            console.log(err);
        }
    }

    async function copyUrl(url) {

        try {

            await navigator.clipboard.writeText(
                url
            );

            showAlert({

                title: "Copiado",

                text:
                    "URL copiada al portapapeles",

                icon: "success"
            });

        } catch (err) {

            console.log(err);

            showAlert({

                title: "Error",

                text:
                    "No se pudo copiar la URL",

                icon: "error"
            });
        }
    }

    function isImage(item) {

        return (
            item.type === "image"
            ||
            item.file_url?.match(
                /\.(jpg|jpeg|png|webp|gif|avif)$/i
            )
        );
    }

    function isVideo(item) {

        return (
            item.type === "video"
            ||
            item.file_url?.match(
                /\.(mp4|webm|mov)$/i
            )
        );
    }

    return (

        <div className="container-fluid tags_container m-0 p-0">

            <EventOwnerHeader
                session={session}
            />

            <div className="m-0 p-0 pt-4 px-2 px-md-3">

                {
                    (
                        session.role === "admin"
                        ||
                        session.role === "event_client"
                    )
                    &&
                    <OwnerNavigation />
                }

                {
                    modules
                    &&
                    (
                        <EventNavigation
                            eventId={eventId}
                            modules={modules}
                        />
                    )
                }

                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 24,
                        gap: 12,
                        flexWrap: "wrap"
                    }}
                >

                    <div>

                        <h2>
                            🖼 Media de Invitación
                        </h2>

                        <p>
                            Galería y recursos visuales asociados a la invitación.
                        </p>

                    </div>

                    <div
                        style={{
                            display: "flex",
                            gap: 4,
                            flexWrap: "wrap"
                        }}
                    >

                        <InvitationNavigation
                            eventId={eventId}
                            invitationId={invitationId}
                            active="media"
                        />
                        <div>
                            <button
                                className="tags_btn"
                                onClick={openCreate}
                            >
                                ✚ Imagen/Video
                            </button>
                        </div>



                    </div>

                </div>

                {
                    loading
                    &&
                    <TagsSpinner />
                }

                {
                    !loading
                    &&
                    media.length === 0
                    &&
                    (
                        <div
                            className="card"
                            style={{
                                marginBottom: 24
                            }}
                        >

                            <div className="card-body">

                                <h5>
                                    Todavía no hay media cargada
                                </h5>

                                <p>
                                    Agregá imágenes para usarlas luego en el Hero,
                                    galería o bloques visuales de la invitación.
                                </p>

                                <button
                                    className="tags_btn"
                                    onClick={openCreate}
                                >
                                    ✚ Agregar primera imagen
                                </button>

                            </div>

                        </div>
                    )
                }

                {
                    !loading
                    &&
                    media.length > 0
                    &&
                    (

                        <div className="row g-3">

                            {
                                media.map(item => (

                                    <div
                                        className="col-sm-6 col-md-4 col-lg-3"
                                        key={item.id}
                                    >

                                        <div
                                            className="card h-100"
                                            style={{
                                                overflow: "hidden"
                                            }}
                                        >

                                            <div
                                                style={{
                                                    height: 180,
                                                    background: "#f8f9fa",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    overflow: "hidden"
                                                }}
                                            >

                                                {
                                                    isImage(item)
                                                    &&
                                                    (
                                                        <img
                                                            src={item.file_url}
                                                            alt={item.alt_text || ""}
                                                            style={{
                                                                width: "100%",
                                                                height: "100%",
                                                                objectFit: "cover"
                                                            }}
                                                        />
                                                    )
                                                }

                                                {
                                                    isVideo(item)
                                                    &&
                                                    (
                                                        <video
                                                            src={item.file_url}
                                                            controls
                                                            style={{
                                                                width: "100%",
                                                                height: "100%",
                                                                objectFit: "cover"
                                                            }}
                                                        />
                                                    )
                                                }

                                                {
                                                    !isImage(item)
                                                    &&
                                                    !isVideo(item)
                                                    &&
                                                    (
                                                        <div
                                                            style={{
                                                                textAlign: "center",
                                                                color: "#666",
                                                                padding: 12
                                                            }}
                                                        >
                                                            Archivo
                                                        </div>
                                                    )
                                                }

                                            </div>

                                            <div className="card-body">

                                                <div
                                                    style={{
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        alignItems: "center",
                                                        marginBottom: 8
                                                    }}
                                                >

                                                    <span className="tags_badge">
                                                        {item.type}
                                                    </span>

                                                    <small>
                                                        #{item.position}
                                                    </small>

                                                </div>

                                                <p
                                                    style={{
                                                        fontSize: 13,
                                                        wordBreak: "break-all",
                                                        minHeight: 42
                                                    }}
                                                >
                                                    {
                                                        item.alt_text
                                                        ||
                                                        item.file_url
                                                    }
                                                </p>

                                                <div
                                                    style={{
                                                        display: "flex",
                                                        gap: 8,
                                                        flexWrap: "wrap"
                                                    }}
                                                >

                                                    <button
                                                        className="icon_btn"
                                                        title="Copiar URL"
                                                        onClick={() =>
                                                            copyUrl(
                                                                item.file_url
                                                            )
                                                        }
                                                    >
                                                        📋
                                                    </button>

                                                    <button
                                                        className="icon_btn"
                                                        title="Abrir"
                                                        onClick={() =>
                                                            window.open(
                                                                item.file_url,
                                                                "_blank"
                                                            )
                                                        }
                                                    >
                                                        🔎
                                                    </button>

                                                    <button
                                                        className="icon_btn danger"
                                                        title="Eliminar"
                                                        onClick={() =>
                                                            deleteMedia(
                                                                item.id
                                                            )
                                                        }
                                                    >
                                                        🗑
                                                    </button>

                                                </div>

                                            </div>

                                        </div>

                                    </div>

                                ))
                            }

                        </div>
                    )
                }

            </div>

            {
                showModal
                &&
                (

                    <div className="tags_modal_overlay">

                        <div
                            className="tags_modal"
                            style={{
                                maxWidth: 720
                            }}
                        >

                            <div className="tags_modal_header">

                                <h3>
                                    Agregar Media
                                </h3>

                                <button
                                    className="tags_modal_close"
                                    onClick={() =>
                                        setShowModal(false)
                                    }
                                >
                                    ✕
                                </button>

                            </div>

                            <div className="tags_modal_body">

                                <div className="mb-3">

                                    <label>
                                        Imagen o video
                                    </label>

                                    <input
                                        type="file"
                                        className="form-control"
                                        accept="image/*,video/*"
                                        onChange={handleFileChange}
                                    />

                                    <small
                                        style={{
                                            color: "#666"
                                        }}
                                    >
                                        Imágenes: JPG, PNG, WEBP, AVIF. Videos: MP4, WEBM.
                                    </small>

                                </div>

                                {
                                    previewUrl
                                    &&
                                    (
                                        <div
                                            className="mb-3"
                                            style={{
                                                border: "1px solid #e5e7eb",
                                                borderRadius: 12,
                                                overflow: "hidden",
                                                background: "#f8f9fa"
                                            }}
                                        >

                                            {
                                                selectedFile?.type?.startsWith("video/")
                                                    ?
                                                    (
                                                        <video
                                                            src={previewUrl}
                                                            controls
                                                            style={{
                                                                width: "100%",
                                                                maxHeight: 280,
                                                                objectFit: "cover"
                                                            }}
                                                        />
                                                    )
                                                    :
                                                    (
                                                        <img
                                                            src={previewUrl}
                                                            alt=""
                                                            style={{
                                                                width: "100%",
                                                                maxHeight: 280,
                                                                objectFit: "cover"
                                                            }}
                                                        />
                                                    )
                                            }

                                        </div>
                                    )
                                }

                                <div className="mb-3">

                                    <label>
                                        Nombre o descripción
                                    </label>

                                    <input
                                        className="form-control"
                                        placeholder="Ej: Portada de la invitación"
                                        value={altText}
                                        onChange={(e) =>
                                            setAltText(
                                                e.target.value
                                            )
                                        }
                                    />

                                </div>

                            </div>

                            <div className="tags_modal_actions">

                                <button
                                    className="tags_modal_btn tags_modal_btn_cancel"
                                    onClick={() =>
                                        setShowModal(false)
                                    }
                                >
                                    Cancelar
                                </button>

                                <button
                                    className="tags_btn"
                                    onClick={saveMedia}
                                    disabled={saving}
                                >
                                    {
                                        saving
                                            ? "Subiendo..."
                                            : "Subir Archivo"
                                    }
                                </button>

                            </div>

                        </div>

                    </div>
                )
            }

            <div
                style={{
                    minHeight: 200
                }}
            />

        </div>
    );
}