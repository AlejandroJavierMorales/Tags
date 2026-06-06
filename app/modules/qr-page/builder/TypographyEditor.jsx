export default function TypographyEditor({
    title,
    value = {},
    onChange
}) {

    function update(field, fieldValue) {

        onChange({
            ...value,
            [field]: fieldValue
        });
    }

    return (
        <div className="qr_page_typography_group">

            <h3>{title}</h3>

            <div className="qr_page_grid_4">

                <div className="qr_page_field">

                    <label>Tamaño</label>

                    <select
                        className="qr_page_select"
                        value={value.fontSize || ""}
                        onChange={(e) =>
                            update(
                                "fontSize",
                                e.target.value
                            )
                        }
                    >
                        <option value="">Default</option>
                        <option value="10px">12px</option>
                        <option value="11px">14px</option>
                        <option value="12px">12px</option>
                        <option value="14px">14px</option>
                        <option value="16px">16px</option>
                        <option value="18px">18px</option>
                        <option value="20px">20px</option>
                        <option value="24px">24px</option>
                        <option value="28px">28px</option>
                        <option value="32px">32px</option>
                        <option value="38px">38px</option>
                        <option value="42px">42px</option>
                        <option value="48px">48px</option>
                        <option value="56px">56px</option>
                        <option value="64px">64px</option>
                        <option value="72px">72px</option>

                    </select>

                </div>

                <div className="qr_page_field">

                    <label>Peso</label>

                    <select
                        className="qr_page_select"
                        value={value.fontWeight || ""}
                        onChange={(e) =>
                            update(
                                "fontWeight",
                                e.target.value
                            )
                        }
                    >
                        <option value="">Default</option>

                        <option value="300">
                            Light
                        </option>

                        <option value="400">
                            Regular
                        </option>

                        <option value="500">
                            Medium
                        </option>

                        <option value="600">
                            Semi Bold
                        </option>

                        <option value="700">
                            Bold
                        </option>

                        <option value="800">
                            Extra Bold
                        </option>

                        <option value="900">
                            Black
                        </option>

                    </select>

                </div>

                <div className="qr_page_field">

                    <label>Interlineado</label>

                    <select
                        className="qr_page_select"
                        value={value.lineHeight || ""}
                        onChange={(e) =>
                            update(
                                "lineHeight",
                                e.target.value
                            )
                        }
                    >
                        <option value="">Default</option>

                        <option value="1">
                            Compacto
                        </option>

                        <option value="1.2">
                            Ajustado
                        </option>

                        <option value="1.5">
                            Normal
                        </option>

                        <option value="1.8">
                            Amplio
                        </option>

                        <option value="2">
                            Muy amplio
                        </option>

                    </select>

                </div>

                <div className="qr_page_field">

                    <label>Espaciado</label>

                    <select
                        className="qr_page_select"
                        value={value.letterSpacing || ""}
                        onChange={(e) =>
                            update(
                                "letterSpacing",
                                e.target.value
                            )
                        }
                    >
                        <option value="">Default</option>

                        <option value="-2px">
                            Muy compacto
                        </option>

                        <option value="-1px">
                            Compacto
                        </option>

                        <option value="0px">
                            Normal
                        </option>

                        <option value="1px">
                            Amplio
                        </option>

                        <option value="2px">
                            Muy amplio
                        </option>

                    </select>

                </div>

            </div>

        </div>
    );
}