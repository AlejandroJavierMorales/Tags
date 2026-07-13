// =====================================
// COMPONENT: app/modules/portal/components/PortalFooterEditor.jsx
// Descripción: Editor del Footer global del Portal Público.
// =====================================

import PortalTypographyEditor
    from "./PortalTypographyEditor";



export default function PortalFooterEditor({
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
                    <h2>Footer global</h2>
                    <p>
                        Configurá el pie del sitio público del Portal.
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
                    Mostrar nombre
                </label>

                <label className="tags_portal_check">
                    <input
                        type="checkbox"
                        checked={value.showDescription !== false}
                        onChange={(e) =>
                            update("showDescription", e.target.checked)
                        }
                    />
                    Mostrar descripción
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
                        checked={value.showSocials !== false}
                        onChange={(e) =>
                            update("showSocials", e.target.checked)
                        }
                    />
                    Mostrar redes sociales
                </label>

                <label className="tags_portal_check">
                    <input
                        type="checkbox"
                        checked={value.showContact !== false}
                        onChange={(e) =>
                            update("showContact", e.target.checked)
                        }
                    />
                    Mostrar contacto
                </label>

                <label className="tags_portal_check">
                    <input
                        type="checkbox"
                        checked={value.showCopyright !== false}
                        onChange={(e) =>
                            update("showCopyright", e.target.checked)
                        }
                    />
                    Mostrar copyright
                </label>

                <label className="tags_portal_check">
                    <input
                        type="checkbox"
                        checked={value.showPoweredBy !== false}
                        onChange={(e) =>
                            update("showPoweredBy", e.target.checked)
                        }
                    />
                    Mostrar “Desarrollado con Tags”
                </label>

                <div className="tags_modal_group">
                    <label className="tags_modal_label">
                        Columnas
                    </label>

                    <select
                        className="tags_modal_input"
                        value={value.columns || "3"}
                        onChange={(e) =>
                            update("columns", e.target.value)
                        }
                    >
                        <option value="1">1 columna</option>
                        <option value="2">2 columnas</option>
                        <option value="3">3 columnas</option>
                        <option value="4">4 columnas</option>
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
                        Espaciado superior
                    </label>

                    <select
                        className="tags_modal_input"
                        value={value.paddingTop || "34px"}
                        onChange={(e) =>
                            update("paddingTop", e.target.value)
                        }
                    >
                        {["0px", "8px", "12px", "16px", "20px", "24px", "32px", "34px", "40px", "48px", "56px", "64px", "72px", "90px"].map(item => (
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
                        value={value.paddingBottom || "18px"}
                        onChange={(e) =>
                            update("paddingBottom", e.target.value)
                        }
                    >
                        {["0px", "8px", "12px", "16px", "18px", "20px", "24px", "32px", "40px", "48px", "56px", "64px", "72px"].map(item => (
                            <option key={item} value={item}>
                                {item}
                            </option>
                        ))}
                    </select>
                </div>

                <label className="tags_portal_check">
                    <input
                        type="checkbox"
                        checked={value.showTopBorder !== false}
                        onChange={(e) =>
                            update("showTopBorder", e.target.checked)
                        }
                    />
                    Mostrar separador superior
                </label>

                <div className="tags_modal_group">
                    <label className="tags_modal_label">
                        Fondo
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
                        Texto
                    </label>

                    <input
                        className="tags_modal_input"
                        type="color"
                        value={value.textColor || themeTokens["--qr-text"] || "#111827"}
                        onChange={(e) =>
                            update("textColor", e.target.value)
                        }
                    />
                </div>

                <div className="tags_modal_group">
                    <label className="tags_modal_label">
                        Links
                    </label>

                    <input
                        className="tags_modal_input"
                        type="color"
                        value={value.linkColor || themeTokens["--qr-primary"] || "#0F9D58"}
                        onChange={(e) =>
                            update("linkColor", e.target.value)
                        }
                    />
                </div>

                <div className="tags_modal_group">
                    <label className="tags_modal_label">
                        Hover
                    </label>

                    <input
                        className="tags_modal_input"
                        type="color"
                        value={
                            value.hoverColor ||
                            themeTokens["--qr-primary-hover"] ||
                            themeTokens["--qr-primary"] ||
                            "#0F9D58"
                        }
                        onChange={(e) =>
                            update("hoverColor", e.target.value)
                        }
                    />
                </div>

                <div className="tags_modal_group full">
                    <label className="tags_modal_label">
                        Texto copyright
                    </label>

                    <input
                        className="tags_modal_input"
                        value={value.copyrightText || ""}
                        onChange={(e) =>
                            update("copyrightText", e.target.value)
                        }
                        placeholder="© 2026 Mi negocio. Todos los derechos reservados."
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