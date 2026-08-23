"use client";

// =====================================
// COMPONENT: ClientReviewsPublicRenderer
// Descripción: Renderer público para ClientsReviews usando template_json + css_tokens.
// =====================================

import { useEffect, useMemo, useState } from "react";

import "@/app/styles/qr-page.css";
import TagsSpinner from "@/app/components/TagsSpinner";
import showAlert from "@/app/components/showAlert";
import "./ClientReviewsPublicRenderer.css";

function parseJson(value, fallback = {}) {
    if (!value) return fallback;
    if (typeof value === "object") return value;

    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

function getRatingLabel(question, rating) {
    return question?.[`rating_label_${rating}`] || "";
}

function getBlocks(templateJson) {
    const sections =
        templateJson?.sections || [];

    const section =
        sections.find(item => item.type === "client_reviews") ||
        sections[0] ||
        {};

    return {
        section,
        blocks:
            section.blocks || []
    };
}

function getBlock(blocks, type) {
    return blocks.find(block => block.type === type) || null;
}

function styleValue(value, fallback) {
    return value || fallback;
}

function useProxiedAssetFallback(event, assetPath) {
    const image = event.currentTarget;
    if (image.dataset.proxiedFallback === "1") return;
    image.dataset.proxiedFallback = "1";
    image.src = `/__tags__${assetPath}`;
}

export default function ClientReviewsPublicRenderer({
    slug,
    reviewToken = null,
    portalThemeTokens = {},
    inheritPortalTheme = false,
    initialCustomer = null,
    onSubmitted = null,
    embedded = false,
    disableGoogleThreshold = false
}) {
    const [loading, setLoading] =
        useState(true);

    const [page, setPage] =
        useState(null);

    const [form, setForm] =
        useState(null);

    const [questions, setQuestions] =
        useState([]);

    const [answers, setAnswers] =
        useState({});

    const [generalComment, setGeneralComment] =
        useState("");

    const [customerName, setCustomerName] =
        useState(initialCustomer?.name || "");

    const [customerEmail, setCustomerEmail] =
        useState(initialCustomer?.email || "");

    const [customerPhone, setCustomerPhone] =
        useState(initialCustomer?.phone || "");

    const [submitting, setSubmitting] =
        useState(false);

    const [fieldErrors, setFieldErrors] =
        useState({});

    const [result, setResult] =
        useState(null);

    const [returnTo, setReturnTo] =
        useState("");

    useEffect(() => {
        if (typeof window !== "undefined") {
            const candidate =
                new URLSearchParams(window.location.search).get("returnTo") ||
                "";
            setReturnTo(candidate.startsWith("/") ? candidate : "");
        }
    }, []);

    const [reviewerImages, setReviewerImages] =
        useState([]);

    const [uploadingReviewerImage, setUploadingReviewerImage] =
        useState(false);

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug]);



    async function load() {
        setLoading(true);

        try {
            const res =
                await fetch(
                    `/api/client-reviews/public/get?slug=${slug}`
                );

            const data =
                await res.json().catch(() => null);

            if (!res.ok) {
                throw new Error(
                    data?.error ||
                    "No se pudo cargar el formulario"
                );
            }

            setPage(data.page || null);
            setForm(data.form || null);
            setQuestions(data.questions || []);

        } catch (err) {
            setResult({
                error: true,
                message: err.message
            });

        } finally {
            setLoading(false);
        }
    }

    const settings =
        useMemo(
            () => parseJson(form?.settings_json, {}),
            [form]
        );

    const templateJson =
        useMemo(
            () => parseJson(form?.template_json, {}),
            [form]
        );

    const { section, blocks } =
        useMemo(
            () => getBlocks(templateJson),
            [templateJson]
        );

    const headerBlock =
        getBlock(blocks, "reviews_header");

    const introBlock =
        getBlock(blocks, "reviews_intro");

    const questionsBlock =
        getBlock(blocks, "reviews_questions");

    const customerFieldsBlock =
        getBlock(blocks, "reviews_customer_fields");

    const submitBlock =
        getBlock(blocks, "reviews_submit");

    const thankYouBlock =
        getBlock(blocks, "reviews_thank_you");

    const sectionStyles =
        section?.styles_json || {};

    const themeTokens =
        useMemo(
            () => ({
                "--qr-bg": "#f8fafc",
                "--qr-text": "#111827",
                "--qr-muted": "#6b7280",
                "--qr-border": "#e5e7eb",
                "--qr-radius": "18px",
                "--qr-shadow": "0 18px 40px rgba(15, 23, 42, 0.08)",
                "--qr-primary": "#16a34a",
                "--qr-surface": "#ffffff",
                "--qr-surface-alt": "#f1f5f9",
                "--qr-primary-text": "#ffffff",
                ...(form?.theme_tokens || {}),
                ...(inheritPortalTheme ? portalThemeTokens : {})
            }),
            [form, inheritPortalTheme, portalThemeTokens]
        );

    const showGoogleLogo =
        headerBlock?.content_json?.showGoogleLogo ??
        settings.showGoogleLogo !== false;

    const showClientLogo =
        headerBlock?.content_json?.showClientLogo ??
        settings.showClientLogo !== false;

    const showStars =
        headerBlock?.content_json?.showStars !== false;

    const googleLogoVariant =
        headerBlock?.content_json?.googleLogoVariant ||
        settings.googleLogoVariant ||
        "full";

    const googleLogo =
        googleLogoVariant === "g"
            ? "/assets/images/logos/logo_google_solo_g.webp"
            : "/assets/images/logos/logo_google_largo.webp";

    const shellStyle = {
        ...themeTokens,
        background: "var(--qr-bg)",
        color: "var(--qr-text)",
        minHeight: embedded ? "0" : "100vh"
    };

    const cardStyle = {
        maxWidth: 720,
        margin: embedded ? "0 auto" : "40px auto",
        padding: embedded ? "clamp(16px, 4vw, 28px)" : 28,
        background: "var(--qr-surface)",
        color: "var(--qr-text)",
        border: "1px solid var(--qr-border)",
        borderRadius: "var(--qr-radius)",
        boxShadow: "var(--qr-shadow)"
    };

    function setAnswer(questionId, data) {
        setAnswers(prev => ({
            ...prev,
            [questionId]: {
                ...(prev[questionId] || {}),
                ...data
            }
        }));
    }

    async function submit() {
        const payloadAnswers =
            questions.map(question => ({
                question_id: question.id,
                rating: answers[question.id]?.rating,
                comment: answers[question.id]?.comment || null
            })).filter(answer => Number(answer.rating) >= 1);

        const missing =
            questions.some(question =>
                Number(question.is_required) === 1 &&
                !answers[question.id]?.rating
            );

        if (missing) {
            await showAlert({
                icon: "warning",
                title: "Faltan calificaciones",
                text: "Respondé todas las preguntas obligatorias marcadas con *."
            });
            return;
        }

        const errors = {};
        const cleanName = customerName.trim();
        const cleanEmail = customerEmail.trim().toLowerCase();
        const cleanPhone = customerPhone.replace(/\D/g, "");
        const cleanComment = generalComment.trim();
        if (cleanName.length < 2) errors.customerName = "Ingresá tu nombre.";
        if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) errors.customerEmail = "Ingresá un email válido.";
        if (cleanPhone && (cleanPhone.length < 8 || cleanPhone.length > 15)) errors.customerPhone = "Revisá el número de WhatsApp.";
        if (cleanComment.length < 10) errors.generalComment = "Contanos tu experiencia en al menos 10 caracteres.";
        setFieldErrors(errors);
        if (Object.keys(errors).length) {
            await showAlert({
                icon: "warning",
                title: "Revisá los datos de la reseña",
                text: Object.values(errors).join(" ")
            });
            const firstField = document.querySelector(".client_reviews_required_error");
            firstField?.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }

        setSubmitting(true);

        try {
            const res =
                await fetch(
                    "/api/client-reviews/public/submit",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            formId: form.id,
                            customer_name: cleanName,
                            customer_email: cleanEmail,
                            customer_phone: cleanPhone || null,
                            general_comment: cleanComment,
                            answers: payloadAnswers,
                            reviewToken
                        })
                    }
                );

            const data =
                await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "No se pudo enviar la reseña"
                );
            }

            setResult({
                ok: true,
                ...data
            });

            if (typeof onSubmitted === "function") {
                onSubmitted(Number(data.averageRating || 0));
            }

            console.log(
                "CLIENT REVIEWS SUBMIT RESULT:",
                data
            );

        } catch (err) {
            await showAlert({
                icon: "error",
                title: "No se pudo enviar la reseña",
                text: err.message
            });

        } finally {
            setSubmitting(false);
        }
    }

    async function handleGoogleClick() {
        if (result?.responseId) {
            await fetch(
                "/api/client-reviews/public/google-click",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        responseId: result.responseId
                    })
                }
            ).catch(() => null);
        }

        if (result?.googleReviewUrl) {
            window.open(
                result.googleReviewUrl,
                "_blank"
            );
        }
    }

    async function uploadReviewerImage(file) {
        if (!file || !result?.responseId) {
            return;
        }

        setUploadingReviewerImage(true);

        try {
            const formData =
                new FormData();

            formData.append(
                "responseId",
                result.responseId
            );

            formData.append(
                "file",
                file
            );

            const res =
                await fetch(
                    "/api/client-reviews/public/media/upload",
                    {
                        method: "POST",
                        body: formData
                    }
                );

            const data =
                await res.json().catch(() => null);



            if (!res.ok) {
                throw new Error(
                    data?.error ||
                    "No se pudo subir la imagen"
                );
            }

            setReviewerImages(prev => [
                ...prev,
                data.media
            ]);

        } catch (err) {
            await showAlert({
                icon: "error",
                title: "No se pudo subir la imagen",
                text: err.message
            });

        } finally {
            setUploadingReviewerImage(false);
        }
    }

    function PublicShell({ children }) {
        return (
            <div
                className="qr_page_public p-2 mb-4"
                style={{
                    ...themeTokens,
                    background:
                        styleValue(
                            sectionStyles.backgroundColor,
                            "var(--qr-bg)"
                        ),
                    color:
                        styleValue(
                            sectionStyles.textColor,
                            "var(--qr-text)"
                        ),
                    minHeight: "100vh"
                }}
            >
                {children}
            </div>
        );
    }

    function PublicCard({
        children,
        centered = false
    }) {
        return (
            <div
                className="qr_page_public_card"
                style={{
                    maxWidth: 720,
                    margin: "40px auto",
                    padding: 28,
                    background:
                        styleValue(
                            sectionStyles.cardBackground,
                            "var(--qr-surface)"
                        ),
                    color:
                        styleValue(
                            sectionStyles.textColor,
                            "var(--qr-text)"
                        ),
                    border:
                        `1px solid ${styleValue(sectionStyles.borderColor, "var(--qr-border)")}`,
                    borderRadius:
                        styleValue(
                            sectionStyles.borderRadius,
                            "var(--qr-radius)"
                        ),
                    boxShadow:
                        styleValue(
                            sectionStyles.boxShadow,
                            "var(--qr-shadow)"
                        ),
                    textAlign: centered ? "center" : "left"
                }}
            >
                {children}
            </div>
        );
    }

    function StarsImage() {
        return (
            <img
                src="/assets/images/logos/estrellas-reviews.webp"
                alt="Reviews"
                onError={event => useProxiedAssetFallback(event, "/assets/images/logos/estrellas-reviews.webp")}
                style={{
                    maxWidth: 200,
                    width: "100%",
                    height: "auto"
                }}
            />
        );
    }

    function ReviewHeader() {

        return (
            <div className="client_reviews_public_header">

                {
                    showClientLogo
                    &&
                    form?.logo_url
                    &&
                    (
                        <div className="client_reviews_public_client_logo_wrap">
                            <img
                                src={form.logo_url}
                                alt="Logo"
                                className="client_reviews_public_client_logo"
                            />
                        </div>
                    )
                }

                {
                    showGoogleLogo
                    &&
                    (
                        <div className="client_reviews_public_google_wrap">
                            <img
                                src={googleLogo}
                                alt="Google"
                                className="client_reviews_public_google_logo"
                                onError={event => useProxiedAssetFallback(event, googleLogo)}
                            />
                        </div>
                    )
                }

                <div className="client_reviews_public_stars_wrap">
                    <img
                        src="/assets/images/logos/estrellas-reviews.webp"
                        alt="Reviews"
                        className="client_reviews_public_stars"
                        onError={event => useProxiedAssetFallback(event, "/assets/images/logos/estrellas-reviews.webp")}
                    />
                </div>

            </div>
        );
    }

    if (loading) {
        return (
            <div
                className="qr_page_public p-2 mb-4"
                style={shellStyle}
            >
                <div
                    className="qr_page_public_card"
                    style={cardStyle}
                >
                    <TagsSpinner />
                </div>
            </div>

        );
    }

    if (result?.error) {
        return (
            <div
                className="qr_page_public p-2 mb-4"
                style={shellStyle}
            >
                <div
                    className="qr_page_public_card"
                    style={cardStyle}
                >
                    {result.message}
                </div>
            </div>
        );
    }

    if (result?.ok) {
        const thankContent =
            thankYouBlock?.content_json || {};

        console.log(
            "CLIENT REVIEWS CTA CONDITION:",
            {
                showGoogleCTA:
                    thankContent.showGoogleCTA,
                googlePromptShown:
                    result.googlePromptShown,
                googleReviewUrl:
                    result.googleReviewUrl
            }
        );
        
        const thankStyles =
            thankYouBlock?.styles_json || {};

        return (
            <div
                className="qr_page_public p-2 mb-4"
                style={shellStyle}
            >
                <div
                    className="qr_page_public_card"
                    style={cardStyle}
                >

                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            marginBottom: 24
                        }}
                    >
                        {thankContent.showClientLogo !== false &&
                            form?.logo_url && (
                                <img
                                    src={form.logo_url}
                                    alt="Logo"
                                    style={{
                                        maxWidth: 220,
                                        maxHeight: 120,
                                        width: "auto",
                                        height: "auto",
                                        objectFit: "contain",
                                        marginBottom: 20
                                    }}
                                />
                            )}

                        {thankContent.showStars !== false && (
                            <StarsImage />
                        )}
                    </div>

                    <h1>
                        {form?.success_title ||
                            "¡Gracias por tu opinión!"}
                    </h1>

                    <p
                        style={{
                            color: "var(--qr-muted)"
                        }}
                    >
                        {form?.success_message ||
                            "Valoramos mucho tu tiempo y tus comentarios."}
                    </p>

                    {returnTo && (
                        <button
                            type="button"
                            className="qr_page_btn"
                            onClick={() => {
                                window.location.href = returnTo;
                            }}
                        >
                            Volver a mi pedido
                        </button>
                    )}

                    {thankContent.showPhotoUpload !== false && (
                        <div
                            style={{
                                marginTop: 24,
                                padding: 20,
                                border: "1px solid var(--qr-border)",
                                borderRadius: "var(--qr-radius)",
                                background:
                                    thankStyles.photoBoxBackground ||
                                    "var(--qr-surface-alt)"
                            }}
                        >
                            <h2>
                                ¿Querés compartir fotos de tu experiencia?
                            </h2>

                            <p
                                style={{
                                    color: "var(--qr-muted)"
                                }}
                            >
                                Podés subir imágenes para acompañar tu opinión.
                            </p>

                            <label
                                className="qr_page_upload_btn"
                                style={{
                                    background: "var(--qr-primary)",
                                    color: "var(--qr-primary-text)"
                                }}
                            >
                                {uploadingReviewerImage
                                    ? "Subiendo imagen..."
                                    : "Subir imagen"}

                                <input
                                    type="file"
                                    accept="image/*"
                                    hidden
                                    disabled={uploadingReviewerImage}
                                    onChange={async (e) => {
                                        const file =
                                            e.target.files?.[0];

                                        if (!file) return;

                                        await uploadReviewerImage(file);

                                        e.target.value = "";
                                    }}
                                />
                            </label>

                            {reviewerImages.length > 0 && (
                                <div
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns:
                                            "repeat(auto-fill, minmax(90px, 1fr))",
                                        gap: 10,
                                        marginTop: 16
                                    }}
                                >
                                    {reviewerImages.map((image) => (
                                        <img
                                            key={image.id}
                                            src={image.url}
                                            alt=""
                                            style={{
                                                width: "100%",
                                                height: 90,
                                                objectFit: "cover",
                                                borderRadius: 10
                                            }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {thankContent.showGoogleCTA !== false &&
                        (result.googlePromptShown || disableGoogleThreshold) &&
                        result.googleReviewUrl && (
                            <div
                                className="mt-4 pt-4"
                                style={{
                                    borderTop:
                                        "1px solid var(--qr-border)"
                                }}
                            >
                                <img
                                    src={googleLogo}
                                    alt="Google"
                                    style={{
                                        objectFit: "contain",
                                        maxWidth: "100%",
                                        height: "auto"
                                    }}
                                />

                                <h3>
                                    {form?.google_cta_title ||
                                        "¿Nos ayudás compartiendo tu experiencia en Google?"}
                                </h3>

                                <p
                                    style={{
                                        color: "var(--qr-muted)"
                                    }}
                                >
                                    {form?.google_cta_text ||
                                        "Tu reseña pública ayuda a que más personas nos conozcan."}
                                </p>

                                <button
                                    type="button"
                                    className="qr_page_btn success"
                                    style={{
                                        background: "var(--qr-primary)",
                                        color: "var(--qr-primary-text)"
                                    }}
                                    onClick={handleGoogleClick}
                                >
                                    {form?.google_cta_button_label ||
                                        "Dejar reseña en Google"}
                                </button>
                            </div>
                        )}

                </div>
            </div>
        );
    }

    const introContent =
        introBlock?.content_json || {};

    const questionsContent =
        questionsBlock?.content_json || {};

    const questionsStyles =
        questionsBlock?.styles_json || {};

    const customerContent =
        customerFieldsBlock?.content_json || {};

    const submitContent =
        submitBlock?.content_json || {};



    /*  UI  */

    return (
        <div
            className="qr_page_public p-2 mb-4"
            style={shellStyle}
        >
            <div
                className="qr_page_public_card"
                style={cardStyle}
            >


                {headerBlock?.is_visible !== false && (
                    <ReviewHeader />
                )}

                {introBlock?.is_visible !== false && (
                    <>
                        <h1>
                            {form?.title ||
                                introContent.fallbackTitle ||
                                "¿Cómo fue tu experiencia?"}
                        </h1>

                        {(form?.subtitle || introContent.fallbackSubtitle) && (
                            <p
                                style={{
                                    color: "var(--qr-muted)"
                                }}
                            >
                                {form?.subtitle || introContent.fallbackSubtitle}
                            </p>
                        )}
                    </>
                )}

                {questionsBlock?.is_visible !== false && (
                    <div className="mt-4">
                        {questions.map(question => {
                            const current =
                                answers[question.id] || {};

                            return (
                                <div
                                    key={question.id}
                                    style={{
                                        padding: `${questionsStyles.questionSpacing || "18px"} 0`,
                                        borderBottom:
                                            "1px solid var(--qr-border)"
                                    }}
                                >
                                    <h3>
                                        {question.question_text}{Number(question.is_required) === 1 && <span className="client_reviews_required_mark"> *</span>}
                                    </h3>

                                    {questionsContent.showQuestionHelper !== false &&
                                        question.helper_text && (
                                            <p
                                                style={{
                                                    color: "var(--qr-muted)"
                                                }}
                                            >
                                                {question.helper_text}
                                            </p>
                                        )}

                                    <div
                                        style={{
                                            display: "flex",
                                            gap: 8,
                                            flexWrap: "wrap",
                                            marginTop: 12
                                        }}
                                    >
                                        {[1, 2, 3, 4, 5].map(n => (
                                            <button
                                                key={n}
                                                type="button"
                                                onClick={() =>
                                                    setAnswer(
                                                        question.id,
                                                        { rating: n }
                                                    )
                                                }
                                                style={{
                                                    fontSize: 28,
                                                    border: "none",
                                                    background: "transparent",
                                                    cursor: "pointer",
                                                    color:
                                                        questionsStyles.starColor ||
                                                        "var(--qr-primary)",
                                                    opacity:
                                                        current.rating >= n
                                                            ? 1
                                                            : 0.55
                                                }}
                                                title={getRatingLabel(question, n)}
                                            >
                                                {questionsContent.starIcon || "⭐"}
                                            </button>
                                        ))}
                                    </div>

                                    {current.rating && (
                                        <small
                                            style={{
                                                color: "var(--qr-muted)"
                                            }}
                                        >
                                            {getRatingLabel(
                                                question,
                                                current.rating
                                            )}
                                        </small>
                                    )}

                                    {Number(question.allow_comment) === 1 && (
                                        <textarea
                                            className="qr_page_input mt-3"
                                            rows={3}
                                            placeholder={
                                                question.comment_placeholder ||
                                                "Contanos un poco más"
                                            }
                                            value={current.comment || ""}
                                            style={{
                                                background:
                                                    questionsStyles.commentBackground ||
                                                    "var(--qr-surface-alt)",
                                                color: "var(--qr-text)",
                                                borderColor: "var(--qr-border)"
                                            }}
                                            onChange={(e) =>
                                                setAnswer(
                                                    question.id,
                                                    {
                                                        comment:
                                                            e.target.value
                                                    }
                                                )
                                            }
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {customerFieldsBlock?.is_visible !== false && (
                    <>
                        {customerContent.showName !== false && (
                            <div className={`qr_page_field mt-4${fieldErrors.customerName ? " client_reviews_required_error" : ""}`}>
                                <label>{customerContent.nameLabel || "Tu nombre"} <span className="client_reviews_required_mark">*</span></label>
                                <input
                                    className={`qr_page_input${fieldErrors.customerName ? " is_invalid" : ""}`}
                                    value={customerName}
                                    aria-invalid={Boolean(fieldErrors.customerName)}
                                    onChange={(e) => { setCustomerName(e.target.value); setFieldErrors(current => ({ ...current, customerName: "" })); }}
                                />
                                {fieldErrors.customerName && <small className="client_reviews_field_error">{fieldErrors.customerName}</small>}
                            </div>
                        )}

                        {customerContent.showEmail !== false && (
                            <div className={`qr_page_field mt-3${fieldErrors.customerEmail ? " client_reviews_required_error" : ""}`}>
                                <label>{customerContent.emailLabel || "Email"} <span className="client_reviews_required_mark">*</span></label>
                                <input
                                    type="email"
                                    className={`qr_page_input${fieldErrors.customerEmail ? " is_invalid" : ""}`}
                                    value={customerEmail}
                                    aria-invalid={Boolean(fieldErrors.customerEmail)}
                                    onChange={(e) => { setCustomerEmail(e.target.value); setFieldErrors(current => ({ ...current, customerEmail: "" })); }}
                                />
                                {fieldErrors.customerEmail && <small className="client_reviews_field_error">{fieldErrors.customerEmail}</small>}
                            </div>
                        )}

                        <div className={`qr_page_field mt-3${fieldErrors.customerPhone ? " client_reviews_required_error" : ""}`}>
                            <label>WhatsApp <small>(opcional)</small></label>
                            <input
                                inputMode="tel"
                                className={`qr_page_input${fieldErrors.customerPhone ? " is_invalid" : ""}`}
                                value={customerPhone}
                                aria-invalid={Boolean(fieldErrors.customerPhone)}
                                onChange={(e) => { setCustomerPhone(e.target.value); setFieldErrors(current => ({ ...current, customerPhone: "" })); }}
                                placeholder="Ej.: 3546520243"
                            />
                            <small className="client_reviews_field_help">Dejanos tu WhatsApp si querés formar parte de nuestra comunidad y enterarte de novedades, actividades y sorteos.</small>
                            {fieldErrors.customerPhone && <small className="client_reviews_field_error">{fieldErrors.customerPhone}</small>}
                        </div>

                        {customerContent.showGeneralComment !== false && (
                            <div className={`qr_page_field mt-3${fieldErrors.generalComment ? " client_reviews_required_error" : ""}`}>
                                <label>{customerContent.commentLabel || "Contanos tu experiencia"} <span className="client_reviews_required_mark">*</span></label>
                                <textarea
                                    className={`qr_page_input${fieldErrors.generalComment ? " is_invalid" : ""}`}
                                    rows={4}
                                    value={generalComment}
                                    aria-invalid={Boolean(fieldErrors.generalComment)}
                                    placeholder="¿Qué fue lo que más te gustó? ¿Qué podríamos mejorar?"
                                    onChange={(e) => { setGeneralComment(e.target.value); setFieldErrors(current => ({ ...current, generalComment: "" })); }}
                                />
                                {fieldErrors.generalComment && <small className="client_reviews_field_error">{fieldErrors.generalComment}</small>}
                            </div>
                        )}
                    </>
                )}

                {submitBlock?.is_visible !== false && (
                    <button
                        type="button"
                        className="qr_page_btn success mt-4"
                        disabled={submitting}
                        style={{
                            background:
                                submitBlock?.styles_json?.buttonBackground ||
                                "var(--qr-primary)",
                            color:
                                submitBlock?.styles_json?.buttonColor ||
                                "var(--qr-primary-text)"
                        }}
                        onClick={submit}
                    >
                        {submitting
                            ? "Enviando..."
                            : submitContent.buttonLabel || "Enviar opinión"}
                    </button>
                )}

            </div>
        </div>

    );
}
