"use client";

import { useEffect, useState }
    from "react";

import showAlert
    from "@/app/components/showAlert";
import TagsSpinner from "@/app/components/TagsSpinner";

export default function QRPageTemplatesManager({
    businessId,
    pageId,
    onReload,
    onApplied
}) {

    const [templates, setTemplates] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [applying, setApplying] =
        useState(false);

    async function loadTemplates() {

        setLoading(true);

        try {

            const res =
                await fetch(
                    `/api/qr-page/templates/list?businessId=${businessId}`
                );

            const data =
                await res.json();

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "Error cargando templates"
                );
            }

            setTemplates(
                data.templates || []
            );

        } catch (err) {

            showAlert({
                type: "error",
                title: "Error",
                text: err.message
            });

        } finally {

            setLoading(false);
        }
    }

    useEffect(() => {
        loadTemplates();
    }, []);

    async function handleApplyTemplate(template) {

        const confirmed =
            await showAlert({
                title: "Aplicar template",
                text:
                    `Aplicar el template "${template.name}" reemplazará las secciones y bloques actuales.`,
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Aplicar",
                cancelButtonText: "Cancelar"
            });

        if (!confirmed) {
            return;
        }

        if (!confirmed) {
            return;
        }

        setApplying(true);

        try {

            const res =
                await fetch(
                    "/api/qr-page/templates/apply",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            businessId,
                            pageId,
                            templateId: template.id
                        })
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "Error aplicando template"
                );
            }

            showAlert({
                type: "success",
                title: "Template aplicado",
                text: "La estructura de la QR-Page fue actualizada"
            });

            await onReload();
            if (onApplied) {
                onApplied();
            }

        } catch (err) {

            showAlert({
                type: "error",
                title: "Error",
                text: err.message
            });

        } finally {

            setApplying(false);
        }
    }

    if (loading) {
        return (
            <TagsSpinner/>
        );
    }

    return (
        <div className="qr_page_templates_manager">

            <div className="qr_page_builder_panel_header">
                <div>
                    <h2>
                        Plantillas Prediseñadas
                    </h2>

                    <p>
                        Elegí una estructura inicial para tu Página QR-Page o TagsID.
                    </p>
                </div>
            </div>

            {
                !templates.length && (
                    <div className="qr_page_empty">
                        No hay plantillas disponibles.
                    </div>
                )
            }

            <div className="qr_page_templates_grid">
                {
                    templates.map((template) => (
                        <article
                            key={template.id}
                            className="qr_page_template_card"
                        >
                            <div className="qr_page_template_preview">
                                {
                                    template.preview_image_url
                                        ? (
                                            <img
                                                src={template.preview_image_url}
                                                alt={template.name}
                                            />
                                        )
                                        : (
                                            <span>
                                                {template.name}
                                            </span>
                                        )
                                }
                            </div>

                            <div className="qr_page_template_body">
                                <h3>
                                    {template.name}
                                </h3>

                                {
                                    template.description && (
                                        <p>
                                            {template.description}
                                        </p>
                                    )
                                }

                                <button
                                    type="button"
                                    className="qr_page_btn success"
                                    onClick={() =>
                                        handleApplyTemplate(
                                            template
                                        )
                                    }
                                    disabled={applying}
                                >
                                    {
                                        applying
                                            ? "Aplicando..."
                                            : "Aplicar template"
                                    }
                                </button>
                            </div>
                        </article>
                    ))
                }
            </div>

        </div>
    );
}