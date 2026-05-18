"use client";

import { useMemo, useState } from "react";

export default function QRSelect({ qrs = [], value, onChange }) {
    const [search, setSearch] = useState("");

    // =============================
    // SAFE FILTER (sin mutar data)
    // =============================
    const filtered = useMemo(() => {
        if (!Array.isArray(qrs)) return [];

        const safe = [...qrs];

        if (!search.trim()) return safe;

        const q = search.toLowerCase();

        return safe.filter(item => {
            const code = (item.code || "").toLowerCase();
            const label = (item.label || "").toLowerCase();

            return code.includes(q) || label.includes(q);
        });
    }, [search, qrs]);

    // =============================
    // UI
    // =============================
    return (
        <div className="card p-3 mb-3 tags_text_normal">

            {/* LABEL */}
            <label className="form-label fw-semibold">
                QR Selector
            </label>

            {/* SEARCH */}
            <input
                type="text"
                className="form-control mb-2 tags_text_normal"
                placeholder="Buscar por código o nombre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />

            {/* SELECT */}
            <select
                className="form-select  tags_text_normal"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            >
                <option value="all">📊 Todos los QRs</option>

                {filtered.map((q) => (
                    <option key={q.id} value={q.id}>
                        {q.code}
                        {q.label ? ` — ${q.label}` : ""}
                    </option>
                ))}
            </select>

            {/* INFO FOOTER */}
            <div className="text-muted small mt-2">
                {filtered.length} resultado(s)
            </div>

        </div>
    );
}