"use client";

import {
    useEffect,
    useState
} from "react";

import { useParams }
    from "next/navigation";

import {
    FiGlobe,
    FiMail
} from "react-icons/fi";

import {
    FaWhatsapp,
    FaInstagram,
    FaFacebookF
} from "react-icons/fa";



export default function InvitePage() {

    const params =
        useParams();

    const token =
        params.token;

    const [loading, setLoading] =
        useState(true);

    const [submitting, setSubmitting] =
        useState(false);

    const [error, setError] =
        useState("");

    const [data, setData] =
        useState(null);

    const [rsvpStatus, setRsvpStatus] =
        useState("confirmed");

    const [dietaryNotes, setDietaryNotes] =
        useState("");

    const [customDietaryNotes, setCustomDietaryNotes] =
        useState("");

    const [message, setMessage] =
        useState("");

    const [companions, setCompanions] =
        useState([]);

    const [galleryIndexes, setGalleryIndexes] =
        useState({});

    const [now, setNow] =
        useState(Date.now());

    useEffect(() => {

        if (!token) return;

        initialize();

    }, [token]);

    useEffect(() => {

        const interval =
            setInterval(() => {

                setNow(Date.now());

            }, 60000);

        return () =>
            clearInterval(interval);

    }, []);

    useEffect(() => {

        if (!data?.blocks?.length) return;

        const intervals = [];

        data.blocks.forEach(block => {

            const config =
                normalizeConfig(block.config_json);

            const images =
                getGalleryImages(config);

            if (
                block.type === "gallery"
                &&
                config.mode === "carousel"
                &&
                config.autoplay === true
                &&
                images.length > 1
            ) {

                const interval =
                    setInterval(() => {

                        setGalleryIndexes(prev => ({

                            ...prev,

                            [block.id]:
                                (
                                    (prev[block.id] || 0)
                                    + 1
                                ) % images.length
                        }));

                    }, Number(config.autoplay_delay || 3000));

                intervals.push(interval);
            }
        });

        return () => {

            intervals.forEach(item =>
                clearInterval(item)
            );
        };

    }, [data]);

    function normalizeConfig(value) {

        if (!value) return {};

        if (typeof value === "object") {

            return value;
        }

        try {

            return JSON.parse(value);

        } catch (err) {

            return {};
        }
    }

    function getGalleryImages(config) {

        return Array.isArray(config.image_urls)
            ? config.image_urls
            : Array.isArray(config.images)
                ? config.images
                : [];
    }

    async function initialize() {

        try {

            setLoading(true);

            const accessRes =
                await fetch(
                    `/api/events/invitations/public/access?token=${token}`,
                    {
                        cache: "no-store"
                    }
                );

            const accessJson =
                await accessRes.json();

            if (
                !accessRes.ok
                ||
                !accessJson.valid
            ) {

                setError(
                    accessJson.error ||
                    "Invitación inválida"
                );

                return;
            }

            await fetch(
                "/api/events/invitations/public/open-track",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            token,
                            action_type: "open"
                        })
                }
            );

            const viewRes =
                await fetch(
                    `/api/events/invitations/public/view?token=${token}`,
                    {
                        cache: "no-store"
                    }
                );

            const viewJson =
                await viewRes.json();

            if (!viewRes.ok) {

                setError(
                    viewJson.error ||
                    "Error cargando invitación"
                );

                return;
            }

            setData(viewJson);

            setRsvpStatus(
                viewJson.guest?.rsvp_status ||
                "confirmed"
            );

            setDietaryNotes(
                viewJson.guest?.dietary_notes ||
                ""
            );

            setCustomDietaryNotes(
                viewJson.guest?.custom_dietary_notes ||
                ""
            );

            setMessage("");

            setCompanions(
                viewJson.companions || []
            );

        } catch (err) {

            console.log(err);

            setError(
                "Error cargando invitación"
            );

        } finally {

            setLoading(false);
        }
    }

    function addCompanion() {

        const max =
            data?.guest?.plus_ones_allowed ||
            data?.guest?.max_companions ||
            0;

        if (companions.length >= max) {

            return;
        }

        setCompanions([

            ...companions,

            {
                name: "",
                email: "",
                phone: "",
                dietary_notes: ""
            }
        ]);
    }

    function removeCompanion(index) {

        const copy =
            [...companions];

        copy.splice(index, 1);

        setCompanions(copy);
    }

    function updateCompanion(
        index,
        field,
        value
    ) {

        const copy =
            [...companions];

        copy[index] = {

            ...copy[index],

            [field]:
                value
        };

        setCompanions(copy);
    }

    async function submitRsvp() {

        try {

            setSubmitting(true);

            const res =
                await fetch(
                    "/api/events/invitations/public/rsvp",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({

                                token,

                                status:
                                    rsvpStatus,

                                companions,

                                dietary_notes:
                                    dietaryNotes,

                                custom_dietary_notes:
                                    customDietaryNotes,

                                message
                            })
                    }
                );

            const json =
                await res.json();

            if (!res.ok) {

                alert(
                    json.error ||
                    "Error guardando RSVP"
                );

                return;
            }

            alert(
                rsvpStatus === "confirmed"
                    ? "Asistencia confirmada"
                    : "Invitación rechazada"
            );

            await initialize();

        } catch (err) {

            console.log(err);

            alert(
                "Error guardando RSVP"
            );

        } finally {

            setSubmitting(false);
        }
    }

    function getCountdownParts(targetDate) {

        if (!targetDate) {

            return {
                days: "--",
                hours: "--",
                minutes: "--"
            };
        }

        const target =
            new Date(targetDate).getTime();

        const diff =
            Math.max(target - now, 0);

        return {

            days:
                Math.floor(
                    diff / (1000 * 60 * 60 * 24)
                ),

            hours:
                Math.floor(
                    (diff / (1000 * 60 * 60)) % 24
                ),

            minutes:
                Math.floor(
                    (diff / (1000 * 60)) % 60
                )
        };
    }

    function getGoogleMapsEmbedUrl(url) {

        if (!url) return "";

        return url;
    }

    function nextGalleryImage(
        blockId,
        total
    ) {

        setGalleryIndexes(prev => ({

            ...prev,

            [blockId]:
                (
                    (prev[blockId] || 0)
                    + 1
                ) % total
        }));
    }

    function prevGalleryImage(
        blockId,
        total
    ) {

        setGalleryIndexes(prev => ({

            ...prev,

            [blockId]:
                (
                    (prev[blockId] || 0)
                    - 1
                    + total
                ) % total
        }));
    }

    function getBaseStyles() {

        const styles =
            data?.styles || {};

        return {

            primaryColor:
                styles.primary_color || "#111111",

            backgroundColor:
                styles.background_color || "#ffffff",

            textColor:
                styles.text_color || "#222222",

            borderRadius:
                styles.border_radius === "pill"
                    ? 28
                    : styles.border_radius === "none"
                        ? 0
                        : 16,

            fontFamily:
                styles.font_family || "Arial",

            titleSize:
                styles.title_size || 28,

            textSize:
                styles.text_size || 16,

            titleWeight:
                styles.title_weight || "700"
        };
    }

    function getSectionStyles(config) {

        const base =
            getBaseStyles();

        const blockStyles =
            config.styles || {};

        return {

            background:
                blockStyles.background_color ||
                "transparent",

            color:
                blockStyles.text_color ||
                base.textColor,

            textAlign:
                blockStyles.text_align ||
                "center",

            fontSize:
                blockStyles.text_size ||
                base.textSize,

            fontFamily:
                base.fontFamily
        };
    }

    function getHeadingStyles(config) {

        const base =
            getBaseStyles();

        const blockStyles =
            config.styles || {};

        return {

            color:
                blockStyles.title_color ||
                blockStyles.text_color ||
                base.textColor,

            fontSize:
                blockStyles.title_size ||
                base.titleSize,

            fontWeight:
                base.titleWeight
        };
    }

    function renderRsvpForm() {

        const guest =
            data.guest;

        const base =
            getBaseStyles();

        const max =
            guest.plus_ones_allowed ||
            guest.max_companions ||
            0;

        return (

            <div
                style={{
                    marginTop: 18
                }}
            >

                <div
                    style={{
                        display: "flex",
                        gap: 10,
                        marginBottom: 18
                    }}
                >

                    <button
                        type="button"
                        onClick={() =>
                            setRsvpStatus("confirmed")
                        }
                        style={{
                            flex: 1,
                            border: "none",
                            padding: "12px 16px",
                            borderRadius:
                                base.borderRadius,
                            background:
                                rsvpStatus === "confirmed"
                                    ? base.primaryColor
                                    : "#e5e7eb",
                            color:
                                rsvpStatus === "confirmed"
                                    ? "#fff"
                                    : "#111",
                            fontWeight: 700
                        }}
                    >
                        Confirmar
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            setRsvpStatus("declined")
                        }
                        style={{
                            flex: 1,
                            border: "1px solid #ddd",
                            padding: "12px 16px",
                            borderRadius:
                                base.borderRadius,
                            background:
                                rsvpStatus === "declined"
                                    ? "#991b1b"
                                    : "transparent",
                            color:
                                rsvpStatus === "declined"
                                    ? "#fff"
                                    : "inherit",
                            fontWeight: 700
                        }}
                    >
                        No asistiré
                    </button>

                </div>

                {
                    rsvpStatus === "confirmed"
                    &&
                    (
                        <>

                            {
                                max > 0
                                &&
                                (

                                    <div
                                        style={{
                                            marginBottom: 18,
                                            padding: 16,
                                            border: "1px solid #e5e7eb",
                                            borderRadius:
                                                base.borderRadius
                                        }}
                                    >

                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                marginBottom: 12
                                            }}
                                        >

                                            <div>
                                                <strong>
                                                    Acompañantes
                                                </strong>

                                                <div
                                                    style={{
                                                        fontSize: 13,
                                                        opacity: .85,
                                                        marginTop: 4
                                                    }}
                                                >
                                                    Podés agregar hasta {max} acompañante{max === 1 ? "" : "s"}.
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={addCompanion}
                                                disabled={
                                                    companions.length >= max
                                                }
                                                style={{
                                                    border: "none",
                                                    borderRadius:
                                                        base.borderRadius,
                                                    background:
                                                        base.primaryColor,
                                                    color: "#fff",
                                                    padding: "8px 12px"
                                                }}
                                            >
                                                Agregar
                                            </button>

                                        </div>

                                        {
                                            companions.map(
                                                (
                                                    companion,
                                                    index
                                                ) => (

                                                    <div
                                                        key={
                                                            companion.id ||
                                                            index
                                                        }
                                                        style={{
                                                            marginBottom: 18,
                                                            padding: 14,
                                                            border: "1px solid rgba(255,255,255,.45)",
                                                            borderRadius: base.borderRadius,
                                                            background: "rgba(255,255,255,.12)"
                                                        }}
                                                    >

                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                justifyContent: "space-between",
                                                                alignItems: "center",
                                                                marginBottom: 12,
                                                                gap: 10
                                                            }}
                                                        >
                                                            <strong>
                                                                Acompañante {index + 1}
                                                            </strong>

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    removeCompanion(index)
                                                                }
                                                                style={{
                                                                    border: "none",
                                                                    background: "transparent",
                                                                    color: "#dc2626",
                                                                    fontWeight: 700,
                                                                    cursor: "pointer"
                                                                }}
                                                            >
                                                                Eliminar
                                                            </button>
                                                        </div>

                                                        <div style={{ marginBottom: 10 }}>
                                                            <label style={{ display: "block", marginBottom: 4, fontWeight: 700 }}>
                                                                Nombre
                                                            </label>

                                                            <input
                                                                placeholder="Nombre del acompañante"
                                                                value={companion.name || ""}
                                                                onChange={(e) =>
                                                                    updateCompanion(
                                                                        index,
                                                                        "name",
                                                                        e.target.value
                                                                    )
                                                                }
                                                                style={inputStyle()}
                                                            />
                                                        </div>

                                                        <div style={{ marginBottom: 10 }}>
                                                            <label style={{ display: "block", marginBottom: 4, fontWeight: 700 }}>
                                                                Email
                                                            </label>

                                                            <input
                                                                placeholder="email@dominio.com"
                                                                value={companion.email || ""}
                                                                onChange={(e) =>
                                                                    updateCompanion(
                                                                        index,
                                                                        "email",
                                                                        e.target.value
                                                                    )
                                                                }
                                                                style={inputStyle()}
                                                            />
                                                        </div>

                                                        <div style={{ marginBottom: 10 }}>
                                                            <label style={{ display: "block", marginBottom: 4, fontWeight: 700 }}>
                                                                Teléfono
                                                            </label>

                                                            <input
                                                                placeholder="Teléfono"
                                                                value={companion.phone || ""}
                                                                onChange={(e) =>
                                                                    updateCompanion(
                                                                        index,
                                                                        "phone",
                                                                        e.target.value
                                                                    )
                                                                }
                                                                style={inputStyle()}
                                                            />
                                                        </div>

                                                        <div>
                                                            <label style={{ display: "block", marginBottom: 4, fontWeight: 700 }}>
                                                                Notas alimentarias
                                                            </label>

                                                            <input
                                                                placeholder="Ej: vegetariano, celíaco, sin restricciones"
                                                                value={companion.dietary_notes || ""}
                                                                onChange={(e) =>
                                                                    updateCompanion(
                                                                        index,
                                                                        "dietary_notes",
                                                                        e.target.value
                                                                    )
                                                                }
                                                                style={inputStyle()}
                                                            />
                                                        </div>

                                                    </div>
                                                )
                                            )
                                        }

                                    </div>
                                )
                            }

                            <textarea
                                placeholder="Notas alimentarias"
                                rows={3}
                                value={dietaryNotes}
                                onChange={(e) =>
                                    setDietaryNotes(
                                        e.target.value
                                    )
                                }
                                style={textareaStyle()}
                            />

                            <textarea
                                placeholder="Restricciones especiales"
                                rows={3}
                                value={customDietaryNotes}
                                onChange={(e) =>
                                    setCustomDietaryNotes(
                                        e.target.value
                                    )
                                }
                                style={textareaStyle()}
                            />
                        </>
                    )
                }

                <textarea
                    placeholder="Mensaje adicional"
                    rows={4}
                    value={message}
                    onChange={(e) =>
                        setMessage(e.target.value)
                    }
                    style={textareaStyle()}
                />

                <button
                    type="button"
                    disabled={submitting}
                    onClick={submitRsvp}
                    style={{
                        width: "100%",
                        border: "none",
                        borderRadius:
                            base.borderRadius,
                        background:
                            base.primaryColor,
                        color: "#fff",
                        padding: "14px 18px",
                        fontWeight: 700
                    }}
                >
                    {
                        submitting
                            ? "Enviando..."
                            : "Enviar respuesta"
                    }
                </button>

            </div>
        );
    }

    function inputStyle() {

        return {
            width: "100%",
            marginBottom: 8,
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid #ddd"
        };
    }

    function textareaStyle() {

        return {
            width: "100%",
            marginBottom: 12,
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid #ddd"
        };
    }

    function renderBlock(block) {

        const config =
            normalizeConfig(
                block.config_json
            );

        const base =
            getBaseStyles();

        const sectionStyle =
            getSectionStyles(config);

        const headingStyle =
            getHeadingStyles(config);

        if (block.type === "hero") {

            return (

                <section
                    key={block.id}
                    style={{
                        minHeight: 360,
                        padding: 28,
                        backgroundImage:
                            config.image_url
                                ? `linear-gradient(rgba(0,0,0,.45), rgba(0,0,0,.45)), url(${config.image_url})`
                                : "linear-gradient(135deg, #111, #444)",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        color:
                            config.styles?.text_color || "#fff",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        textAlign:
                            config.styles?.text_align || "center"
                    }}
                >

                    <h1
                        style={{
                            ...headingStyle,
                            color:
                                config.styles?.title_color ||
                                config.styles?.text_color ||
                                "#fff",
                            fontSize:
                                config.styles?.title_size ||
                                40
                        }}
                    >
                        {
                            config.title ||
                            data.invitation?.title
                        }
                    </h1>

                    {
                        config.subtitle
                        &&
                        (
                            <p
                                style={{
                                    fontSize:
                                        config.styles?.text_size ||
                                        18
                                }}
                            >
                                {config.subtitle}
                            </p>
                        )
                    }

                    {
                        config.button_text
                        &&
                        (
                            <div>
                                <button
                                    style={{
                                        border: "none",
                                        marginTop: 12,
                                        background:
                                            base.primaryColor,
                                        color: "#fff",
                                        borderRadius:
                                            base.borderRadius,
                                        padding: "12px 18px"
                                    }}
                                >
                                    {config.button_text}
                                </button>
                            </div>
                        )
                    }

                </section>
            );
        }

        if (block.type === "event_info") {

            const hasContent =
                config.title ||
                config.date ||
                config.time ||
                config.description;

            if (!hasContent) return null;

            return (

                <section
                    key={block.id}
                    style={{
                        ...sectionStyle,
                        padding: 28
                    }}
                >

                    {
                        config.title
                        &&
                        (
                            <h2 style={headingStyle}>
                                {config.title}
                            </h2>
                        )
                    }

                    {
                        (
                            config.date ||
                            config.time
                        )
                        &&
                        (
                            <p>
                                {
                                    config.date
                                    &&
                                    <>📅 {config.date}</>
                                }
                                {
                                    config.time
                                    &&
                                    <> {config.time}</>
                                }
                            </p>
                        )
                    }

                    {
                        config.description
                        &&
                        (
                            <p>
                                {config.description}
                            </p>
                        )
                    }

                </section>
            );
        }

        if (block.type === "countdown") {

            const countdown =
                getCountdownParts(
                    config.target_date
                );

            return (

                <section
                    key={block.id}
                    style={{
                        ...sectionStyle,
                        padding: 28
                    }}
                >

                    {
                        config.title
                        &&
                        (
                            <h2 style={headingStyle}>
                                {config.title}
                            </h2>
                        )
                    }

                    <div
                        style={{
                            display: "flex",
                            justifyContent: "center",
                            gap: 10,
                            flexWrap: "wrap"
                        }}
                    >

                        {
                            config.show_days !== false
                            &&
                            (
                                <CountdownBox
                                    label="días"
                                    value={countdown.days}
                                    color={base.primaryColor}
                                    radius={base.borderRadius}
                                />
                            )
                        }

                        {
                            config.show_hours !== false
                            &&
                            (
                                <CountdownBox
                                    label="hs"
                                    value={countdown.hours}
                                    color={base.primaryColor}
                                    radius={base.borderRadius}
                                />
                            )
                        }

                        {
                            config.show_minutes !== false
                            &&
                            (
                                <CountdownBox
                                    label="min"
                                    value={countdown.minutes}
                                    color={base.primaryColor}
                                    radius={base.borderRadius}
                                />
                            )
                        }

                    </div>

                </section>
            );
        }

        if (block.type === "location") {

            const mapsUrl =
                getGoogleMapsEmbedUrl(
                    config.maps_url
                );

            const hasContent =
                config.place_name ||
                config.address ||
                mapsUrl ||
                config.button_text;

            if (!hasContent) return null;

            return (

                <section
                    key={block.id}
                    style={{
                        ...sectionStyle,
                        padding: 28
                    }}
                >

                    {
                        config.place_name
                        &&
                        (
                            <h2 style={headingStyle}>
                                {config.place_name}
                            </h2>
                        )
                    }

                    {
                        config.address
                        &&
                        (
                            <p>
                                {config.address}
                            </p>
                        )
                    }

                    {
                        mapsUrl
                        &&
                        (
                            <div
                                style={{
                                    borderRadius:
                                        base.borderRadius,
                                    overflow: "hidden",
                                    marginBottom: 16
                                }}
                            >
                                <iframe
                                    src={mapsUrl}
                                    width="100%"
                                    height="260"
                                    style={{
                                        border: 0
                                    }}
                                    loading="lazy"
                                />
                            </div>
                        )
                    }

                    {
                        config.button_text
                        &&
                        (
                            <button
                                type="button"
                                onClick={() =>
                                    window.open(
                                        config.maps_url,
                                        "_blank"
                                    )
                                }
                                style={{
                                    border: "none",
                                    background:
                                        base.primaryColor,
                                    color: "#fff",
                                    borderRadius:
                                        base.borderRadius,
                                    padding: "12px 18px"
                                }}
                            >
                                {config.button_text}
                            </button>
                        )
                    }

                </section>
            );
        }

        if (block.type === "gallery") {

            const images =
                getGalleryImages(config);

            if (!images.length) return null;

            const mode =
                config.mode || "grid";

            const imageHeight =
                Number(
                    config.image_height || 180
                );

            const activeIndex =
                galleryIndexes[block.id] || 0;

            const activeImage =
                images[activeIndex];

            return (

                <section
                    key={block.id}
                    style={{
                        ...sectionStyle,
                        padding: 28
                    }}
                >

                    {
                        config.title
                        &&
                        (
                            <h2 style={headingStyle}>
                                {config.title}
                            </h2>
                        )
                    }

                    {
                        config.subtitle
                        &&
                        (
                            <p>
                                {config.subtitle}
                            </p>
                        )
                    }

                    {
                        mode === "grid"
                        &&
                        (
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                        `repeat(${config.columns || 2}, 1fr)`,
                                    gap:
                                        Number(config.gap || 8)
                                }}
                            >
                                {
                                    images.map((url, index) => (

                                        <img
                                            key={`${url}-${index}`}
                                            src={url}
                                            alt=""
                                            style={{
                                                width: "100%",
                                                height:
                                                    imageHeight,
                                                objectFit: "cover",
                                                borderRadius:
                                                    base.borderRadius
                                            }}
                                        />
                                    ))
                                }
                            </div>
                        )
                    }

                    {
                        mode === "carousel"
                        &&
                        (
                            <div
                                style={{
                                    position: "relative",
                                    overflow: "hidden",
                                    borderRadius:
                                        base.borderRadius
                                }}
                            >

                                <img
                                    src={activeImage}
                                    alt=""
                                    style={{
                                        width: "100%",
                                        height:
                                            imageHeight,
                                        objectFit: "cover",
                                        display: "block"
                                    }}
                                />

                                {
                                    config.show_arrows !== false
                                    &&
                                    images.length > 1
                                    &&
                                    (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    prevGalleryImage(
                                                        block.id,
                                                        images.length
                                                    )
                                                }
                                                style={arrowStyle("left")}
                                            >
                                                ‹
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    nextGalleryImage(
                                                        block.id,
                                                        images.length
                                                    )
                                                }
                                                style={arrowStyle("right")}
                                            >
                                                ›
                                            </button>
                                        </>
                                    )
                                }

                                {
                                    config.show_dots !== false
                                    &&
                                    images.length > 1
                                    &&
                                    (
                                        <div
                                            style={{
                                                position: "absolute",
                                                bottom: 10,
                                                left: 0,
                                                right: 0,
                                                display: "flex",
                                                justifyContent: "center",
                                                gap: 6
                                            }}
                                        >
                                            {
                                                images.map((url, index) => (

                                                    <span
                                                        key={`${url}-dot-${index}`}
                                                        onClick={() =>
                                                            setGalleryIndexes(prev => ({

                                                                ...prev,

                                                                [block.id]:
                                                                    index
                                                            }))
                                                        }
                                                        style={{
                                                            width: 8,
                                                            height: 8,
                                                            borderRadius: 999,
                                                            cursor: "pointer",
                                                            background:
                                                                index === activeIndex
                                                                    ? "#fff"
                                                                    : "rgba(255,255,255,.5)"
                                                        }}
                                                    />
                                                ))
                                            }
                                        </div>
                                    )
                                }

                            </div>
                        )
                    }

                </section>
            );
        }

        if (block.type === "video") {

            if (!config.video_url) return null;

            return (

                <section
                    key={block.id}
                    style={{
                        ...sectionStyle,
                        padding: 28
                    }}
                >

                    {
                        config.title
                        &&
                        (
                            <h2 style={headingStyle}>
                                {config.title}
                            </h2>
                        )
                    }

                    {
                        config.description
                        &&
                        (
                            <p>
                                {config.description}
                            </p>
                        )
                    }

                    <video
                        src={config.video_url}
                        controls={config.controls !== false}
                        muted={config.muted === true}
                        autoPlay={config.autoplay === true}
                        playsInline
                        style={{
                            width: "100%",
                            borderRadius:
                                base.borderRadius,
                            marginTop: 12
                        }}
                    />

                </section>
            );
        }

        if (block.type === "rsvp") {

            return (

                <section
                    key={block.id}
                    style={{
                        ...sectionStyle,
                        padding: 28
                    }}
                >

                    {
                        config.title
                        &&
                        (
                            <h2 style={headingStyle}>
                                {config.title}
                            </h2>
                        )
                    }

                    {
                        config.description
                        &&
                        (
                            <p>
                                {config.description}
                            </p>
                        )
                    }

                    <div
                        style={{
                            padding: 14,
                            borderRadius:
                                base.borderRadius,
                            background: "rgba(0,0,0,.04)"
                        }}
                    >

                        <div
                            style={{
                                fontWeight: 700,
                                marginBottom: 6
                            }}
                        >
                            {data.guest.name}
                        </div>

                        <div
                            style={{
                                opacity: .7,
                                marginBottom: 12
                            }}
                        >
                            {
                                data.guest.rsvp_status === "confirmed"
                                    ? "Asistencia confirmada"
                                    : data.guest.rsvp_status === "declined"
                                        ? "Invitación rechazada"
                                        : "Pendiente de respuesta"
                            }
                        </div>

                        {renderRsvpForm()}

                    </div>

                </section>
            );
        }

        if (block.type === "timeline") {

            const items =
                Array.isArray(config.items)
                    ? config.items
                    : [];

            const hasContent =
                config.title
                ||
                config.subtitle
                ||
                items.length > 0;

            if (!hasContent) return null;

            return (

                <section
                    key={block.id}
                    style={{
                        ...sectionStyle,
                        padding: 28
                    }}
                >

                    {
                        config.title
                        &&
                        (
                            <h2 style={headingStyle}>
                                {config.title}
                            </h2>
                        )
                    }

                    {
                        config.subtitle
                        &&
                        (
                            <p>
                                {config.subtitle}
                            </p>
                        )
                    }

                    <div
                        style={{
                            marginTop: 18
                        }}
                    >

                        {
                            items.map((item, index) => (

                                <div
                                    key={index}
                                    style={{
                                        display: "flex",
                                        gap: 16,
                                        marginBottom: 18,
                                        textAlign: "left"
                                    }}
                                >

                                    {
                                        item.time
                                        &&
                                        (
                                            <div
                                                style={{
                                                    minWidth: 76,
                                                    fontWeight: 800,
                                                    color:
                                                        base.primaryColor
                                                }}
                                            >
                                                {item.time}
                                            </div>
                                        )
                                    }

                                    <div>

                                        {
                                            item.title
                                            &&
                                            (
                                                <div
                                                    style={{
                                                        fontWeight: 800
                                                    }}
                                                >
                                                    {item.title}
                                                </div>
                                            )
                                        }

                                        {
                                            item.description
                                            &&
                                            (
                                                <div>
                                                    {item.description}
                                                </div>
                                            )
                                        }

                                    </div>

                                </div>
                            ))
                        }

                    </div>

                </section>
            );
        }

        if (block.type === "gifts") {

            const hasContent =
                config.title ||
                config.description ||
                config.alias ||
                config.cbu ||
                config.external_url;

            if (!hasContent) return null;

            async function copyGiftText(text) {

                if (!text) return;

                try {

                    await navigator.clipboard.writeText(text);

                    alert("Copiado");

                } catch (err) {

                    console.log(err);
                }
            }

            return (

                <section
                    key={block.id}
                    style={{
                        ...sectionStyle,
                        padding: 28
                    }}
                >

                    {
                        config.title
                        &&
                        (
                            <h2 style={headingStyle}>
                                {config.title}
                            </h2>
                        )
                    }

                    {
                        config.description
                        &&
                        (
                            <p>
                                {config.description}
                            </p>
                        )
                    }

                    <div
                        style={{
                            border: "1px solid #e5e7eb",
                            borderRadius:
                                base.borderRadius,
                            padding: 18,
                            textAlign: "left",
                            marginTop: 16
                        }}
                    >

                        {
                            config.account_holder
                            &&
                            (
                                <div style={{ marginBottom: 8 }}>
                                    <strong>Titular:</strong>{" "}
                                    {config.account_holder}
                                </div>
                            )
                        }

                        {
                            config.bank_name
                            &&
                            (
                                <div style={{ marginBottom: 8 }}>
                                    <strong>Banco:</strong>{" "}
                                    {config.bank_name}
                                </div>
                            )
                        }

                        {
                            config.alias
                            &&
                            (
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        gap: 10,
                                        marginBottom: 8
                                    }}
                                >
                                    <span>
                                        <strong>Alias:</strong>{" "}
                                        {config.alias}
                                    </span>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            copyGiftText(
                                                config.alias
                                            )
                                        }
                                        style={{
                                            border: "none",
                                            background:
                                                base.primaryColor,
                                            color: "#fff",
                                            borderRadius:
                                                base.borderRadius,
                                            padding: "6px 10px"
                                        }}
                                    >
                                        Copiar
                                    </button>
                                </div>
                            )
                        }

                        {
                            config.cbu
                            &&
                            (
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        gap: 10
                                    }}
                                >
                                    <span>
                                        <strong>CBU/CVU:</strong>{" "}
                                        {config.cbu}
                                    </span>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            copyGiftText(
                                                config.cbu
                                            )
                                        }
                                        style={{
                                            border: "none",
                                            background:
                                                base.primaryColor,
                                            color: "#fff",
                                            borderRadius:
                                                base.borderRadius,
                                            padding: "6px 10px"
                                        }}
                                    >
                                        Copiar
                                    </button>
                                </div>
                            )
                        }

                    </div>

                    {
                        config.external_url
                        &&
                        (
                            <button
                                type="button"
                                onClick={() =>
                                    window.open(
                                        config.external_url,
                                        "_blank"
                                    )
                                }
                                style={{
                                    marginTop: 14,
                                    border: "none",
                                    background:
                                        base.primaryColor,
                                    color: "#fff",
                                    borderRadius:
                                        base.borderRadius,
                                    padding: "12px 18px",
                                    fontWeight: 700
                                }}
                            >
                                {
                                    config.external_button_text ||
                                    "Abrir link"
                                }
                            </button>
                        )
                    }

                </section>
            );
        }

        if (block.type === "footer") {

            const links = [
                {
                    label: "WhatsApp",
                    url: config.whatsapp,
                    icon: <FaWhatsapp />
                },
                {
                    label: "Instagram",
                    url: config.instagram,
                    icon: <FaInstagram />
                },
                {
                    label: "Facebook",
                    url: config.facebook,
                    icon: <FaFacebookF />
                },
                {
                    label: "Web",
                    url: config.website,
                    icon: <FiGlobe />
                },
                {
                    label: "Email",
                    url: config.email,
                    icon: <FiMail />
                }
            ].filter(item => item.url);

            const hasContent =
                config.title ||
                config.text ||
                links.length > 0;

            if (!hasContent) return null;

            return (

                <footer
                    key={block.id}
                    style={{
                        ...sectionStyle,
                        padding: 32,
                        borderTop: "1px solid rgba(0,0,0,.08)"
                    }}
                >

                    {
                        config.title
                        &&
                        (
                            <h2 style={headingStyle}>
                                {config.title}
                            </h2>
                        )
                    }

                    {
                        config.text
                        &&
                        (
                            <p>
                                {config.text}
                            </p>
                        )
                    }

                    {
                        links.length > 0
                        &&
                        (
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent:
                                        config.styles?.text_align === "left"
                                            ? "flex-start"
                                            : config.styles?.text_align === "right"
                                                ? "flex-end"
                                                : "center",
                                    gap: 14,
                                    flexWrap: "wrap",
                                    marginTop: 18
                                }}
                            >
                                {
                                    links.map(item => (

                                        <button
                                            key={item.label}
                                            type="button"
                                            title={item.label}
                                            onClick={() =>
                                                window.open(
                                                    item.url,
                                                    "_blank"
                                                )
                                            }
                                            style={{
                                                border: "none",
                                                background: "transparent",
                                                color:
                                                    config.styles?.text_color ||
                                                    base.textColor,
                                                borderRadius:
                                                    base.borderRadius,
                                                padding: 8,
                                                fontSize: 24,
                                                lineHeight: 1,
                                                cursor: "pointer",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                justifyContent: "center"
                                            }}
                                        >
                                            {item.icon}
                                        </button>
                                    ))
                                }
                            </div>
                        )
                    }

                </footer>
            );
        }

        return null;
    }

    function arrowStyle(side) {

        return {
            position: "absolute",
            [side]: 10,
            top: "50%",
            transform: "translateY(-50%)",
            width: 38,
            height: 38,
            borderRadius: 999,
            border: "none",
            background: "rgba(0,0,0,.5)",
            color: "#fff",
            cursor: "pointer",
            fontSize: 24,
            lineHeight: "38px"
        };
    }

    if (loading) {

        return (

            <div
                style={{
                    minHeight: "100vh",
                    background: "#000",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                }}
            >
                Cargando invitación...
            </div>
        );
    }

    if (error) {

        return (

            <div
                style={{
                    minHeight: "100vh",
                    background: "#000",
                    color: "#fff",
                    padding: 30,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center"
                }}
            >

                <div>
                    <h2>
                        Invitación no disponible
                    </h2>

                    <p>
                        {error}
                    </p>
                </div>

            </div>
        );
    }

    const base =
        getBaseStyles();

    const blocks =
        data?.blocks || [];

    return (

        <main
            style={{
                minHeight: "100vh",
                background:
                    base.backgroundColor,
                color:
                    base.textColor,
                fontFamily:
                    base.fontFamily,
                fontSize:
                    base.textSize
            }}
        >

            <div
                style={{
                    maxWidth: 760,
                    margin: "0 auto",
                    background:
                        base.backgroundColor,
                    overflow: "hidden"
                }}
            >

                {
                    blocks.map(block =>
                        renderBlock(block)
                    )
                }

            </div>

        </main>
    );
}

function CountdownBox({
    value,
    label,
    color,
    radius
}) {

    return (

        <div
            style={{
                minWidth: 76,
                padding: "12px 10px",
                borderRadius:
                    radius,
                background:
                    color,
                color: "#fff",
                textAlign: "center"
            }}
        >

            <div
                style={{
                    fontSize: 24,
                    fontWeight: 800,
                    lineHeight: 1
                }}
            >
                {value}
            </div>

            <div
                style={{
                    fontSize: 12,
                    marginTop: 4
                }}
            >
                {label}
            </div>

        </div>
    );
}