// =====================================
// FILE: /dashboard/businesses/[id]/resto/locations/new/pageClient.jsx
// Descripción:
// Editor de sectores, mesas y ubicaciones
// de Tags Resto.
// =====================================

"use client";

import { useEffect, useState } from "react";

import {
    useRouter
} from "next/navigation";

import showAlert
    from "@/app/components/showAlert";

import TagsSpinner
    from "@/app/components/TagsSpinner";

import "@/app/styles/qr-page.css";
import "@/app/styles/tags_dashboard.css";

import "../../../../../../modules/resto/styles/resto-location-editor.css";

const emptyLocation = {

    id: null,

    parent_id: "",

    location_type: "sector",

    location_code: "",

    name: "",

    description: "",

    capacity: 4,

    sort_order: 0,

    is_active: 1

};

export default function RestoLocationEditorClient({
    businessId,
    locationId,
    session,
    isAdmin
}) {

    const router =
        useRouter();

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [form, setForm] =
        useState(emptyLocation);

    const [locations, setLocations] =
        useState([]);

    useEffect(() => {

        load();

        // eslint-disable-next-line

    }, []);

    async function load() {

        setLoading(true);

        try {

            const listRes =
                await fetch(
                    `/api/resto/admin/locations/list?businessId=${businessId}`,
                    {
                        cache: "no-store"
                    }
                );

            const listData =
                await listRes.json();

            if (!listRes.ok) {

                throw new Error(
                    listData.error
                );

            }

            setLocations(
                listData.locations || []
            );

            if (!locationId) {
                return;
            }

            const currentLocation =
                (listData.locations || []).find(
                    location =>
                        String(location.id) ===
                        String(locationId)
                );

            if (!currentLocation) {

                throw new Error(
                    "Ubicación no encontrada"
                );

            }

            setForm({
                ...emptyLocation,
                ...currentLocation,

                parent_id:
                    currentLocation.parent_id || "",

                location_type:
                    currentLocation.location_type ||
                    "sector",

                location_code:
                    currentLocation.location_code ||
                    ""
            });

        } catch (err) {

            showAlert({

                icon: "error",

                title: "Error",

                text: err.message

            });

        } finally {

            setLoading(false);

        }

    }

    function update(
        field,
        value
    ) {

        setForm(prev => ({

            ...prev,

            [field]: value

        }));

    }

    async function save() {

        setSaving(true);

        try {

            const endpoint =
                locationId
                    ? "/api/resto/admin/locations/update"
                    : "/api/resto/admin/locations/create";

            const res =
                await fetch(

                    endpoint,

                    {

                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            businessId,
                            id:
                                locationId || null,
                            ...form
                        })
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {

                throw new Error(
                    data.error
                );

            }

            await showAlert({

                icon: "success",

                title:

                    locationId

                        ? "Ubicación actualizada"

                        : "Ubicación creada"

            });

            router.push(

                `/dashboard/businesses/${businessId}/resto/locations?locationId=${encodeURIComponent(
                    data?.location?.id ||
                    locationId ||
                    ""
                )}`

            );

        } catch (err) {

            showAlert({

                icon: "error",

                title: "Error",

                text: err.message

            });

        } finally {

            setSaving(false);

        }

    }

    if (loading) {

        return (

            <div className="qr_page_builder">

                <TagsSpinner />

            </div>

        );

    }

    return (

        <div className="qr_page_builder">

            <div className="qr_page_header">

                <div>

                    <h1 className="qr_page_title store_admin_title">

                        <span className="store_admin_title_icon">

                            🍽️

                        </span>

                        {

                            locationId

                                ? "Editar ubicación"

                                : "Nueva ubicación"

                        }

                    </h1>

                    <p className="qr_page_subtitle">

                        Sectores, mesas y puntos de atención.

                    </p>

                    <small className="resto_locations_email">

                        {session.email}

                    </small>

                </div>

                <div className="qr_page_actions">

                    <button

                        className="qr_page_btn secondary"

                        onClick={() =>
                            router.back()
                        }

                    >

                        Cancelar

                    </button>

                    <button

                        className="qr_page_btn success"

                        disabled={saving}

                        onClick={save}

                    >

                        {

                            saving

                                ? "Guardando..."

                                : "Guardar"

                        }

                    </button>

                </div>

            </div>

            <div className="qr_page_card">

                <div className="qr_page_grid">

                    <div className="qr_page_field">

                        <label>

                            Tipo

                        </label>

                        <select

                            className="qr_page_select"

                            value={form.location_type}

                            onChange={e =>
                                update(
                                    "location_type",
                                    e.target.value
                                )
                            }

                        >

                            <option value="sector">

                                Sector

                            </option>

                            <option value="table">

                                Mesa

                            </option>

                            <option value="counter">

                                Barra

                            </option>

                            <option value="pickup">

                                Take Away

                            </option>

                            <option value="other">

                                Otro

                            </option>

                        </select>

                    </div>
                    <div className="qr_page_field">

                        <label>

                            Nombre

                        </label>

                        <input

                            className="qr_page_input"

                            value={form.name}

                            onChange={e =>
                                update(
                                    "name",
                                    e.target.value
                                )
                            }

                        />

                    </div>

                    <div className="qr_page_field">

                        <label>

                            Código

                        </label>

                        <input

                            className="qr_page_input"

                            value={form.location_code}

                            onChange={e =>
                                update(
                                    "location_code",
                                    e.target.value
                                )
                            }

                            placeholder="Ej: M01, VIP-01..."

                        />

                    </div>

                    <div className="qr_page_field">

                        <label>

                            Sector padre

                        </label>

                        <select

                            className="qr_page_select"

                            value={form.parent_id || ""}

                            onChange={e =>
                                update(
                                    "parent_id",
                                    e.target.value
                                )
                            }

                        >

                            <option value="">

                                Ninguno

                            </option>

                            {

                                locations.filter(location =>
                                    location.location_type === "sector" &&
                                    Number(location.id) !== Number(locationId)
                                )

                                    .map(location => (

                                        <option

                                            key={location.id}

                                            value={location.id}

                                        >

                                            {location.name}

                                        </option>

                                    ))

                            }

                        </select>

                    </div>

                    <div className="qr_page_field">

                        <label>

                            Capacidad

                        </label>

                        <input

                            type="number"

                            className="qr_page_input"

                            value={form.capacity}

                            onChange={e =>
                                update(
                                    "capacity",
                                    Number(
                                        e.target.value
                                    )
                                )
                            }

                        />

                    </div>

                    <div className="qr_page_field">

                        <label>

                            Orden

                        </label>

                        <input

                            type="number"

                            className="qr_page_input"

                            value={form.sort_order}

                            onChange={e =>
                                update(
                                    "sort_order",
                                    Number(
                                        e.target.value
                                    )
                                )
                            }

                        />

                    </div>

                    <div className="qr_page_field qr_page_field_full">

                        <label>

                            Descripción

                        </label>

                        <textarea

                            className="qr_page_textarea"

                            rows={4}

                            value={form.description || ""}

                            onChange={e =>
                                update(
                                    "description",
                                    e.target.value
                                )
                            }

                        />

                    </div>

                    <label className="qr_page_checkbox">

                        <input

                            type="checkbox"

                            checked={
                                !!form.is_active
                            }

                            onChange={e =>
                                update(
                                    "is_active",
                                    e.target.checked
                                        ? 1
                                        : 0
                                )
                            }

                        />

                        Ubicación activa

                    </label>

                </div>

            </div>

        </div>

    );

}
