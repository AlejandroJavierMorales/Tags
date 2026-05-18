"use client";

import { useState } from "react";

export default function CreateQR() {
    const [form, setForm] = useState({
        label: "",
        destination_url: "",
        destination_type: "url"
    });

    async function handleSubmit() {
        await fetch("/api/qr/create", {
            method: "POST",
            body: JSON.stringify({
                ...form,
                business_id: 1
            })
        });
    }

    return (
        <div>
            <input
                placeholder="Label"
                onChange={e => setForm({ ...form, label: e.target.value })}
            />

            <input
                placeholder="URL"
                onChange={e => setForm({ ...form, destination_url: e.target.value })}
            />

            <button onClick={handleSubmit}>
                Crear QR
            </button>
        </div>
    );
}