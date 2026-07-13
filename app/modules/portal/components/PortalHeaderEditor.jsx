// =====================================
// COMPONENT: app/modules/portal/components/PortalHeaderEditor.jsx
// Descripción: Editor del Header global del Portal Público.
// =====================================

import PortalTypographyEditor
    from "./PortalTypographyEditor";

export default function PortalHeaderEditor({
    value = {},
    themeTokens = {},
    onChange
}) {
    function update(field, nextValue) {
        onChange({
            ...value,
            [field]: nextValue
        });
    }

    function updateTypography(part, nextValue) {
        onChange({
            ...value,
            typography: {
                ...(value.typography || {}),
                [part]: nextValue
            }
        });
    }

    return (
        <div className="tags_portal_admin_card mt-4">

            <div className="tags_portal_admin_card_header">
                <div>
                    <h2>Header global</h2>
                    <p>
                        Configurá el encabezado que usará el Portal Público.
                    </p>
                </div>
            </div>

            <div className="tags_portal_admin_grid_2">

                <label className="tags_portal_check">
                    <input
                        type="checkbox"
                        checked={value.showLogo !== false}
                        onChange={(e) =>
                            update("showLogo", e.target.checked)
                        }
                    />
                    Mostrar logo
                </label>

                <label className="tags_portal_check">
                    <input
                        type="checkbox"
                        checked={value.showTitle !== false}
                        onChange={(e) =>
                            update("showTitle", e.target.checked)
                        }
                    />
                    Mostrar título
                </label>

                <label className="tags_portal_check">
                    <input
                        type="checkbox"
                        checked={value.showSubtitle === true}
                        onChange={(e) =>
                            update("showSubtitle", e.target.checked)
                        }
                    />
                    Mostrar subtítulo
                </label>

                <label className="tags_portal_check">
                    <input
                        type="checkbox"
                        checked={value.showMenu !== false}
                        onChange={(e) =>
                            update("showMenu", e.target.checked)
                        }
                    />
                    Mostrar menú
                </label>

                <label className="tags_portal_check">
                    <input
                        type="checkbox"
                        checked={value.showWhatsapp === true}
                        onChange={(e) =>
                            update("showWhatsapp", e.target.checked)
                        }
                    />
                    Mostrar WhatsApp
                </label>

                <label className="tags_portal_check">
                    <input
                        type="checkbox"
                        checked={value.sticky === true}
                        onChange={(e) =>
                            update("sticky", e.target.checked)
                        }
                    />
                    Header sticky
                </label>

                <label className="tags_portal_check">
                    <input
                        type="checkbox"
                        checked={value.transparent === true}
                        onChange={(e) =>
                            update("transparent", e.target.checked)
                        }
                    />
                    Transparente
                </label>

                <label className="tags_portal_check">
                    <input
                        type="checkbox"
                        checked={value.showCta === true}
                        onChange={(e) =>
                            update("showCta", e.target.checked)
                        }
                    />
                    Mostrar botón CTA
                </label>

                <div className="tags_modal_group">
                    <label className="tags_modal_label">
                        Texto CTA
                    </label>

                    <input
                        className="tags_modal_input"
                        value={value.ctaLabel || ""}
                        onChange={(e) =>
                            update("ctaLabel", e.target.value)
                        }
                        placeholder="Ej: Contactar"
                    />
                </div>

                <div className="tags_modal_group">
                    <label className="tags_modal_label">
                        URL CTA
                    </label>

                    <input
                        className="tags_modal_input"
                        value={value.ctaUrl || ""}
                        onChange={(e) =>
                            update("ctaUrl", e.target.value)
                        }
                        placeholder="https://..."
                    />
                </div>

                <div className="tags_modal_group">
                    <label className="tags_modal_label">
                        Menú hamburguesa
                    </label>

                    <select
                        className="tags_modal_input"
                        value={value.drawerPosition || "right"}
                        onChange={(e) =>
                            update("drawerPosition", e.target.value)
                        }
                    >
                        <option value="right">Desde la derecha</option>
                        <option value="left">Desde la izquierda</option>
                        <option value="top">Desde arriba</option>
                    </select>
                </div>

                <div className="tags_modal_group">
                    <label className="tags_modal_label">
                        Alineación
                    </label>

                    <select
                        className="tags_modal_input"
                        value={value.align || "left"}
                        onChange={(e) =>
                            update("align", e.target.value)
                        }
                    >
                        <option value="left">Izquierda</option>
                        <option value="center">Centro</option>
                        <option value="right">Derecha</option>
                    </select>
                </div>

                <div className="tags_modal_group">
                    <label className="tags_modal_label">
                        Altura
                    </label>

                    <input
                        className="tags_modal_input"
                        value={value.height || ""}
                        onChange={(e) =>
                            update("height", e.target.value)
                        }
                        placeholder="Ej: 76px"
                    />
                </div>

                <div className="tags_modal_group">
                    <label className="tags_modal_label">
                        Ancho máximo
                    </label>

                    <input
                        className="tags_modal_input"
                        value={value.maxWidth || ""}
                        onChange={(e) =>
                            update("maxWidth", e.target.value)
                        }
                        placeholder="Ej: 1180px"
                    />
                </div>

                <div className="tags_modal_group">
                    <label className="tags_modal_label">
                        Espaciado superior
                    </label>

                    <select
                        className="tags_modal_input"
                        value={value.paddingTop || "12px"}
                        onChange={(e) =>
                            update("paddingTop", e.target.value)
                        }
                    >
                        {["0px", "4px", "8px", "12px", "16px", "20px", "24px", "32px", "40px", "48px", "56px", "64px"].map(item => (
                            <option key={item} value={item}>
                                {item}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="tags_modal_group">
                    <label className="tags_modal_label">
                        Espaciado inferior
                    </label>

                    <select
                        className="tags_modal_input"
                        value={value.paddingBottom || "12px"}
                        onChange={(e) =>
                            update("paddingBottom", e.target.value)
                        }
                    >
                        {["0px", "4px", "8px", "12px", "16px", "20px", "24px", "32px", "40px", "48px", "56px", "64px"].map(item => (
                            <option key={item} value={item}>
                                {item}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="tags_modal_group">
                    <label className="tags_modal_label">
                        Color fondo
                    </label>

                    <input
                        className="tags_modal_input"
                        type="color"
                        value={value.backgroundColor || themeTokens["--qr-surface"] || "#ffffff"}
                        onChange={(e) =>
                            update("backgroundColor", e.target.value)
                        }
                    />
                </div>

                <div className="tags_modal_group">
                    <label className="tags_modal_label">
                        Color texto
                    </label>

                    <input
                        className="tags_modal_input"
                        type="color"
                        value={value.textColor || "#111827"}
                        onChange={(e) =>
                            update("textColor", e.target.value)
                        }
                    />
                </div>

            </div>

            <div className="tags_portal_typography_grid mt-4">
                <PortalTypographyEditor
                    title="Tipografía del título"
                    value={value.typography?.title || {}}
                    onChange={(nextValue) =>
                        updateTypography("title", nextValue)
                    }
                />

                <PortalTypographyEditor
                    title="Tipografía del subtítulo"
                    value={value.typography?.subtitle || {}}
                    onChange={(nextValue) =>
                        updateTypography("subtitle", nextValue)
                    }
                />

                <PortalTypographyEditor
                    title="Tipografía del menú"
                    value={value.typography?.menu || {}}
                    onChange={(nextValue) =>
                        updateTypography("menu", nextValue)
                    }
                />
            </div>

        </div>
    );
}