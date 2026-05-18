"use client";

import { useState } from "react";

export default function DateRangeFilter({ onChange }) {
    const [mode, setMode] = useState("month");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [month, setMonth] = useState("2026-04");

    function apply() {
        if (mode === "range") {
            onChange({
                from,
                to,
                month: null
            });
        } else {
            onChange({
                from: null,
                to: null,
                month
            });
        }
    }

    return (
        <div className="card p-3 mb-3" style={{maxWidth:"350px"}}>

            {/* MODE SELECTOR */}
            <div className="d-flex gap-2 mb-3">
                <button
                    className={`btn btn-sm ${mode === "month" ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => setMode("month")}
                >
                    Mes
                </button>

                <button
                    className={`btn btn-sm ${mode === "range" ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => setMode("range")}
                >
                    Rango
                </button>
            </div>

            {/* MONTH PICKER */}
            {mode === "month" && (
                <div className="mb-3">
                    <input
                        type="month"
                        className="form-control"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                    />
                </div>
            )}

            {/* RANGE PICKER */}
            {mode === "range" && (
                <div className="d-flex gap-2 mb-3">
                    <input
                        type="date"
                        className="form-control"
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                    />

                    <input
                        type="date"
                        className="form-control"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                    />
                </div>
            )}

            {/* APPLY */}
            <button className="btn btn-success w-100" onClick={apply}>
                Aplicar filtro
            </button>

        </div>
    );
}