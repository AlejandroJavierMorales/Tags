"use client";

// =====================================
// PAGE CLIENT: Administrar ClientsReviews
// Descripción: Configura el formulario premium de reseñas y sus preguntas.
// =====================================

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaGoogle, FaLink, FaStar, FaTimes } from "react-icons/fa";

import showAlert from "@/app/components/showAlert";

import "@/app/styles/tagsModals.css";
import "@/app/styles/qr-page.css";
import TagsSpinner from "@/app/components/TagsSpinner";
import MediaUploader from "@/app/components/MediaUploader";
import Image from "next/image";
import "./clientReviewsGoogleConnect.css";

const emptyQuestion = {
    question_text: "",
    helper_text: "",
    rating_label_1: "Malo",
    rating_label_2: "Regular",
    rating_label_3: "Bueno",
    rating_label_4: "Muy bueno",
    rating_label_5: "Excelente",
    allow_comment: 1,
    comment_placeholder: "Contanos un poco más",
    is_required: 1,
    is_visible: 1,
    styles_json: {},
    settings_json: {
        showGoogleLogo: true,
        showClientLogo: true,
        googleLogoVariant: "full",
        themeCode: "default"
    }
};

export default function ClientReviewsAdminClient({
    businessId,
    qrCodeId,
    session,
    isAdmin
}) {
    const router =
        useRouter();

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [googleConnectOpen, setGoogleConnectOpen] = useState(false);
    const [googleConnectUrl, setGoogleConnectUrl] = useState("");
    const [googleConnecting, setGoogleConnecting] = useState(false);

    const [page, setPage] =
        useState(null);

    const [form, setForm] =
        useState(null);

    const [questions, setQuestions] =
        useState([]);

    const [summary, setSummary] =
        useState(null);

    const [drawerTab, setDrawerTab] =
        useState(null);

    const [themes, setThemes] = useState([]);

    const [responses, setResponses] = useState([]);
    const [responsesTotal, setResponsesTotal] = useState(0);
    const [responsesPage, setResponsesPage] = useState(1);
    const [responsesLoading, setResponsesLoading] = useState(false);

    const [reviewerMedia, setReviewerMedia] =
        useState([]);

    const [reviewerMediaLoading, setReviewerMediaLoading] =
        useState(false);

    const [responseFilters, setResponseFilters] =
        useState({
            q: "",
            rating: "",
            status: "",
            verified: "",
            isPublic: "",
            from: "",
            to: ""
        });



    const [mediaItems, setMediaItems] = useState([]);
    const [mediaLoading, setMediaLoading] = useState(false);
    const [uploadingMedia, setUploadingMedia] = useState(false);

    const [selectedResponse, setSelectedResponse] = useState(null);
    const [selectedMedia, setSelectedMedia] = useState(null);
    const [socialFormat, setSocialFormat] = useState("post");
    const [generatingSocialCard, setGeneratingSocialCard] =
        useState(false);

    useEffect(() => {
        load();
        loadThemes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [businessId, qrCodeId]);

    useEffect(() => {
        if (form?.id) {
            loadResponses();
            loadMedia();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        form?.id,
        responsesPage,
        responseFilters.q,
        responseFilters.rating,
        responseFilters.status,
        responseFilters.from,
        responseFilters.to,
        responseFilters.verified,
        responseFilters.isPublic
    ]);

    async function load() {
        setLoading(true);

        try {
            const res =
                await fetch(
                    `/api/client-reviews/admin/get?businessId=${businessId}&qrCodeId=${qrCodeId}`
                );

            const data =
                await res.json().catch(() => null);

            console.log("SUMMARY API:", data.summary);

            if (!res.ok) {
                throw new Error(
                    data?.error ||
                    "No se pudo cargar ClientsReviews"
                );
            }

            setPage(data.page || null);
            setForm(data.form || null);
            setQuestions(data.questions || []);
            setSummary(data.summary || null);

        } catch (err) {
            showAlert({
                title: "Error",
                text: err.message,
                icon: "error"
            });

        } finally {
            setLoading(false);
        }
    }

    async function loadThemes() {
        try {
            const res =
                await fetch("/api/qr-page/themes/list");

            const data =
                await res.json().catch(() => null);

            const rows =
                Array.isArray(data)
                    ? data
                    : Array.isArray(data?.data)
                        ? data.data
                        : Array.isArray(data?.themes)
                            ? data.themes
                            : [];

            setThemes(rows);

        } catch (err) {
            console.error("LOAD THEMES ERROR:", err);
            setThemes([]);
        }
    }

    function updateForm(field, value) {
        setForm(prev => ({
            ...prev,
            [field]: value
        }));
    }

    async function connectGooglePlace() {
        if (!form?.id || !googleConnectUrl.trim()) return;
        setGoogleConnecting(true);
        try {
            const response = await fetch("/api/client-reviews/admin/google-place", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, formId: form.id, url: googleConnectUrl }) });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.error || "No se pudo conectar con Google");
            setForm(current => ({ ...current, google_review_url: payload.googleReviewUrl, settings_json: { ...(current.settings_json || {}), googlePlace: payload.place } }));
            setGoogleConnectOpen(false);
            setGoogleConnectUrl("");
            showAlert({ title: "Google conectado", text: `Se identificó ${payload.place.name} y se generó el enlace para dejar reseñas.`, icon: "success" });
        } catch (error) { showAlert({ title: "No se pudo conectar", text: error.message, icon: "error" }); }
        finally { setGoogleConnecting(false); }
    }

    function updateResponseFilter(field, value) {
        setResponseFilters(prev => ({
            ...prev,
            [field]: value
        }));

        setResponsesPage(1);
    }

    function clearResponseFilters() {
        setResponseFilters({
            q: "",
            rating: "",
            status: "",
            from: "",
            to: ""
        });

        setResponsesPage(1);
    }

    async function loadResponses() {
        if (!form?.id) return;

        setResponsesLoading(true);

        try {
            const query = new URLSearchParams({
                businessId,
                formId: form.id,
                page: responsesPage,
                limit: 10,
                q: responseFilters.q || "",
                rating: responseFilters.rating || "",
                status: responseFilters.status || "",
                from: responseFilters.from || "",
                to: responseFilters.to || "",
                verified: responseFilters.verified,
                isPublic: responseFilters.isPublic,
            });

            const res = await fetch(
                `/api/client-reviews/admin/responses/list?${query}`
            );

            const data = await res.json().catch(() => null);

            console.log("RESPONSES API:", data);

            if (!res.ok) {
                throw new Error(
                    data?.error || "Error cargando reseñas"
                );
            }

            setResponses(data.data || []);
            setResponsesTotal(data.total || 0);

        } catch (err) {
            showAlert({
                title: "Error",
                text: err.message,
                icon: "error"
            });

        } finally {
            setResponsesLoading(false);
        }
    }

    async function changeResponseStatus(id, status) {
        const res = await fetch(
            "/api/client-reviews/admin/responses/status",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    id,
                    businessId,
                    status
                })
            }
        );

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            showAlert({
                title: "Error",
                text: data.error || "Error actualizando reseña",
                icon: "error"
            });
            return;
        }

        loadResponses();
    }

    async function changeResponsePublic(
        responseId,
        isPublic
    ) {

        try {

            const res =
                await fetch(
                    "/api/client-reviews/admin/responses/public",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({

                                id:
                                    responseId,

                                businessId,

                                is_public:
                                    isPublic ? 1 : 0
                            })
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {

                showAlert({
                    icon: "error",
                    title: "Error",
                    text:
                        data.error ||
                        "No se pudo actualizar la publicación."
                });

                return;
            }

            setResponses(previous =>
                previous.map(response =>
                    Number(response.id) === Number(responseId)
                        ? {
                            ...response,
                            is_public:
                                isPublic ? 1 : 0
                        }
                        : response
                )
            );

        } catch {

            showAlert({
                icon: "error",
                title: "Error",
                text:
                    "No se pudo actualizar la publicación."
            });

        }

    }

    async function deleteResponse(id) {
        const confirm = await showAlert({
            title: "Eliminar reseña",
            text: "Esta acción no se puede deshacer. ¿Continuar?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Eliminar",
            cancelButtonText: "Cancelar"
        });

        if (!confirm) return;

        const res = await fetch(
            "/api/client-reviews/admin/responses/delete",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    id,
                    businessId
                })
            }
        );

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            showAlert({
                title: "Error",
                text: data.error || "No se pudo eliminar",
                icon: "error"
            });
            return;
        }

        showAlert({
            title: "OK",
            text: "Reseña eliminada",
            icon: "success"
        });

        loadResponses();
    }

    function exportCsv() {
        if (!form?.id) return;

        const query = new URLSearchParams({
            businessId,
            formId: form.id,
            from: responseFilters.from || "",
            to: responseFilters.to || ""
        });

        window.open(
            `/api/client-reviews/admin/export/csv?${query}`,
            "_blank"
        );
    }

    async function loadMedia() {
        if (!form?.id) return;

        setMediaLoading(true);

        try {
            const res = await fetch(
                `/api/client-reviews/admin/media/list?businessId=${businessId}&formId=${form.id}`
            );

            const data = await res.json().catch(() => null);

            if (!res.ok) {
                throw new Error(
                    data?.error || "Error cargando imágenes"
                );
            }

            setMediaItems(data.data || []);

        } catch (err) {
            showAlert({
                title: "Error",
                text: err.message,
                icon: "error"
            });

        } finally {
            setMediaLoading(false);
        }
    }

    async function uploadSocialMedia(file) {
        if (!file || !form?.id) return;

        setUploadingMedia(true);

        try {
            const formData = new FormData();

            formData.append("businessId", businessId);
            formData.append("formId", form.id);
            formData.append("type", "social_image");
            formData.append("file", file);

            const res = await fetch(
                "/api/client-reviews/admin/media/upload",
                {
                    method: "POST",
                    body: formData
                }
            );

            const data = await res.json().catch(() => null);

            if (!res.ok) {
                throw new Error(
                    data?.error || "Error subiendo imagen"
                );
            }

            showAlert({
                title: "Imagen cargada",
                text: "La imagen quedó disponible para piezas Instagram.",
                icon: "success"
            });

            loadMedia();

        } catch (err) {
            showAlert({
                title: "Error",
                text: err.message,
                icon: "error"
            });

        } finally {
            setUploadingMedia(false);
        }
    }

    async function deleteMedia(id) {
        const confirm = await showAlert({
            title: "Eliminar imagen",
            text: "¿Querés eliminar esta imagen de la biblioteca?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Eliminar",
            cancelButtonText: "Cancelar"
        });

        if (!confirm) return;

        const res = await fetch(
            "/api/client-reviews/admin/media/delete",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    id,
                    businessId
                })
            }
        );

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            showAlert({
                title: "Error",
                text: data.error || "No se pudo eliminar",
                icon: "error"
            });
            return;
        }

        loadMedia();
    }

    function updateQuestion(index, field, value) {
        setQuestions(prev =>
            prev.map((q, i) =>
                i === index
                    ? {
                        ...q,
                        [field]: value
                    }
                    : q
            )
        );
    }

    function addQuestion() {
        setQuestions(prev => [
            ...prev,
            {
                ...emptyQuestion,
                sort_order: prev.length + 1
            }
        ]);
    }

    async function removeQuestion(index) {
        const confirm =
            await showAlert({
                title: "Eliminar pregunta",
                text: "¿Querés eliminar esta pregunta?",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Eliminar",
                cancelButtonText: "Cancelar"
            });

        if (!confirm) return;

        setQuestions(prev =>
            prev.filter((_, i) => i !== index)
        );
    }

    function moveQuestion(index, direction) {
        setQuestions(prev => {
            const copy = [...prev];

            const target =
                index + direction;

            if (
                target < 0 ||
                target >= copy.length
            ) {
                return copy;
            }

            const current =
                copy[index];

            copy[index] =
                copy[target];

            copy[target] =
                current;

            return copy;
        });
    }

    async function saveForm() {
        if (!form?.id) return;

        setSaving(true);

        try {
            const res =
                await fetch(
                    "/api/client-reviews/admin/update-form",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            formId: form.id,
                            businessId,
                            title: form.title,
                            subtitle: form.subtitle,
                            logo_url: form.logo_url,
                            google_review_url: form.google_review_url,
                            positive_threshold: form.positive_threshold,
                            success_title: form.success_title,
                            success_message: form.success_message,
                            google_cta_title: form.google_cta_title,
                            google_cta_text: form.google_cta_text,
                            google_cta_button_label: form.google_cta_button_label,
                            private_feedback_title: form.private_feedback_title,
                            private_feedback_text: form.private_feedback_text,
                            styles_json: form.styles_json || {},
                            settings_json: form.settings_json || {},
                            theme_id: form.theme_id || null,
                        })
                    }
                );

            const data =
                await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "No se pudo guardar la configuración"
                );
            }

            showAlert({
                title: "OK",
                text: "Configuración guardada",
                icon: "success"
            });

            load();

        } catch (err) {
            showAlert({
                title: "Error",
                text: err.message,
                icon: "error"
            });

        } finally {
            setSaving(false);
        }
    }

    async function saveQuestions() {
        if (!form?.id) return;

        const validQuestions =
            questions.filter(q =>
                String(q.question_text || "").trim()
            );

        if (!validQuestions.length) {
            showAlert({
                title: "Preguntas requeridas",
                text: "Debe existir al menos una pregunta visible.",
                icon: "error"
            });

            return;
        }

        setSaving(true);

        try {
            const res =
                await fetch(
                    "/api/client-reviews/admin/questions/save",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            formId: form.id,
                            businessId,
                            questions: validQuestions
                        })
                    }
                );

            const data =
                await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "No se pudieron guardar las preguntas"
                );
            }

            showAlert({
                title: "OK",
                text: "Preguntas guardadas",
                icon: "success"
            });

            load();

        } catch (err) {
            showAlert({
                title: "Error",
                text: err.message,
                icon: "error"
            });

        } finally {
            setSaving(false);
        }
    }

    function openPublicPage() {
        if (!page?.slug) {
            showAlert({
                title: "Sin URL pública",
                text: "No se encontró el slug público.",
                icon: "info"
            });

            return;
        }

        window.open(
            `/p/${page.slug}`,
            "_blank"
        );
    }

    if (loading) {
        return (
            <div className="qr_page_builder">
                <div className="qr_page_card">
                    <TagsSpinner />
                </div>
            </div>
        );
    }

    if (!form) {
        return (
            <div className="qr_page_builder">
                <div className="qr_page_card">
                    <h1 className="qr_page_title">
                        ClientsReviews no encontrado
                    </h1>

                    <button
                        className="qr_page_btn secondary mt-3"
                        onClick={() =>
                            router.push(
                                `/dashboard/businesses/${businessId}`
                            )
                        }
                    >
                        Volver
                    </button>
                </div>
            </div>
        );
    }

    /*  Helpers */

    function restoreDefaultReviewsTheme() {
        updateForm("styles_json", {});
        updateForm("settings_json", {
            showGoogleLogo: true,
            showClientLogo: true,
            googleLogoVariant: "full",
            themeCode: "default"
        });

        showAlert({
            title: "Plantilla restaurada",
            text: "Se restauró la apariencia por defecto. Recordá guardar.",
            icon: "success"
        });
    }

    function getSettings() {
        if (!form?.settings_json) return {};

        if (typeof form.settings_json === "object") {
            return form.settings_json;
        }

        try {
            return JSON.parse(form.settings_json);
        } catch {
            return {};
        }
    }

    function updateSetting(key, value) {
        const settings = getSettings();

        updateForm("settings_json", {
            ...settings,
            [key]: value
        });
    }

    async function loadReviewerMedia(responseId) {
        if (!form?.id || !responseId) return;

        setReviewerMediaLoading(true);

        try {
            const res = await fetch(
                `/api/client-reviews/admin/media/list?businessId=${businessId}&formId=${form.id}&responseId=${responseId}&uploadedBy=reviewer`
            );

            const data = await res.json().catch(() => null);

            if (!res.ok) {
                throw new Error(
                    data?.error || "Error cargando imágenes de la reseña"
                );
            }

            setReviewerMedia(data.data || []);

        } catch (err) {
            showAlert({
                title: "Error",
                text: err.message,
                icon: "error"
            });

        } finally {
            setReviewerMediaLoading(false);
        }
    }

    async function generateInstagramPiece() {

        console.log("GENERATE SOCIAL CARD CLICK", {
            selectedResponse,
            selectedMedia,
            socialFormat
        });

        if (!selectedResponse?.id) {
            showAlert({
                title: "Reseña requerida",
                text: "Primero seleccioná una reseña.",
                icon: "info"
            });
            return;
        }

        setGeneratingSocialCard(true);

        try {
            const query =
                new URLSearchParams({
                    responseId: selectedResponse.id,
                    businessId,
                    format: socialFormat,
                    mediaId: selectedMedia?.id || ""
                });

            const url =
                `/api/client-reviews/admin/social-card/create?${query}`;

            const res =
                await fetch(url);

            if (!res.ok) {
                const data =
                    await res.json().catch(() => ({}));

                throw new Error(
                    data.error ||
                    "No se pudo generar la pieza"
                );
            }

            const blob =
                await res.blob();

            console.log("SOCIAL CARD BLOB:", {
                type: blob.type,
                size: blob.size
            });

            if (!blob.size) {
                throw new Error(
                    "La imagen generada está vacía"
                );
            }

            const downloadUrl =
                URL.createObjectURL(blob);

            const a =
                document.createElement("a");

            a.href =
                downloadUrl;

            a.download =
                `review-${selectedResponse.id}-${socialFormat}.png`;

            document.body.appendChild(a);

            a.click();

            a.remove();

            URL.revokeObjectURL(downloadUrl);

        } catch (err) {

            console.error(
                "GENERATE SOCIAL CARD ERROR:",
                err
            );

            showAlert({
                title: "Error",
                text: err.message,
                icon: "error"
            });

        } finally {

            setGeneratingSocialCard(false);
        }
    }

    function exportPdf() {
        if (!form?.id) return;

        const query = new URLSearchParams({
            businessId,
            formId: form.id,
            q: responseFilters.q || "",
            rating: responseFilters.rating || "",
            status: responseFilters.status || "",
            from: responseFilters.from || "",
            to: responseFilters.to || ""
        });

        window.open(
            `/api/client-reviews/admin/export/pdf?${query}`,
            "_blank"
        );
    }
    const ratingsSummary =
        summary?.ratings || {
            5: 0,
            4: 0,
            3: 0,
            2: 0,
            1: 0
        };

    const googleSummary =
        summary?.google || {
            prompt_shown: 0,
            clicked: summary?.google_clicks || 0,
            conversion_rate: 0
        };

    const latestResponses =
        summary?.latest_responses || [];

    const last30Days =
        summary?.last_30_days || [];

    const chartMax =
        Math.max(
            1,
            ...last30Days.map(day =>
                Number(day.total || 0)
            )
        );

    /*  UI  */

    return (
        <div className="client_reviews_admin">

            <div className="qr_page_card">

                <div className="d-flex justify-content-between align-items-center gap-3 flex-wrap">

                    <div className="d-flex align-items-center gap-2">

                        <Image
                            src="/assets/images/logos/logo_google_solo_g.webp"
                            alt="Google"
                            width={60}
                            height={60}
                            style={{
                                objectFit: "contain"
                            }}
                        />

                        <div>
                            <h1 className="qr_page_title m-0">
                                Reseñas de Clientes
                            </h1>

                            <p className="qr_page_subtitle m-0">
                                Configurá el formulario de reseñas y feedback.
                            </p>
                        </div>

                    </div>

                    <div className="client_reviews_tabs">

                        <button
                            type="button"
                            className="qr_page_btn secondary"
                            onClick={() =>
                                router.push(
                                    `/dashboard/businesses/${businessId}`
                                )
                            }
                        >
                            Volver
                        </button>

                        <button
                            type="button"
                            className="qr_page_btn success"
                            onClick={openPublicPage}
                        >
                            Ver Página Pública
                        </button>

                    </div>

                </div>

                <div className="qr_page_card mt-4">
                    <div className="d-flex gap-2 flex-wrap">
                        {[
                            ["summary", "Resumen"],
                            ["config", "Configuración"],
                            ["questions", "Preguntas"],
                            ["responses", "Reseñas"],
                            ["instagram", "Piezas Instagram"]
                        ].map(([key, label]) => (
                            <button
                                key={key}
                                type="button"
                                className={
                                    drawerTab === key
                                        ? "qr_page_btn success"
                                        : "qr_page_btn secondary"
                                }
                                onClick={() => {
                                    if (key === "summary") {
                                        setDrawerTab(null);
                                        return;
                                    }

                                    setDrawerTab(key);
                                }}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="client_reviews_kpi_grid mt-4">


                    <div className="qr_page_status">
                        <strong>Respuestas</strong>
                        <br />
                        {summary?.total_responses || 0}
                    </div>



                    <div className="qr_page_status">
                        <strong>Promedio</strong>
                        <br />
                        {summary?.average_rating
                            ? Number(summary.average_rating).toFixed(2)
                            : "-"}
                    </div>



                    <div className="qr_page_status">
                        <strong>Clicks Google</strong>
                        <br />
                        {summary?.google_clicks || 0}
                    </div>


                </div>

                <div className="client_reviews_summary_grid mt-4">

                    <div className="qr_page_card">
                        <h3>Distribución por estrellas</h3>

                        {[5, 4, 3, 2, 1].map(star => {
                            const count =
                                Number(ratingsSummary[star] || 0);

                            const total =
                                Number(summary?.total_responses || 0);

                            const percent =
                                total > 0
                                    ? Math.round((count / total) * 100)
                                    : 0;

                            return (
                                <div
                                    key={star}
                                    className="client_reviews_rating_row"
                                >
                                    <span>{star} ⭐</span>

                                    <div className="client_reviews_rating_bar">
                                        <div
                                            className="client_reviews_rating_fill"
                                            style={{
                                                width: `${percent}%`
                                            }}
                                        />
                                    </div>

                                    <strong>{count}</strong>
                                </div>
                            );
                        })}
                    </div>

                    <div className="qr_page_card">
                        <h3>Embudo Google</h3>

                        <div className="client_reviews_funnel">
                            <div>
                                <strong>{summary?.total_responses || 0}</strong>
                                <span>Respuestas</span>
                            </div>

                            <div>
                                <strong>{googleSummary.prompt_shown || 0}</strong>
                                <span>Invitados a Google</span>
                            </div>

                            <div>
                                <strong>{googleSummary.clicked || 0}</strong>
                                <span>Clicks a Google</span>
                            </div>

                            <div>
                                <strong>{googleSummary.conversion_rate || 0}%</strong>
                                <span>Conversión</span>
                            </div>
                        </div>
                    </div>
                    <div className="qr_page_card mt-4">
                        <h3>Evolución últimos 30 días</h3>

                        <p className="qr_page_subtitle">
                            Cantidad de reseñas recibidas por día.
                        </p>

                        <div className="client_reviews_timeline_chart">
                            {last30Days.map(day => {
                                const total =
                                    Number(day.total || 0);

                                const height =
                                    chartMax > 0
                                        ? Math.max(
                                            8,
                                            Math.round((total / chartMax) * 120)
                                        )
                                        : 8;

                                return (
                                    <div
                                        key={day.date}
                                        className="client_reviews_timeline_item"
                                        title={`${day.date}: ${total} reseñas`}
                                    >
                                        <div className="client_reviews_timeline_value">
                                            {total}
                                        </div>

                                        <div
                                            className="client_reviews_timeline_bar"
                                            style={{
                                                height: `${height}px`
                                            }}
                                        />

                                        <small>
                                            {new Date(day.date)
                                                .toLocaleDateString("es-AR", {
                                                    day: "2-digit",
                                                    month: "2-digit"
                                                })}
                                        </small>
                                    </div>
                                );
                            })}

                            {!last30Days.length && (
                                <div className="qr_page_status">
                                    Todavía no hay datos suficientes para mostrar evolución.
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                <div className="qr_page_card mt-4">
                    <h3>Últimas reseñas</h3>

                    <div className="tags_table_wrapper mt-3">
                        <table className="tags_table tags_text_normal">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Cliente</th>
                                    <th>Rating</th>
                                    <th>Comentario</th>
                                </tr>
                            </thead>

                            <tbody>
                                {latestResponses.map(response => (
                                    <tr key={response.id}>
                                        <td>
                                            {response.created_at
                                                ? new Date(response.created_at)
                                                    .toLocaleDateString("es-AR")
                                                : "-"}
                                        </td>

                                        <td>
                                            {response.customer_name || "Cliente"}
                                        
                                        </td>

                                        <td>
                                            ⭐ {Number(response.average_rating || 0).toFixed(1)}
                                        </td>

                                        <td>
                                            {response.general_comment || "-"}
                                        </td>
                                    </tr>
                                ))}

                                {!latestResponses.length && (
                                    <tr>
                                        <td colSpan={4}>
                                            Todavía no hay reseñas recientes.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>



            {/* DRAWER */}
            {drawerTab && (
                <div
                    className="client_reviews_drawer_overlay"
                    onClick={() => setDrawerTab(null)}
                >
                    <div
                        className="client_reviews_drawer"
                        onClick={(e) => e.stopPropagation()}
                    >

                        <div className="client_reviews_drawer_header">
                            <h2>
                                {drawerTab === "config" && "Configuración"}
                                {drawerTab === "questions" && "Preguntas"}
                                {drawerTab === "responses" && "Reseñas"}
                                {drawerTab === "instagram" && "Piezas Instagram"}
                                {drawerTab === "reports" && "Reportes"}
                            </h2>

                            <button
                                type="button"
                                className="client_reviews_drawer_close"
                                onClick={() => setDrawerTab(null)}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="client_reviews_drawer_body">
                            {drawerTab === "config" && (
                                <>
                                    {/* configuración */}
                                    <div className="qr_page_card mt-4">
                                        <h3>Configuración General</h3>
                                        <p>Cargá tu Logo, elegí la paleta de colores y título de tu página, defini la url de reseñas de Google.</p>

                                        <div className="qr_page_field mt-3">
                                            <label>Tema visual</label>

                                            <div className="qr_page_field mt-3">
                                                <label>Tema visual</label>

                                                <div className="client_reviews_theme_scroller">

                                                    <button
                                                        type="button"
                                                        className={
                                                            !form.theme_id
                                                                ? "client_reviews_theme_card selected"
                                                                : "client_reviews_theme_card"
                                                        }
                                                        onClick={() =>
                                                            updateForm("theme_id", null)
                                                        }
                                                    >
                                                        <div className="qr_page_theme_preview">
                                                            <div className="qr_page_theme_preview_header" />
                                                            <div className="qr_page_theme_preview_card" />
                                                            <div className="qr_page_theme_preview_button" />
                                                        </div>

                                                        <strong>Default Reviews</strong>
                                                        <small>Estilo base del módulo de reseñas.</small>
                                                    </button>

                                                    {themes.map((theme) => {
                                                        const tokens =
                                                            theme.css_tokens ||
                                                            theme.tokens_json ||
                                                            {};

                                                        const selected =
                                                            Number(form.theme_id || 0) === Number(theme.id);

                                                        return (
                                                            <button
                                                                key={theme.id}
                                                                type="button"
                                                                className={
                                                                    selected
                                                                        ? "client_reviews_theme_card selected"
                                                                        : "client_reviews_theme_card"
                                                                }
                                                                onClick={() =>
                                                                    updateForm("theme_id", theme.id)
                                                                }
                                                            >
                                                                <div
                                                                    className="qr_page_theme_preview"
                                                                    style={{
                                                                        background:
                                                                            tokens["--qr-bg"] || "#ffffff"
                                                                    }}
                                                                >
                                                                    <div
                                                                        className="qr_page_theme_preview_header"
                                                                        style={{
                                                                            background:
                                                                                tokens["--qr-surface"] || "#ffffff"
                                                                        }}
                                                                    />

                                                                    <div
                                                                        className="qr_page_theme_preview_card"
                                                                        style={{
                                                                            background:
                                                                                tokens["--qr-surface"] || "#ffffff",
                                                                            borderColor:
                                                                                tokens["--qr-border"] || "#e5e7eb"
                                                                        }}
                                                                    />

                                                                    <div
                                                                        className="qr_page_theme_preview_button"
                                                                        style={{
                                                                            background:
                                                                                tokens["--qr-primary"] || "#111827"
                                                                        }}
                                                                    />
                                                                </div>

                                                                <strong>{theme.name}</strong>
                                                                <small>{theme.description}</small>
                                                            </button>
                                                        );
                                                    })}

                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            className="qr_page_upload_btn mt-4"
                                            onClick={restoreDefaultReviewsTheme}
                                        >
                                            Restaurar apariencia default
                                        </button>

                                        <div className="qr_page_field mt-3">
                                            <label>Título</label>
                                            <input
                                                className="qr_page_input"
                                                value={form.title || ""}
                                                onChange={(e) =>
                                                    updateForm("title", e.target.value)
                                                }
                                            />
                                        </div>

                                        <div className="qr_page_field mt-3">
                                            <label>Subtítulo</label>
                                            <textarea
                                                className="qr_page_input"
                                                rows={3}
                                                value={form.subtitle || ""}
                                                onChange={(e) =>
                                                    updateForm("subtitle", e.target.value)
                                                }
                                            />
                                        </div>

                                        <div className="qr_page_card mt-4">
                                            <h2 className="qr_page_section_title">
                                                Logos y apariencia
                                            </h2>

                                            <label className="d-block mt-3">
                                                <input
                                                    type="checkbox"
                                                    checked={getSettings().showGoogleLogo !== false}
                                                    onChange={(e) =>
                                                        updateSetting("showGoogleLogo", e.target.checked)
                                                    }
                                                />
                                                {" "}
                                                Mostrar logo de Google
                                            </label>

                                            <label className="d-block mt-3">
                                                <input
                                                    type="checkbox"
                                                    checked={getSettings().showClientLogo !== false}
                                                    onChange={(e) =>
                                                        updateSetting("showClientLogo", e.target.checked)
                                                    }
                                                />
                                                {" "}
                                                Mostrar logo del cliente
                                            </label>

                                            <div className="qr_page_field mt-3">
                                                <label>Logo Google</label>

                                                <select
                                                    className="qr_page_input"
                                                    value={getSettings().googleLogoVariant || "full"}
                                                    onChange={(e) =>
                                                        updateSetting("googleLogoVariant", e.target.value)
                                                    }
                                                >
                                                    <option value="full">Logo Google</option>
                                                    <option value="g">Logo G</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="qr_page_field mt-3">
                                            <label>Logo del cliente</label>

                                            <MediaUploader
                                                businessId={businessId}
                                                value={form.logo_url || ""}
                                                folder="client-reviews"
                                                accept="image/*"
                                                label="Subir logo"
                                                onChange={(media) =>
                                                    updateForm(
                                                        "logo_url",
                                                        media?.url || null
                                                    )
                                                }
                                            />
                                        </div>

                                        <div className="qr_page_field mt-3">
                                            <label>Link Google Reviews</label>
                                            <input
                                                className="qr_page_input"
                                                value={form.google_review_url || ""}
                                                onChange={(e) =>
                                                    updateForm("google_review_url", e.target.value)
                                                }
                                                placeholder="https://g.page/r/..."
                                            />
                                            <div className="tags_reviews_google_connect">
                                                <div>
                                                    <button type="button" onClick={() => { setGoogleConnectUrl(form.google_review_url || ""); setGoogleConnectOpen(true); }}><FaLink /> Conectar con Google</button>
                                                    <small>{form.settings_json?.googlePlace?.name ? `Conectado: ${form.settings_json.googlePlace.name}` : "Pegá una URL de Google Maps y Tags generará el enlace automáticamente."}</small>
                                                </div>
                                                {form.settings_json?.googlePlace?.photoName && <small>Google encontró una foto principal disponible para este negocio.</small>}
                                            </div>
                                        </div>


                                        <div className="qr_page_field mt-3">
                                            <label>Umbral para invitar a Google</label>
                                            <select
                                                className="qr_page_input"
                                                value={form.positive_threshold || 4}
                                                onChange={(e) =>
                                                    updateForm(
                                                        "positive_threshold",
                                                        Number(e.target.value)
                                                    )
                                                }
                                            >
                                                <option value={3}>3 estrellas o más</option>
                                                <option value={4}>4 estrellas o más</option>
                                                <option value={5}>5 estrellas</option>
                                            </select>
                                        </div>

                                        <div className="qr_page_actions mt-4">
                                            <button
                                                type="button"
                                                className="qr_page_btn success"
                                                disabled={saving}
                                                onClick={saveForm}
                                            >
                                                Guardar configuración
                                            </button>
                                        </div>

                                        {googleConnectOpen && <div className="tags_reviews_google_connect_backdrop" onMouseDown={() => !googleConnecting && setGoogleConnectOpen(false)}><section className="tags_reviews_google_connect_modal" onMouseDown={event => event.stopPropagation()}><header><div><span>GOOGLE REVIEWS</span><h3>Conectar con Google</h3></div><button type="button" aria-label="Cerrar" onClick={() => !googleConnecting && setGoogleConnectOpen(false)}><FaTimes /></button></header><div className="tags_reviews_google_connect_body"><p>Buscá tu negocio en Google y pegá la URL de la ficha.</p><ol className="tags_reviews_google_connect_steps"><li>Buscá tu negocio en Google.</li><li>Abrí la ficha de tu negocio.</li><li>Copiá la URL del navegador.</li><li>Pegala acá.</li></ol><label>URL de Google Maps<input value={googleConnectUrl} onChange={event => setGoogleConnectUrl(event.target.value)} placeholder="https://www.google.com/search?q=..." autoFocus /></label><div className="tags_reviews_google_connect_actions"><button type="button" disabled={googleConnecting} onClick={() => setGoogleConnectOpen(false)}>Cancelar</button><button type="button" className="primary" disabled={googleConnecting || !googleConnectUrl.trim()} onClick={connectGooglePlace}>{googleConnecting ? "Conectando..." : "Conectar"}</button></div></div></section></div>}

                                    </div>


                                    <div className="qr_page_card mt-4">

                                        <h2 className="qr_page_section_title">
                                            Mensajes finales
                                        </h2>

                                        <div className="qr_page_field mt-3">
                                            <label>Título de gracias</label>
                                            <input
                                                className="qr_page_input"
                                                value={form.success_title || ""}
                                                onChange={(e) =>
                                                    updateForm("success_title", e.target.value)
                                                }
                                            />
                                        </div>

                                        <div className="qr_page_field mt-3">
                                            <label>Mensaje de gracias</label>
                                            <textarea
                                                className="qr_page_input"
                                                rows={3}
                                                value={form.success_message || ""}
                                                onChange={(e) =>
                                                    updateForm("success_message", e.target.value)
                                                }
                                            />
                                        </div>

                                        <div className="qr_page_field mt-3">
                                            <label>Título CTA Google</label>
                                            <input
                                                className="qr_page_input"
                                                value={form.google_cta_title || ""}
                                                onChange={(e) =>
                                                    updateForm("google_cta_title", e.target.value)
                                                }
                                            />
                                        </div>

                                        <div className="qr_page_field mt-3">
                                            <label>Texto CTA Google</label>
                                            <textarea
                                                className="qr_page_input"
                                                rows={3}
                                                value={form.google_cta_text || ""}
                                                onChange={(e) =>
                                                    updateForm("google_cta_text", e.target.value)
                                                }
                                            />
                                        </div>

                                        <div className="qr_page_field mt-3">
                                            <label>Texto botón Google</label>
                                            <input
                                                className="qr_page_input"
                                                value={form.google_cta_button_label || ""}
                                                onChange={(e) =>
                                                    updateForm("google_cta_button_label", e.target.value)
                                                }
                                            />
                                        </div>

                                        <div className="qr_page_field mt-3">
                                            <label>Título feedback privado</label>
                                            <input
                                                className="qr_page_input"
                                                value={form.private_feedback_title || ""}
                                                onChange={(e) =>
                                                    updateForm("private_feedback_title", e.target.value)
                                                }
                                            />
                                        </div>

                                        <div className="qr_page_field mt-3">
                                            <label>Texto feedback privado</label>
                                            <textarea
                                                className="qr_page_input"
                                                rows={3}
                                                value={form.private_feedback_text || ""}
                                                onChange={(e) =>
                                                    updateForm("private_feedback_text", e.target.value)
                                                }
                                            />
                                        </div>

                                        <div className="qr_page_actions mt-4">
                                            <button
                                                type="button"
                                                className="qr_page_btn success"
                                                disabled={saving}
                                                onClick={saveForm}
                                            >
                                                Guardar mensajes
                                            </button>
                                        </div>

                                    </div>
                                </>
                            )}

                            {drawerTab === "questions" && (
                                <>
                                    {/*preguntas */}
                                    <div className="qr_page_card mt-4">

                                        <h3>Preguntas para tus clientes</h3>
                                        <p>Diseña cada una de las preguntas que querés que tus clientes respondan. Agregá, eliminá y cambiá de ubicación cada una de ellas.</p>

                                        <div className="d-flex justify-content-between align-items-center gap-3 flex-wrap">

                                            <button
                                                type="button"
                                                className="qr_page_btn secondary"
                                                onClick={addQuestion}
                                            >
                                                + Agregar pregunta
                                            </button>

                                        </div>

                                        {questions.map((question, index) => (

                                            <div
                                                key={question.id || index}
                                                className="qr_page_card mt-3"
                                                style={{
                                                    border: "1px solid #e5e7eb"
                                                }}
                                            >

                                                <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap">

                                                    <strong>
                                                        Pregunta {index + 1}
                                                    </strong>

                                                    <div className="d-flex gap-2">

                                                        <button
                                                            type="button"
                                                            className="qr_page_btn secondary"
                                                            onClick={() =>
                                                                moveQuestion(index, -1)
                                                            }
                                                        >
                                                            ↑
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="qr_page_btn secondary"
                                                            onClick={() =>
                                                                moveQuestion(index, 1)
                                                            }
                                                        >
                                                            ↓
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="qr_page_btn secondary"
                                                            onClick={() =>
                                                                removeQuestion(index)
                                                            }
                                                        >
                                                            Eliminar
                                                        </button>

                                                    </div>

                                                </div>

                                                <div className="qr_page_field mt-3">
                                                    <label>Texto de la pregunta</label>
                                                    <input
                                                        className="qr_page_input"
                                                        value={question.question_text || ""}
                                                        onChange={(e) =>
                                                            updateQuestion(
                                                                index,
                                                                "question_text",
                                                                e.target.value
                                                            )
                                                        }
                                                    />
                                                </div>

                                                <div className="qr_page_field mt-3">
                                                    <label>Texto de ayuda</label>
                                                    <input
                                                        className="qr_page_input"
                                                        value={question.helper_text || ""}
                                                        onChange={(e) =>
                                                            updateQuestion(
                                                                index,
                                                                "helper_text",
                                                                e.target.value
                                                            )
                                                        }
                                                    />
                                                </div>

                                                <div className="row mt-3">

                                                    {[1, 2, 3, 4, 5].map(n => (
                                                        <div
                                                            className="col-12 col-md"
                                                            key={n}
                                                        >
                                                            <label>
                                                                <FaStar
                                                                    style={{
                                                                        color: "#fbbc04",
                                                                        marginRight: 4
                                                                    }}
                                                                />
                                                                {n}
                                                            </label>

                                                            <input
                                                                className="qr_page_input"
                                                                value={
                                                                    question[`rating_label_${n}`] || ""
                                                                }
                                                                onChange={(e) =>
                                                                    updateQuestion(
                                                                        index,
                                                                        `rating_label_${n}`,
                                                                        e.target.value
                                                                    )
                                                                }
                                                            />
                                                        </div>
                                                    ))}

                                                </div>

                                                <div className="qr_page_field mt-3">
                                                    <label>Placeholder comentario</label>
                                                    <input
                                                        className="qr_page_input"
                                                        value={question.comment_placeholder || ""}
                                                        onChange={(e) =>
                                                            updateQuestion(
                                                                index,
                                                                "comment_placeholder",
                                                                e.target.value
                                                            )
                                                        }
                                                    />
                                                </div>

                                                <div className="d-flex gap-3 mt-3 flex-wrap">

                                                    <label>
                                                        <input
                                                            type="checkbox"
                                                            checked={Number(question.allow_comment) === 1}
                                                            onChange={(e) =>
                                                                updateQuestion(
                                                                    index,
                                                                    "allow_comment",
                                                                    e.target.checked ? 1 : 0
                                                                )
                                                            }
                                                        />
                                                        {" "}
                                                        Permitir comentario
                                                    </label>

                                                    <label>
                                                        <input
                                                            type="checkbox"
                                                            checked={Number(question.is_required) === 1}
                                                            onChange={(e) =>
                                                                updateQuestion(
                                                                    index,
                                                                    "is_required",
                                                                    e.target.checked ? 1 : 0
                                                                )
                                                            }
                                                        />
                                                        {" "}
                                                        Obligatoria
                                                    </label>

                                                    <label>
                                                        <input
                                                            type="checkbox"
                                                            checked={Number(question.is_visible) === 1}
                                                            onChange={(e) =>
                                                                updateQuestion(
                                                                    index,
                                                                    "is_visible",
                                                                    e.target.checked ? 1 : 0
                                                                )
                                                            }
                                                        />
                                                        {" "}
                                                        Visible
                                                    </label>

                                                </div>

                                            </div>

                                        ))}

                                        <div className="qr_page_actions mt-4">

                                            <button
                                                type="button"
                                                className="qr_page_btn success"
                                                disabled={saving}
                                                onClick={saveQuestions}
                                            >
                                                Guardar preguntas
                                            </button>

                                        </div>

                                    </div>

                                </>
                            )}

                            {drawerTab === "responses" && (
                                <>
                                    {/* Reseñas Recibidas */}
                                    <div className="qr_page_card mt-4">

                                        <h3>Filtrar reseñas</h3>
                                        <p>Buscá, filtrá y exportá las opiniones recibidas.</p>

                                        <div className="d-flex justify-content-between align-items-center gap-3 flex-wrap">

                                            <div >

                                                <button
                                                    type="button"
                                                    className="qr_page_btn secondary m-2"
                                                    onClick={exportCsv}
                                                >
                                                    CSV
                                                </button>

                                                <button
                                                    type="button"
                                                    className="qr_page_btn success"
                                                    onClick={exportPdf}
                                                >
                                                    PDF
                                                </button>
                                            </div>

                                        </div>

                                        <div className="row mt-3">

                                            <div className="col-12 col-md-3 mb-2">
                                                <input
                                                    className="qr_page_input"
                                                    placeholder="Buscar"
                                                    value={responseFilters.q}
                                                    onChange={(e) =>
                                                        updateResponseFilter("q", e.target.value)
                                                    }
                                                />
                                            </div>

                                            <div className="col-6 col-md-2 mb-2">
                                                <select
                                                    className="qr_page_input"
                                                    value={responseFilters.rating}
                                                    onChange={(e) =>
                                                        updateResponseFilter("rating", e.target.value)
                                                    }
                                                >
                                                    <option value="">Rating</option>
                                                    <option value="5">5 estrellas</option>
                                                    <option value="4">4 estrellas</option>
                                                    <option value="3">3 estrellas</option>
                                                    <option value="2">2 estrellas</option>
                                                    <option value="1">1 estrella</option>
                                                </select>
                                            </div>

                                            <div className="col-6 col-md-2 mb-2">
                                                <select
                                                    className="qr_page_input"
                                                    value={responseFilters.status}
                                                    onChange={(e) =>
                                                        updateResponseFilter("status", e.target.value)
                                                    }
                                                >
                                                    <option value="">Estado</option>
                                                    <option value="new">Nueva</option>
                                                    <option value="reviewed">Revisada</option>
                                                    <option value="archived">Archivada</option>
                                                </select>
                                            </div>

                                            <div className="col-6 col-md-2 mb-2">

                                                <select
                                                    className="qr_page_input"
                                                    value={responseFilters.verified}
                                                    onChange={(e) =>
                                                        updateResponseFilter(
                                                            "verified",
                                                            e.target.value
                                                        )
                                                    }
                                                >

                                                    <option value="">
                                                        Compra
                                                    </option>

                                                    <option value="verified">
                                                        Verificadas
                                                    </option>

                                                    <option value="unverified">
                                                        No verificadas
                                                    </option>

                                                </select>

                                            </div>

                                            <div className="col-6 col-md-2 mb-2">

                                                <select
                                                    className="qr_page_input"
                                                    value={responseFilters.isPublic}
                                                    onChange={(e) =>
                                                        updateResponseFilter(
                                                            "isPublic",
                                                            e.target.value
                                                        )
                                                    }
                                                >

                                                    <option value="">
                                                        Publicación
                                                    </option>

                                                    <option value="public">
                                                        Públicas
                                                    </option>

                                                    <option value="private">
                                                        No públicas
                                                    </option>

                                                </select>

                                            </div>

                                            <div className="col-6 col-md-2 mb-2">
                                                <input
                                                    type="date"
                                                    className="qr_page_input"
                                                    value={responseFilters.from}
                                                    onChange={(e) =>
                                                        updateResponseFilter("from", e.target.value)
                                                    }
                                                />
                                            </div>

                                            <div className="col-6 col-md-2 mb-2">
                                                <input
                                                    type="date"
                                                    className="qr_page_input"
                                                    value={responseFilters.to}
                                                    onChange={(e) =>
                                                        updateResponseFilter("to", e.target.value)
                                                    }
                                                />
                                            </div>

                                        </div>

                                        {responsesLoading ? (
                                            <div className="mt-4">
                                                <TagsSpinner />
                                            </div>
                                        ) : (
                                            <div className="tags_table_wrapper mt-3">

                                                <table className="tags_table tags_text_normal">

                                                    <thead>
                                                        <tr>
                                                            <th>Fecha</th>
                                                            <th>Cliente</th>
                                                            <th>Rating</th>
                                                            <th>Comentario</th>
                                                            <th>Compra</th>
                                                            <th>Google</th>
                                                            <th>Pública</th>
                                                            <th>Estado</th>
                                                            <th>Fotos</th>
                                                            <th>Acciones</th>
                                                        </tr>
                                                    </thead>

                                                    <tbody>
                                                        {responses.map(response => (
                                                            <tr key={response.id}>

                                                                <td>
                                                                    {new Date(response.created_at)
                                                                        .toLocaleDateString("es-AR")}
                                                                </td>

                                                                <td>
                                                                    {response.customer_name ||
                                                                        response.customer_email ||
                                                                        "-"}
                                                                    {Number(response.verified_purchase) === 1 && (
                                                                        <span className="client_reviews_verified_badge">
                                                                            ✓ Verificada
                                                                        </span>
                                                                    )}
                                                                </td>

                                                                <td>
                                                                    ⭐ {Number(response.average_rating || 0).toFixed(1)}
                                                                </td>

                                                                <td>
                                                                    {response.general_comment || "-"}
                                                                </td>

                                                                <td>
                                                                    {Number(response.verified_purchase) === 1
                                                                        ? (
                                                                            <span className="badge success">
                                                                                Compra verificada
                                                                            </span>
                                                                        )
                                                                        : (
                                                                            <span className="badge">
                                                                                Pública
                                                                            </span>
                                                                        )}
                                                                </td>

                                                                <td>
                                                                    {response.google_clicked
                                                                        ? "✅"
                                                                        : response.google_prompt_shown
                                                                            ? "👀"
                                                                            : "-"}
                                                                </td>

                                                                <td>

                                                                    <input
                                                                        type="checkbox"
                                                                        checked={
                                                                            Number(response.is_public) === 1
                                                                        }
                                                                        onChange={(e) =>
                                                                            changeResponsePublic(
                                                                                response.id,
                                                                                e.target.checked
                                                                            )
                                                                        }
                                                                    />

                                                                </td>

                                                                <td>
                                                                    <span className={`badge ${response.status}`}>
                                                                        {response.status}
                                                                    </span>
                                                                </td>

                                                                <td>
                                                                    {Number(response.media_count || 0) > 0
                                                                        ? `📷 ${response.media_count}`
                                                                        : "-"}
                                                                </td>

                                                                <td>
                                                                    <div className="client_reviews_actions">

                                                                        <button
                                                                            style={{ minWidth: "60px", minHeight: "45px", fontSize: "18px", lineHeight: 1 }}
                                                                            type="button"
                                                                            className="icon_btn success"
                                                                            title="Usar para Instagram"
                                                                            onClick={() => {
                                                                                setSelectedResponse(response);
                                                                                setSelectedMedia(null);
                                                                                setDrawerTab("instagram");
                                                                                loadReviewerMedia(response.id);
                                                                            }}
                                                                        >
                                                                            📱
                                                                        </button>

                                                                        <button
                                                                            style={{ minWidth: "60px", minHeight: "45px" }}
                                                                            type="button"
                                                                            className="icon_btn success"
                                                                            title="Marcar revisada"
                                                                            onClick={() =>
                                                                                changeResponseStatus(
                                                                                    response.id,
                                                                                    "reviewed"
                                                                                )
                                                                            }
                                                                        >
                                                                            ✅
                                                                        </button>

                                                                        <button
                                                                            style={{ minWidth: "60px", minHeight: "45px", fontSize: "18px", lineHeight: 1 }}
                                                                            type="button"
                                                                            className="icon_btn success"
                                                                            title="Archivar"
                                                                            onClick={() =>
                                                                                changeResponseStatus(
                                                                                    response.id,
                                                                                    "archived"
                                                                                )
                                                                            }
                                                                        >
                                                                            🗄
                                                                        </button>

                                                                        <button
                                                                            style={{ minWidth: "60px", minHeight: "45px" }}
                                                                            type="button"
                                                                            className="icon_btn danger"
                                                                            title="Eliminar"
                                                                            onClick={() =>
                                                                                deleteResponse(response.id)
                                                                            }
                                                                        >
                                                                            🗑
                                                                        </button>

                                                                    </div>
                                                                </td>

                                                            </tr>
                                                        ))}

                                                        {!responses.length && (
                                                            <tr>
                                                                <td colSpan={8}>
                                                                    No hay reseñas para mostrar.
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>

                                                </table>

                                            </div>
                                        )}

                                        <div className="tags_pagination mt-3">
                                            <button
                                                disabled={responsesPage === 1}
                                                onClick={() =>
                                                    setResponsesPage(prev => Math.max(1, prev - 1))
                                                }
                                            >
                                                ⬅
                                            </button>

                                            <span className="mx-2">
                                                Página {responsesPage}
                                            </span>

                                            <button
                                                disabled={responses.length < 10}
                                                onClick={() =>
                                                    setResponsesPage(prev => prev + 1)
                                                }
                                            >
                                                ➡
                                            </button>
                                        </div>

                                    </div>
                                </>
                            )}

                            {drawerTab === "instagram" && (
                                <>
                                    {/* Media + Instagram */}
                                    <div className="qr_page_card mt-4">

                                        <h3>Imágenes de Instagram</h3>
                                        <p>Seleccioná una Reseña de la tabla y genera una imagen para publicar en tus redes.</p>

                                        <p className="qr_page_subtitle">
                                            Creá piezas usando reseñas reales, fotos subidas por el cliente final y tu galería propia.
                                        </p>

                                        <div className="qr_page_status mt-3">
                                            <strong>Reseña seleccionada:</strong>
                                            <br />
                                            {selectedResponse
                                                ? `${selectedResponse.customer_name || "Cliente"} - ⭐ ${Number(selectedResponse.average_rating || 0).toFixed(1)}`
                                                : "Seleccioná una reseña desde la pestaña Reseñas."}
                                        </div>

                                        {selectedResponse && (
                                            <>
                                                <h3 className="mt-4">
                                                    Fotos subidas por el cliente
                                                </h3>

                                                {reviewerMediaLoading ? (
                                                    <TagsSpinner />
                                                ) : (
                                                    <div className="row mt-3">
                                                        {reviewerMedia.map(media => (
                                                            <div
                                                                key={media.id}
                                                                className="col-6 col-md-3 mb-3"
                                                            >
                                                                <img
                                                                    src={media.url}
                                                                    alt=""
                                                                    onClick={() => setSelectedMedia(media)}
                                                                    style={{
                                                                        width: "100%",
                                                                        height: 140,
                                                                        objectFit: "cover",
                                                                        borderRadius: 10,
                                                                        cursor: "pointer",
                                                                        border:
                                                                            selectedMedia?.id === media.id
                                                                                ? "3px solid #0F9D58"
                                                                                : "1px solid #e5e7eb"
                                                                    }}
                                                                />
                                                            </div>
                                                        ))}

                                                        {!reviewerMedia.length && (
                                                            <div className="col-12">
                                                                Esta reseña no tiene fotos adjuntas.
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        <h3 className="mt-4">
                                            Galería del negocio
                                        </h3>

                                        <p className="qr_page_subtitle">
                                            Imágenes propias que podés usar como fondo o recurso visual.
                                        </p>

                                        <label className="qr_page_upload_btn">
                                            {uploadingMedia ? (
                                                <span className="d-flex align-items-center gap-2">
                                                    <TagsSpinner />
                                                    Subiendo...
                                                </span>
                                            ) : (
                                                "Subir imagen a galería"
                                            )}

                                            <input
                                                type="file"
                                                accept="image/*"
                                                hidden
                                                disabled={uploadingMedia}
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;

                                                    await uploadSocialMedia(file);
                                                    e.target.value = "";
                                                }}
                                            />
                                        </label>

                                        {mediaLoading ? (
                                            <TagsSpinner />
                                        ) : (
                                            <div className="row mt-3">
                                                {mediaItems.map(media => (
                                                    <div
                                                        key={media.id}
                                                        className="col-6 col-md-3 mb-3"
                                                    >
                                                        <div
                                                            style={{
                                                                border:
                                                                    selectedMedia?.id === media.id
                                                                        ? "2px solid #0F9D58"
                                                                        : "1px solid #e5e7eb",
                                                                borderRadius: 12,
                                                                padding: 8
                                                            }}
                                                        >
                                                            <img
                                                                src={media.url}
                                                                alt=""
                                                                style={{
                                                                    width: "100%",
                                                                    height: 140,
                                                                    objectFit: "cover",
                                                                    borderRadius: 10,
                                                                    cursor: "pointer"
                                                                }}
                                                                onClick={() => setSelectedMedia(media)}
                                                            />

                                                            <button
                                                                type="button"
                                                                className="qr_page_btn secondary mt-2 w-100"
                                                                onClick={() => deleteMedia(media.id)}
                                                            >
                                                                Eliminar
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}

                                                {!mediaItems.length && (
                                                    <div className="col-12">
                                                        No hay imágenes en la galería del negocio.
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="qr_page_card mt-4">
                                            <h3>Generar pieza</h3>

                                            <div className="row">
                                                <div className="col-12 col-md-4 mb-3">
                                                    <label>Formato</label>
                                                    <select
                                                        className="qr_page_input"
                                                        value={socialFormat}
                                                        onChange={(e) =>
                                                            setSocialFormat(e.target.value)
                                                        }
                                                    >
                                                        <option value="post">Post 1080x1080</option>
                                                        <option value="portrait">Post vertical 1080x1350</option>
                                                        <option value="story">Story/Reel 1080x1920</option>
                                                    </select>
                                                </div>

                                                <div className="col-12 col-md-8 mb-3">
                                                    <label>Imagen seleccionada</label>
                                                    <div className="qr_page_status">
                                                        {selectedMedia
                                                            ? selectedMedia.original_filename || "Imagen seleccionada"
                                                            : "Opcional: elegí una foto del cliente o de tu galería"}
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                className="qr_page_btn success mt-3"
                                                disabled={generatingSocialCard}
                                                onClick={() => {

                                                    if (!selectedResponse) {

                                                        showAlert({
                                                            title: "Seleccioná una reseña",
                                                            text:
                                                                "Primero tenés que ir a la pestaña Reseñas y seleccionar una usando el botón 📱.",
                                                            icon: "info"
                                                        });

                                                        return;
                                                    }

                                                    generateInstagramPiece();
                                                }}
                                            >
                                                {generatingSocialCard ? (
                                                    <span className="d-flex align-items-center gap-2">
                                                        <TagsSpinner />
                                                        Generando...
                                                    </span>
                                                ) : (
                                                    "Generar pieza Instagram"
                                                )}
                                            </button>
                                        </div>

                                    </div>
                                </>
                            )}

                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}
