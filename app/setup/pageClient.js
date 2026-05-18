"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { FaQrcode } from "react-icons/fa";
import { getValueLabel } from "../lib/helpers/getValueLabel";

export const dynamic = "force-dynamic";



function getQRUrl(code) {
    /* const base = "http://localhost:3000"; */
    const base = process.env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : process.env.NEXT_PUBLIC_BASE_URL;

    const url = `${base}/t/${code}`;

    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
}

export default function SetupQRClient({ searchParams }) {

    const codeParam = searchParams?.code;

    const [productId, setProductId] = useState("");
    const [productCode, setProductCode] = useState(""); // ej: whatsapp, instagram, etc
    const [email, setEmail] = useState("");

    const [label, setLabel] = useState("");
    const [phone, setPhone] = useState("");
    const [code, setCode] = useState("");
    const [value, setValue] = useState("");
    const [name, setName] = useState("");

    const [message, setMessage] = useState("");
    const [saved, setSaved] = useState(false);
    const [finalUrl, setFinalUrl] = useState("");

    // -----------------------------
    // LOAD QR DATA
    // -----------------------------
    useEffect(() => {

        if (!codeParam) return;

        const upper = codeParam.toUpperCase();
        setCode(upper);

        fetch(`/api/qr/get?code=${upper}`)
            .then(r => r.json())
            .then(data => {
                if (!data) return;
                console.log(JSON.stringify(data, null, 2))
                setLabel(data.label || "");
                setLabel(data.name || "");
                setProductId(String(data.product_id || ""));
                setProductCode(data.qr_type_code || "");
                setValue(data.value || "");

                if (data.email) {
                    setEmail(data.email);
                }
            });
    }, []);

    // -----------------------------
    // VALIDACIÓN
    // -----------------------------
    function validate() {
        if (!productCode) {
            return { error: "Tipo de QR inválido" };
        }
        if (!email) return { error: "Email obligatorio" };

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) return { error: "Email inválido" };

        if (!value) return { error: "Valor requerido" };

        let normalized = value.trim();

        // -----------------------------
        // WHATSAPP
        // -----------------------------
        if (productCode === "whatsapp") { //aca no coicide porque 
            if (!/^[0-9+\s()-]+$/.test(normalized)) {
                return { error: "Solo números en WhatsApp" };
            }

            const phone = normalized.replace(/\D/g, "");

            if (phone.length < 10 || phone.length > 15) {
                return { error: "Número inválido" };
            }

            normalized = phone;
        }

        // -----------------------------
        // INSTAGRAM
        // -----------------------------
        if (productCode === "instagram") {
            if (!/^[a-zA-Z0-9._]+$/.test(normalized)) {
                return { error: "Usuario inválido" };
            }
        }

        // -----------------------------
        // URL / GOOGLE
        // -----------------------------
        if (productCode === "website" || productCode === "google") {
            let url = normalized;

            // 🚫 NO permitir strings sin punto (esto mata "asdf", "pp", etc)
            if (!url.includes(".")) {
                return { error: "Ingresá una URL válida" };
            }

            // agregar protocolo si falta
            if (!/^https?:\/\//i.test(url)) {
                url = "https://" + url;
            }

            try {
                const parsed = new URL(url);
                const hostname = parsed.hostname.toLowerCase();

                // 🚫 localhost
                if (hostname === "localhost" || hostname.startsWith("127.")) {
                    return { error: "URL inválida" };
                }

                // 🚫 dominio sin extensión válida
                const parts = hostname.split(".");
                if (parts.length < 2 || parts[parts.length - 1].length < 2) {
                    return { error: "Dominio inválido" };
                }

                // 🚫 caracteres inválidos
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

    // -----------------------------
    // BUILD FINAL URL (preview)
    // -----------------------------
    function buildFinalUrl() {
        if (productCode === "whatsapp") {
            let phone = value.replace(/\D/g, "");

            if (!phone.startsWith("54")) phone = "54" + phone;
            if (!phone.startsWith("549")) phone = "549" + phone.slice(2);

            return `https://wa.me/${phone}`;
        }

        if (productCode === "instagram") {
            return `https://instagram.com/${value}`;
        }

        if (productCode === "facebook") {
            return `https://facebook.com/${value}`;
        }

        if (productCode === "website" || productCode === "url" || productCode === "google") {
            return value.startsWith("http") ? value : `https://${value}`;
        }
        if (productCode === "digital") {
            return value.startsWith("http") ? value : `${value}`;
        }

        return `https://${value}`;
    }

    // -----------------------------
    // SAVE
    // -----------------------------
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
                product_id: Number(productId),
                value: cleanValue,
                finalUrl,
                email,
                phone,
                name
            })
        });

        const data = await res.json();

        if (!res.ok) {
            setMessage("❌ " + (data.error || "Error"));
            return;
        }

        const url = buildFinalUrl();
        setFinalUrl(url);
        setSaved(true);
        setMessage("✅ QR activado correctamente");
    }

    // -----------------------------
    // REDIRECT FINAL
    // -----------------------------
    function handleRedirect() {

        if (finalUrl) {
            window.location.href = finalUrl;
        }
    }

    // -----------------------------
    // UI
    // -----------------------------
    return (
        <div className="tags_container m-0 p-0">
            <h1 className="tags_text_normal text-center p-1" style={{ backgroundColor: "#0fd15a", color: "#fff" }}
            >Tags - Plataforma de Gestión y Reporting de Códigos QR</h1>
            <div >
                <div className="tags_row tags_setup_layout p-2">


                    {/* LEFT - FORM */}
                    <div className="tags_form" style={{ maxWidth: "600px" }}>
                        <div className="row d-flex justify-contenr-start align-items-center" >
                            <div className="col-4">
                                <Image
                                    src={`/logo_tags_transparente.webp`}
                                    className={`img-fluid m-0 p-0`}
                                    alt="Tags - Sistema de Gestión y Reporting de Códigos QR"
                                    width={196}
                                    height={160}
                                /* style={{ height: 'auto' }} */
                                />
                            </div>
                            <div className="col-8 text-center">
                                <h2 className="tags_title_super" style={{ fontWeight: "700" }}>Bienvenido/a a Tags!</h2>
                                <h2 className="tags_title">Configurá Tu QR 👇</h2>
                            </div>
                        </div>


                        {/* CLIENTE */}
                        <div className="tags_card_block">
                            <p className="tags_title">👤 Cliente</p>
                            <div>
                                <div>
                                    <label className="tags_text_normal ps-1">Email - (obligatorio)</label>
                                </div>
                                <div>
                                    <input
                                        className="form-control tags_text_normal"
                                        style={{ backgroundColor: "#cefbea" }}
                                        /* placeholder="Email" */
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>


                            <div className="row d-flex justify-content-center align-items-center">
                                <div className="col-12 col-md-6">
                                    <div>
                                        <label className="tags_text_normal ps-1 mt-3" style={{ maxWidth: "250px" }}>Nombre (opcional)</label>
                                    </div>
                                    <div>
                                        <input
                                            className="form-control tags_text_normal"
                                            /* placeholder="Teléfono (opcional)" */
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="col-12 col-md-6">
                                    <div>
                                        <label className="tags_text_normal ps-1 mt-3" style={{ maxWidth: "250px" }}>Telefono (opcional)</label>
                                    </div>
                                    <div>
                                        <input
                                            className="form-control tags_text_normal"
                                            /* placeholder="Teléfono (opcional)" */
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                        />
                                    </div>
                                </div>

                            </div>

                        </div>

                        {/* QR INFO */}
                        <div className="tags_card_block  text-center tags_text_normal" style={{ backgroundColor: "#0fd15a" }}>
                            <h4><FaQrcode /> QR</h4>

                            <input className="tags_input rounded m-1 text-center"
                                value={`Código: ${code}`}
                                disabled style={{ backgroundColor: "#e1e7e5" }} />

                            <input
                                className="tags_input rounded m-1 text-center"
                                style={{ backgroundColor: "#e1e7e5" }}
                                value={
                                    productCode
                                        ? `Tipo: ${String(productCode).toUpperCase()}`
                                        : "-"
                                }
                                disabled
                            />
                        </div>

                        {/* VALUE */}
                        <div className="row d-flex justify-content-center align-items-center tags_card_block">

                            <p className="tags_title">🔗 Tu Link</p>
                            <div>
                                <label className="tags_text_destacado ps-1 mt-2">{getValueLabel(productCode).label}</label>
                                <span className="tags_text_normal">{`  (obligatorio)`}</span>
                            </div>
                            <div className="">
                                <input
                                    className="form-control tags_text_normal"
                                    placeholder={getValueLabel(productCode).place}
                                    value={value}
                                    onChange={(e) => setValue(e.target.value)}
                                    style={{ backgroundColor: "#cefbea" }}
                                />
                            </div>
                            <div>
                                <div>
                                    <label className="tags_text_normal ps-1 mt-2">Nombre del Qr (opcional)</label>
                                </div>
                                <input
                                    className="form-control tags_text_normal"
                                    /* placeholder="Nombre / Label" */
                                    value={label}
                                    onChange={(e) => setLabel(e.target.value)}
                                />
                            </div>
                        </div>


                        <button className="tags_btn rounded tags_text_normal" onClick={handleSave}>
                            Activar QR
                        </button>

                        <p className="tags_text_normal">{message}</p>

                    </div>

                    {/* RIGHT - QR FIXED */}
                    <div className="tags_qr tags_qr_sticky tags_text_normal mb-5">


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

                            <p className="tags_qr_code">{code}</p>

                            {saved && (
                                <>
                                    <p>Escaneá el QR y probá el enlace</p>

                                    <button
                                        className="tags_btn rounded"
                                        onClick={handleRedirect}
                                    >
                                        Enlace OK
                                    </button>
                                </>
                            )}

                        </div>

                    </div>

                </div >
            </div>
        </div >
    );
}