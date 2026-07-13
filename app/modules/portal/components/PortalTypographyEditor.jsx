// =====================================
// COMPONENT: app/modules/portal/components/PortalTypographyEditor.jsx
// Descripción: Editor de tipografía para Header/Footer del Portal.
// =====================================

export default function PortalTypographyEditor({
    title,
    value = {},
    onChange
}) {
    const fontSizes = [
        ["16px", "16px"],,
        ["12px", "12px"],
        ["14px", "14px"],
        ["16px", "16px"],
        ["18px", "18px"],
        ["20px", "20px"],
        ["24px", "24px"],
        ["28px", "28px"],
        ["32px", "32px"],
        ["38px", "38px"],
        ["42px", "42px"],
        ["48px", "48px"],
        ["56px", "56px"],
        ["64px", "64px"],
        ["72px", "72px"]
    ];

    const fontWeights = [
        ["400", "Regular"],
        ["300", "Light"],
        ["400", "Regular"],
        ["500", "Medium"],
        ["600", "Semi Bold"],
        ["700", "Bold"],
        ["800", "Extra Bold"],
        ["900", "Black"]
    ];

    const lineHeights = [
        ["1.5", "Normal"],
        ["1", "Compacto"],
        ["1.2", "Ajustado"],
        ["1.5", "Normal"],
        ["1.8", "Amplio"],
        ["2", "Muy amplio"]
    ];

    const letterSpacings = [
        ["0px", "Normal"],
        ["-2px", "Muy compacto"],
        ["-1px", "Compacto"],
        ["0px", "Normal"],
        ["1px", "Amplio"],
        ["2px", "Muy amplio"]
    ];

    function update(field, nextValue) {
        onChange({
            ...value,
            [field]: nextValue
        });
    }

    return (
        <div className="qr_page_typography_part">
            <h4>{title}</h4>

            <div className="qr_page_grid_4">

                <div>
                    <label>Tamaño</label>
                    <select
                        className="qr_page_select"
                        value={value.fontSize || ""}
                        onChange={(e) => update("fontSize", e.target.value)}
                    >
                        {fontSizes.map(([optionValue, label]) => (
                            <option key={optionValue || "default"} value={optionValue}>
                                {label}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label>Peso</label>
                    <select
                        className="qr_page_select"
                        value={value.fontWeight || ""}
                        onChange={(e) => update("fontWeight", e.target.value)}
                    >
                        {fontWeights.map(([optionValue, label]) => (
                            <option key={optionValue || "default"} value={optionValue}>
                                {label}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label>Interlineado</label>
                    <select
                        className="qr_page_select"
                        value={value.lineHeight || ""}
                        onChange={(e) => update("lineHeight", e.target.value)}
                    >
                        {lineHeights.map(([optionValue, label]) => (
                            <option key={optionValue || "default"} value={optionValue}>
                                {label}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label>Espaciado</label>
                    <select
                        className="qr_page_select"
                        value={value.letterSpacing || ""}
                        onChange={(e) => update("letterSpacing", e.target.value)}
                    >
                        {letterSpacings.map(([optionValue, label]) => (
                            <option key={optionValue || "default"} value={optionValue}>
                                {label}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label>Estilo</label>
                    <select
                        className="qr_page_select"
                        value={value.fontStyle || ""}
                        onChange={(e) => update("fontStyle", e.target.value)}
                    >
                        <option value="">Por defecto</option>
                        <option value="normal">Normal</option>
                        <option value="italic">Italic</option>
                    </select>
                </div>

                <div>
                    <label>Subrayado</label>
                    <select
                        className="qr_page_select"
                        value={value.textDecoration || ""}
                        onChange={(e) => update("textDecoration", e.target.value)}
                    >
                        <option value="">Por defecto</option>
                        <option value="none">Sin subrayado</option>
                        <option value="underline">Subrayado</option>
                    </select>
                </div>

                <div>
                    <label>Alineación</label>
                    <select
                        className="qr_page_select"
                        value={value.textAlign || ""}
                        onChange={(e) => update("textAlign", e.target.value)}
                    >
                        <option value="">Por defecto</option>
                        <option value="left">Izquierda</option>
                        <option value="center">Centro</option>
                        <option value="right">Derecha</option>
                    </select>
                </div>

            </div>
        </div>
    );
}