"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import TagsHeader from "../../components/Header";

function getQRUrl(code) {
    /* const base = "http://localhost:3000"; */
    const base = process.env.NODE_ENV === "development"
            ? "http://localhost:3000"
            : process.env.NEXT_PUBLIC_BASE_URL;
            
    const url = `${base}/t/${code}`;

    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
}

export default function QRsPage() {
    const [qrs, setQrs] = useState([]);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);

    // -----------------------------
    // LOAD DATA
    // -----------------------------


    useEffect(() => {

        const delay = setTimeout(() => {
            loadData();
        }, 300);
        
        return () => clearTimeout(delay);
        //eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, search]);

    async function loadData() {
        setLoading(true);

        const res = await fetch(
            `/api/qr/list?page=${page}&q=${search}`
        );

        const data = await res.json();

        setQrs(data);
        setLoading(false);
    }

    // -----------------------------
    // DELETE QR
    // -----------------------------
    async function deleteQR(id) {
        if (!confirm("¿Eliminar QR?")) return;

        await fetch(`/api/qr/delete?id=${id}`, {
            method: "DELETE"
        });

        setQrs(prev => prev.filter(q => q.id !== id));
    }

    // -----------------------------
    // DEACTIVATE QR
    // -----------------------------
    async function handleDeactivate(code) {
        if (!confirm("¿Desactivar este QR?")) return;

        const res = await fetch("/api/qr/deactivate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ code })
        });

        if (res.ok) {
            loadData();
        } else {
            alert("Error al desactivar QR");
        }
    }

    // -----------------------------
    // UI
    // -----------------------------
    return (
        <div className="container-fluid tags_container m-0 p-0">
            <TagsHeader />
            <h1 className="mt-3">Gestión de QRs</h1>

            {/* SEARCH */}
            <input
                className="tags_input"
                placeholder="Buscar QR, código o cliente..."
                value={search}
                onChange={(e) => {
                    setPage(1);
                    setSearch(e.target.value);
                }}
            />

            <Link href="/dashboard/create" className="tags_btn rounded ms-2" style={{ maxWidth: "150px" }}>
                ✚ Crear QR
            </Link>

            {loading && <p>Cargando...</p>}

            {/* GRID */}
            <div className="tags_grid">

                {qrs.map(qr => {

                    const isActive = qr?.status === 'active';

                    return (
                        <div key={qr.id} className="tags_card_grid">

                            <Image
                                src={getQRUrl(qr.code)}
                                width={120}
                                height={120}
                                alt="qr"
                            />

                            <b>{qr.label}</b>

                            <div>{qr.code}</div>

                            {/* tipo QR */}
                            {qr.qr_type_name && (
                                <div style={{ fontSize: 12, opacity: 0.7 }}>
                                    {qr.qr_type_name}
                                </div>
                            )}

                            {/* estado */}
                            <div>
                                {
                                    qr.status === "active"
                                        ? "🟢 Activo"
                                        : qr.status === "assigned"
                                            ? "🟡 Asignado"
                                            : qr.status === "available"
                                                ? "⚪ Disponible"
                                                : qr.status === "disabled"
                                                    ? "🔴 Deshabilitado"
                                                    : qr.status === "pending"
                                                        ? "🟠 Pendiente"
                                                        : qr.status
                                }
                            </div>

                            {/* acciones */}
                            <div className="tags_actions">

                                <Link href={`/setup?code=${qr.code}`}>
                                    Editar
                                </Link>

                                <button onClick={() => deleteQR(qr.id)}>
                                    Eliminar
                                </button>

                                {/* 🔥 BOTÓN DESACTIVAR */}
                                {isActive && (
                                    <button onClick={() => handleDeactivate(qr.code)}>
                                        Desactivar
                                    </button>
                                )}

                            </div>

                        </div>
                    );
                })}

            </div>

            {/* PAGINACIÓN */}
            <div className="tags_pagination">

                <button onClick={() => setPage(p => Math.max(1, p - 1))}>
                    ◀
                </button>

                <span>Página {page}</span>

                <button onClick={() => setPage(p => p + 1)}>
                    ▶
                </button>

            </div>

        </div>
    );
}