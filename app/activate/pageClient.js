"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { FaQrcode } from "react-icons/fa";
import { getValueLabel } from "../lib/helpers/getValueLabel";

export const dynamic = "force-dynamic";


function getQRUrl(code) {
    const base = process.env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : process.env.NEXT_PUBLIC_BASE_URL;

    const url = `${base}/t/${code}`;

    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
}

export default function SetupQRClient({ searchParams }) {
    const params = searchParams;

    const [email, setEmail] = useState("");

    // ❌ ELIMINADO qrTypeId
    const [qrTypeCode, setQrTypeCode] = useState("");
    const [qrUrlPrefix, setQrUrlPrefix] = useState("");

    const [label, setLabel] = useState("");
    const [phone, setPhone] = useState("");
    const [code, setCode] = useState("");
    const [value, setValue] = useState("");

    const [message, setMessage] = useState("");
    const [saved, setSaved] = useState(false);
    const [finalUrl, setFinalUrl] = useState("");

    // =============================
    // LOAD QR DATA
    // =============================
    useEffect(() => {
        const codeParam = params?.code;
        if (!codeParam) return;

        const upper = codeParam.toUpperCase();
        setCode(upper);

        fetch(`/api/qr/get?code=${upper}`)
            .then(r => r.json())
            .then(data => {
                if (!data) return;

                setLabel(data.label || "");
                setPhone(data.phone || "");
                setValue(data.value || "");
                setQrTypeCode(data.qr_type_code || "");
                setQrUrlPrefix(data.qr_url_prefix || "");

                if (data.email) {
                    setEmail(data.email);
                }
            });
    }, []);

    // =============================
    // VALIDACIÓN
    // =============================
    function validate() {
        if (!qrTypeCode) {
            return { error: "Tipo de QR inválido" };
        }

        if (!email) return { error: "Email obligatorio" };

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) return { error: "Email inválido" };

        if (!value) return { error: "Valor requerido" };

        let normalized = value.trim();

        if (qrTypeCode === "whatsapp") {
            if (!/^[0-9+\s()-]+$/.test(normalized)) {
                return { error: "Solo números en WhatsApp" };
            }

            const phone = normalized.replace(/\D/g, "");

            if (phone.length < 10 || phone.length > 15) {
                return { error: "Número inválido" };
            }

            normalized = phone;
        }

        if (qrTypeCode === "instagram") {
            if (!/^[a-zA-Z0-9._]+$/.test(normalized)) {
                return { error: "Usuario inválido" };
            }
        }

        if (qrTypeCode === "website" || qrTypeCode === "google") {
            let url = normalized;

            if (!url.includes(".")) {
                return { error: "Ingresá una URL válida" };
            }

            if (!/^https?:\/\//i.test(url)) {
                url = "https://" + url;
            }

            try {
                const parsed = new URL(url);
                const hostname = parsed.hostname.toLowerCase();

                if (hostname === "localhost" || hostname.startsWith("127.")) {
                    return { error: "URL inválida" };
                }

                const parts = hostname.split(".");
                if (parts.length < 2 || parts[parts.length - 1].length < 2) {
                    return { error: "Dominio inválido" };
                }

                if (!/^[a-z0-9.-]+$/.test(hostname)) {
                    return { error: "URL inválida" };
                }

                normalized = url;

            } catch {
                return { error: "URL inválida" };
            }
        }

        return { value: normalized };
    }

    // =============================
    // BUILD FINAL URL
    // =============================
    function buildFinalUrl(cleanValue) {
        if (!cleanValue) return "";

        // 🔥 ahora viene del PRODUCTO
        if (qrUrlPrefix) {
            return qrUrlPrefix + cleanValue;
        }

        // fallback (por si algún producto no tiene prefix)
        if (qrTypeCode === "whatsapp") {
            let phone = cleanValue.replace(/\D/g, "");
            if (!phone.startsWith("54")) phone = "54" + phone;
            if (!phone.startsWith("549")) phone = "549" + phone.slice(2);
            return `https://wa.me/${phone}`;
        }

        if (qrTypeCode === "instagram") {
            return `https://instagram.com/${cleanValue}`;
        }

        if (qrTypeCode === "facebook") {
            return `https://facebook.com/${cleanValue}`;
        }

        if (qrTypeCode === "website" || qrTypeCode === "google") {
            return cleanValue.startsWith("http") ? cleanValue : `https://${cleanValue}`;
        }

        return cleanValue;
    }

    // =============================
    // SAVE (ACTIVAR / REACTIVAR)
    // =============================
    async function handleSave() {
        const result = validate();

        if (result.error) {
            setMessage("❌ " + result.error);
            return;
        }

        const cleanValue = result.value;
        setValue(cleanValue);

        const res = await fetch("/api/qr/setup", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                code,
                label,
                value: cleanValue,
                email,
                phone
            })
        });

        const data = await res.json();

        if (!res.ok) {
            setMessage("❌ " + (data.error || "Error"));
            return;
        }

        const url = buildFinalUrl(cleanValue);

        setFinalUrl(url);
        setSaved(true);
        setMessage("✅ QR Re-Activado correctamente");
    }

    // =============================
    // REDIRECT FINAL
    // =============================
    function handleRedirect() {
        if (finalUrl) {
            window.location.href = finalUrl;
        }
    }

    // =============================
    // UI
    // =============================
    return (
        <div className="tags_container m-0 p-0">
            <h1 className="tags_text_normal text-center p-1"
                style={{ backgroundColor: "#0fd15a", color: "#fff" }}>
                Tags - Plataforma de Gestión y Reporting de Códigos QR
            </h1>

            <div>
                <div className="tags_row tags_setup_layout p-2">

                    {/* LEFT - FORM */}
                    <div className="tags_form" style={{ maxWidth: "600px" }}>
                        <div className="row d-flex justify-contenr-start align-items-center" >
                            <div className="col-4">
                                <Image
                                    src={`/logo_tags_transparente.webp`}
                                    className={`img-fluid m-0 p-0`}
                                    alt="Tags"
                                    width={196}
                                    height={160}
                                />
                            </div>
                            <div className="col-8 text-center">
                                <h2 className="tags_title_super" style={{ fontWeight: "700" }}>
                                    Bienvenido/a a Tags!
                                </h2>
                                <h2 className="tags_title">
                                    Re-Activá Tu QR 👇
                                </h2>
                            </div>
                        </div>

                        {/* CLIENTE */}
                        <div className="tags_card_block">
                            <p className="tags_title">👤 Cliente</p>

                            <label>Email</label>
                            <input
                                className="form-control tags_text_normal"
                                style={{ backgroundColor: "#cefbea" }}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        {/* QR INFO */}
                        <div className="tags_card_block text-center tags_text_normal" style={{ backgroundColor: "#0fd15a" }}>
                            <h4><FaQrcode /> QR</h4>

                            <input
                                className="tags_input rounded m-1 text-center"
                                style={{ backgroundColor: "#e1e7e5" }}
                                value={`Código: ${code}`}
                                disabled
                            />

                            <input
                                className="tags_input rounded m-1 text-center"
                                style={{ backgroundColor: "#e1e7e5" }}
                                value={qrTypeCode ? `Tipo: ${qrTypeCode.toUpperCase()}` : "-"}
                                disabled
                            />
                        </div>

                        {/* VALUE */}
                        <div className="tags_card_block">
                            <p className="tags_title">🔗 Tu Link</p>

                            <label>
                                {getValueLabel(qrTypeCode).label}
                            </label>

                            <input
                                className="form-control tags_text_normal"
                                placeholder={getValueLabel(qrTypeCode).place}
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                            />

                            <input
                                className="form-control mt-2"
                                placeholder="Nombre del QR"
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                            />
                        </div>

                        <button
                            className="tags_btn rounded tags_text_normal"
                            onClick={handleSave}
                        >
                            Re-Activar QR
                        </button>

                        <p>{message}</p>
                    </div>

                    {/* RIGHT */}
                    <div className="tags_qr tags_qr_sticky">
                        <div className="tags_qr_card d-flex flex-column justify-content-center align-items-center">
                            <p className="tags_qr_code">Tu QR</p>

                            {/* <Image
                                src={getQRUrl(code)}
                                alt="QR"
                                width={240}
                                height={240}
                            /> */}
                            <img
                                src={getQRUrl(code)}
                                alt="QR"
                                width={240}
                                height={240}
                            />

                            <p>{code}</p>

                            {saved && (
                                <>
                                    <button
                                        className="tags_btn rounded"
                                        onClick={handleRedirect}>
                                        Probar enlace
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}