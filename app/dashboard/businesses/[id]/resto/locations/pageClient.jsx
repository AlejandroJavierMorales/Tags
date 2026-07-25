// =====================================
// FILE: /dashboard/businesses/[id]/resto/locations/pageClient.jsx
// Descripción:
// Administración de sectores, mesas y
// ubicaciones de Tags Resto.
// =====================================

"use client";

import { useEffect, useMemo, useState } from "react";

import {
    useRouter,
    useSearchParams
}
    from "next/navigation";

import TagsSpinner
    from "@/app/components/TagsSpinner";

import RestoLocationQR
    from "@/app/modules/resto/components/admin/locations/RestoLocationQR";

import showAlert
    from "@/app/components/showAlert";

import {

    FaArrowLeft,
    FaPlus,
    FaSearch,
    FaTrash,
    FaLayerGroup,
    FaChair,
    FaStore,
    FaTruck,
    FaShoppingBag,
    FaEllipsisH

} from "react-icons/fa";

import "@/app/styles/qr-page.css";
import "@/app/styles/tags_dashboard.css";

import "../../../../../modules/resto/styles/resto-locations.css";
import "../../../../../modules/resto/styles/resto-location-qr.css";

export default function RestoLocationsClient({

    businessId,

    session

}) {

    const router =
        useRouter();

    const searchParams =
        useSearchParams();

    const focusedLocationId =
        searchParams.get(
            "locationId"
        ) ||
        "";

    const [loading, setLoading] =
        useState(true);

    const [locations, setLocations] =
        useState([]);

    const [search, setSearch] =
        useState("");

    const [activeTab, setActiveTab] =
        useState("");

    useEffect(() => {

        load();

        // eslint-disable-next-line

    }, []);

    async function load() {

        setLoading(true);

        try {

            const res =
                await fetch(
                    `/api/resto/admin/locations/list?businessId=${businessId}`,
                    {
                        cache: "no-store"
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {

                throw new Error(
                    data.error
                );

            }

            setLocations(
                data.locations || []
            );

        } catch (err) {

            console.error(err);

            showAlert({

                icon: "error",

                title: "Error",

                text: err.message

            });

        } finally {

            setLoading(false);

        }

    }

    const locationGroups =
        useMemo(() => {

            const sectors =
                locations
                    .filter(
                        location =>
                            location.location_type ===
                            "sector"
                    )
                    .map(
                        sector => ({
                            id:
                                String(sector.id),
                            name:
                                sector.name,
                            sector,
                            locations:
                                locations.filter(
                                    location =>
                                        location.location_type !==
                                        "sector" &&
                                        Number(location.parent_id) ===
                                        Number(sector.id)
                                )
                        })
                    );

            const sectorIds =
                new Set(
                    sectors.map(
                        group =>
                            Number(group.sector.id)
                    )
                );

            const ungrouped =
                locations.filter(
                    location =>
                        location.location_type !==
                        "sector" &&
                        (
                            !location.parent_id ||
                            !sectorIds.has(
                                Number(location.parent_id)
                            )
                        )
                );

            return [
                ...sectors,
                {
                    id:
                        "ungrouped",
                    name:
                        "Sin sector",
                    sector:
                        null,
                    locations:
                        ungrouped
                }
            ];

        }, [locations]);

    useEffect(
        () => {

            if (focusedLocationId) {

                const focusedGroup =
                    locationGroups.find(
                        group =>
                            String(
                                group.sector?.id ||
                                ""
                            ) ===
                            String(
                                focusedLocationId
                            ) ||
                            group.locations.some(
                                location =>
                                    String(location.id) ===
                                    String(focusedLocationId)
                            )
                    );

                if (
                    focusedGroup &&
                    focusedGroup.id !== activeTab
                ) {

                    setActiveTab(
                        focusedGroup.id
                    );

                    return;

                }

            }

            if (
                !locationGroups.some(
                    group =>
                        group.id === activeTab
                )
            ) {

                setActiveTab(
                    locationGroups[0]?.id ||
                    "ungrouped"
                );

            }

        },
        [
            locationGroups,
            activeTab,
            focusedLocationId
        ]
    );

    const activeGroup =
        locationGroups.find(
            group =>
                group.id === activeTab
        ) ||
        locationGroups[0];

    const filtered =
        useMemo(() => {

            const groupLocations =
                activeGroup?.locations ||
                [];

            const normalizedSearch =
                search
                    .trim()
                    .toLowerCase();

            if (!normalizedSearch) {
                return groupLocations;
            }

            return groupLocations.filter(
                item =>
                    [
                        item.name,
                        item.location_code,
                        item.location_type
                    ]
                        .filter(Boolean)
                        .some(
                            value =>
                                String(value)
                                    .toLowerCase()
                                    .includes(
                                        normalizedSearch
                                    )
                        )
            );

        }, [activeGroup, search]);

    const totalOperational =
        locations.filter(
            location =>
                location.location_type !==
                "sector"
        ).length;

    function getIcon(type) {

        switch (type) {

            case "sector":

                return <FaLayerGroup />;

            case "table":

                return <FaChair />;

            case "counter":

                return <FaStore />;

            case "delivery":

                return <FaTruck />;

            case "pickup":

                return <FaShoppingBag />;

            default:

                return <FaEllipsisH />;

        }

    }

    async function deleteLocation(location) {

        const confirmed =
            await showAlert({
                icon: "warning",
                title: "Eliminar ubicación",
                text:
                    `¿Querés eliminar "${location.name}"?`,
                showCancelButton: true,
                confirmButtonText: "Eliminar",
                cancelButtonText: "Cancelar"
            });

        if (!confirmed) {
            return;
        }

        try {

            const res =
                await fetch(
                    `/api/resto/admin/locations/delete?id=${location.id}&businessId=${businessId}`,
                    {
                        method: "DELETE"
                    }
                );

            const data =
                await res
                    .json()
                    .catch(() => null);

            if (!res.ok) {

                throw new Error(
                    data?.error ||
                    "No se pudo eliminar la ubicación"
                );

            }

            await showAlert({
                icon: "success",
                title: "Ubicación eliminada"
            });

            await load();

        } catch (err) {

            showAlert({
                icon: "error",
                title: "Error",
                text:
                    err.message ||
                    "No se pudo eliminar la ubicación"
            });

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

                        Sectores y Mesas

                    </h1>

                    <p className="qr_page_subtitle">

                        Organización física del restaurante.

                    </p>

                    <small className="resto_locations_email">

                        {session.email}

                    </small>

                </div>

                <div className="qr_page_actions">

                    <button

                        className="qr_page_btn secondary"

                        onClick={() => router.push(
                            `/dashboard/businesses/${businessId}/resto`
                        )}

                    >

                        <FaArrowLeft />

                        Volver

                    </button>

                    <button

                        className="qr_page_btn success"

                        onClick={() => router.push(
                            `/dashboard/businesses/${businessId}/resto/locations/new`
                        )}

                    >

                        <FaPlus />

                        Nueva ubicación

                    </button>

                </div>

            </div>

            <div className="qr_page_status">

                Sectores:&nbsp;

                <strong>

                    {
                        locationGroups.filter(
                            group =>
                                group.sector
                        ).length
                    }

                </strong>

                <span className="mx-2">·</span>

                Ubicaciones:&nbsp;

                <strong>
                    {totalOperational}
                </strong>

            </div>

            <div className="resto_locations_toolbar">

                <div className="resto_locations_search">

                    <FaSearch />

                    <input

                        value={search}

                        onChange={e =>
                            setSearch(
                                e.target.value
                            )
                        }

                        placeholder="Buscar sector o mesa..."

                    />

                </div>

            </div>

            <div
                className="resto_locations_tabs"
                role="tablist"
                aria-label="Sectores"
            >
                {
                    locationGroups.map(
                        group => (
                            <button
                                key={group.id}
                                type="button"
                                role="tab"
                                aria-selected={
                                    group.id ===
                                    activeGroup?.id
                                }
                                className={
                                    group.id === activeGroup?.id
                                        ? "active"
                                        : ""
                                }
                                onClick={() =>
                                    setActiveTab(
                                        group.id
                                    )
                                }
                            >
                                {
                                    group.sector
                                        ? <FaLayerGroup />
                                        : <FaEllipsisH />
                                }

                                <span>
                                    {group.name}
                                </span>

                                <strong>
                                    {group.locations.length}
                                </strong>
                            </button>
                        )
                    )
                }
            </div>

            {
                activeGroup?.sector && (
                    <section className="resto_locations_sector_header">
                        <div>
                            <span>Sector seleccionado</span>
                            <h2>{activeGroup.sector.name}</h2>
                            <p>
                                {
                                    activeGroup.locations.length === 1
                                        ? "1 ubicación asociada"
                                        : `${activeGroup.locations.length} ubicaciones asociadas`
                                }
                            </p>
                        </div>

                        <div>
                            <button
                                type="button"
                                className="qr_page_btn secondary"
                                onClick={() =>
                                    router.push(
                                        `/dashboard/businesses/${businessId}/resto/locations/${activeGroup.sector.id}`
                                    )
                                }
                            >
                                Editar sector
                            </button>

                            <button
                                type="button"
                                className="qr_page_btn danger"
                                onClick={() =>
                                    deleteLocation(
                                        activeGroup.sector
                                    )
                                }
                            >
                                <FaTrash />
                                Eliminar sector
                            </button>
                        </div>
                    </section>
                )
            }

            <div className="resto_locations_grid">

                {

                    filtered.map(location => (

                        <div

                            key={location.id}

                            className={
                                String(location.id) ===
                                String(focusedLocationId)
                                    ? "resto_location_card is-focused"
                                    : "resto_location_card"
                            }

                        >

                            <div className="resto_location_icon">

                                {

                                    getIcon(
                                        location.location_type
                                    )

                                }

                            </div>

                            <div className="resto_location_body">

                                <h3>

                                    {location.name}

                                </h3>

                                <p>

                                    {

                                        location.location_type

                                    }

                                </p>

                                <div className="resto_location_meta">

                                    {

                                        location.parent_name &&

                                        <span>

                                            Sector:

                                            <strong>

                                                {location.parent_name}

                                            </strong>

                                        </span>

                                    }

                                    {

                                        location.capacity &&

                                        <span>

                                            Capacidad:

                                            <strong>

                                                {location.capacity}

                                            </strong>

                                        </span>

                                    }

                                </div>

                                <RestoLocationQR
                                    location={location}
                                    compact
                                />

                                <div className="resto_location_actions">

                                    <button
                                        className="qr_page_btn secondary"
                                        onClick={() =>
                                            router.push(
                                                `/dashboard/businesses/${businessId}/resto/locations/${location.id}`
                                            )
                                        }
                                    >
                                        Editar
                                    </button>

                                    <button
                                        className="qr_page_btn danger ms-2"
                                        onClick={() =>
                                            deleteLocation(
                                                location
                                            )
                                        }
                                    >
                                        <FaTrash />
                                        Eliminar
                                    </button>

                                </div>

                            </div>

                        </div>

                    ))

                }

            </div>

            {
                filtered.length === 0 && (
                    <div className="resto_locations_empty">
                        <FaChair />
                        <h3>
                            {
                                search
                                    ? "No hay coincidencias"
                                    : "No hay ubicaciones en esta pestaña"
                            }
                        </h3>
                        <p>
                            {
                                search
                                    ? "Probá con otro término de búsqueda."
                                    : "Podés crear una ubicación nueva y asociarla a este sector."
                            }
                        </p>
                    </div>
                )
            }

        </div>

    );

}
