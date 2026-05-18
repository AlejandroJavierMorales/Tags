// app/components/contact/ContactForm.jsx

"use client";

import { tagsSiteConfig } from "@/app/config/configSite";
import { useState } from "react";
import "../../styles/tags_contact.css";

export default function ContactForm() {

    const [form, setForm] = useState({
        name: "",
        business: "",
        email: "",
        phone: "",
        service: "Carteles QR físicos",
        message: "",
    });

    const handleChange = (e) => {

        setForm({
            ...form,
            [e.target.name]: e.target.value,
        });

    };

    const handleWhatsapp = () => {

        const text =
`Hola! Quiero consultar por Tags.

Nombre: ${form.name}

Negocio: ${form.business}

Email: ${form.email}

Teléfono: ${form.phone}

Interés:
${form.service}

Mensaje:
${form.message}`;

        const url =
`https://wa.me/${tagsSiteConfig.contact.phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;

        window.open(url, "_blank");

    };

    const handleEmail = () => {

        const subject = encodeURIComponent(
            "Consulta desde Tags"
        );

        const body = encodeURIComponent(
`Nombre: ${form.name}

Negocio: ${form.business}

Email: ${form.email}

Teléfono: ${form.phone}

Interés:
${form.service}

Mensaje:
${form.message}`
        );

        window.location.href =
`mailto:info@tags.com.ar?subject=${subject}&body=${body}`;

    };

    return (

        <form
            onSubmit={(e) => e.preventDefault()}
            className="tags_contact_form"
        >

            <div className="row g-4">

                {/* NOMBRE */}
                <div className="col-12 col-md-6">

                    <label className="tags_contact_label">
                        Nombre
                    </label>

                    <input
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        className="tags_contact_input"
                        placeholder="Tu nombre"
                    />

                </div>

                {/* NEGOCIO */}
                <div className="col-12 col-md-6">

                    <label className="tags_contact_label">
                        Empresa / Negocio
                    </label>

                    <input
                        type="text"
                        name="business"
                        value={form.business}
                        onChange={handleChange}
                        className="tags_contact_input"
                        placeholder="Nombre del negocio"
                    />

                </div>

                {/* EMAIL */}
                <div className="col-12 col-md-6">

                    <label className="tags_contact_label">
                        Email
                    </label>

                    <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        className="tags_contact_input"
                        placeholder="tu@email.com"
                    />

                </div>

                {/* TELEFONO */}
                <div className="col-12 col-md-6">

                    <label className="tags_contact_label">
                        Teléfono
                    </label>

                    <input
                        type="text"
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        className="tags_contact_input"
                        placeholder="+54..."
                    />

                </div>

                {/* SERVICIO */}
                <div className="col-12">

                    <label className="tags_contact_label">
                        ¿Qué necesitás?
                    </label>

                    <select
                        name="service"
                        value={form.service}
                        onChange={handleChange}
                        className="tags_contact_select"
                    >
                        <option>
                            Carteles QR físicos
                        </option>

                        <option>
                            QR digitales
                        </option>

                        <option>
                            Google Reviews
                        </option>

                        <option>
                            Menú digital
                        </option>

                        <option>
                            Plataforma y estadísticas
                        </option>

                        <option>
                            NFC
                        </option>

                        <option>
                            Otro
                        </option>

                    </select>

                </div>

                {/* MENSAJE */}
                <div className="col-12">

                    <label className="tags_contact_label">
                        Mensaje
                    </label>

                    <textarea
                        name="message"
                        value={form.message}
                        onChange={handleChange}
                        className="tags_contact_textarea"
                        rows={6}
                        placeholder="Contanos qué necesitás..."
                    />

                </div>

                {/* BOTONES */}
                <div className="col-12">

                    <div className="tags_contact_buttons">

                        <button
                            type="button"
                            className="tags_contact_btn_primary"
                            onClick={handleWhatsapp}
                        >
                            Enviar por WhatsApp
                        </button>

                        <button
                            type="button"
                            className="tags_contact_btn_secondary"
                            onClick={handleEmail}
                        >
                            Enviar por Email
                        </button>

                    </div>

                </div>

            </div>

        </form>

    );
}