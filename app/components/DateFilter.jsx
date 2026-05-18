"use client";

import { useState } from "react";

function formatDate(dateStr) {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("es-AR");
}

function addOneDay(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    d.setDate(d.getDate() + 1);
    return d;
}

export default function DateFilter({ onChange }) {
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");

    function handleSubmit() {
        onChange({ from, to });
    }

    return (
        <div className="card p-3 mb-3 tags_text_normal">

            {/* ===================== ROW RESPONSIVE ===================== */}
            <div className="row g-3 align-items-end">

                {/* DATE PICKERS */}
                <div className="col-12">

                    <div className="date-filter-row d-flex gap-3">

                        <div className="flex-fill">
                            <label className="form-label">Desde</label>
                            <input
                                type="date"
                                className="form-control tags_text_normal"
                                value={from}
                                onChange={(e) => setFrom(e.target.value)}
                            />
                        </div>

                        <div className="flex-fill">
                            <label className="form-label">Hasta</label>
                            <input
                                type="date"
                                className="form-control tags_text_normal"
                                value={to}
                                onChange={(e) => setTo(e.target.value)}
                            />
                        </div>

                    </div>
                </div>

                {/* BUTTON */}
                <div className="col-12 col-sm-6">
                    <button
                        className="btn btn-primary w-100 m-0"
                        style={{fontSize:"14px"}}
                        onClick={handleSubmit}
                    >
                        Filtrar
                    </button>
                </div>

            </div>

        </div>
    );
}