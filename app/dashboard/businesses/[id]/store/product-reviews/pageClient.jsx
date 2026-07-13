// =====================================
// PAGE CLIENT:
// /dashboard/businesses/[id]/store/product-reviews
//
// Descripción:
// Administra las reseñas de productos de
// Commerce Reviews en Tags Tienda.
//
// Permite:
// - listar y filtrar reseñas;
// - cambiar su estado administrativo;
// - decidir cuáles se muestran públicamente.
//
// No modifica ni utiliza Tags Reviews.
//
// Contexto:
// store / commerce-reviews
// =====================================

"use client";

import {
    useEffect,
    useState
}
    from "react";

import {
    useRouter
}
    from "next/navigation";

import {
    FaStar,
    FaBoxOpen,
    FaCheckCircle
}
    from "react-icons/fa";

import showAlert
    from "@/app/components/showAlert";

import TagsSpinner
    from "@/app/components/TagsSpinner";

import "@/app/styles/qr-page.css";
import "@/app/styles/tags_dashboard.css";
import "@/app/styles/tags_store_admin.css";

const statusLabels = {
    pending:
        "Pendiente",

    approved:
        "Aprobada",

    rejected:
        "Rechazada"
};

export default function StoreProductReviewsClient({
    businessId
}) {

    const router =
        useRouter();

    const [loading, setLoading] =
        useState(true);

    const [tableLoading, setTableLoading] =
        useState(false);

    const [reviews, setReviews] =
        useState([]);

    const [query, setQuery] =
        useState("");

    const [submittedQuery, setSubmittedQuery] =
        useState("");

    const [statusFilter, setStatusFilter] =
        useState("");

    const [ratingFilter, setRatingFilter] =
        useState("");

    const [verifiedFilter, setVerifiedFilter] =
        useState("");

    const [publicFilter, setPublicFilter] =
        useState("");

    const [page, setPage] =
        useState(1);

    const [pagination, setPagination] =
        useState({
            page: 1,
            total: 0,
            pages: 0
        });

    useEffect(() => {

        loadReviews();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        businessId,
        page,
        submittedQuery,
        statusFilter,
        ratingFilter,
        verifiedFilter,
        publicFilter
    ]);

    async function loadReviews() {

        const isInitialLoad =
            reviews.length === 0;

        if (isInitialLoad) {
            setLoading(true);
        } else {
            setTableLoading(true);
        }

        try {

            const params =
                new URLSearchParams({
                    businessId:
                        String(businessId),

                    page:
                        String(page),

                    limit:
                        "20",

                    q:
                        submittedQuery,

                    status:
                        statusFilter,

                    rating:
                        ratingFilter,

                    verified:
                        verifiedFilter,

                    isPublic:
                        publicFilter
                });

            const res =
                await fetch(
                    `/api/store/admin/product-reviews/list?${params.toString()}`,
                    {
                        cache:
                            "no-store"
                    }
                );

            const data =
                await res.json()
                    .catch(() => null);

            if (!res.ok) {

                throw new Error(
                    data?.error ||
                    "No se pudieron cargar las reseñas."
                );

            }

            setReviews(
                data.data || []
            );

            setPagination({
                page:
                    Number(
                        data.page || 1
                    ),

                total:
                    Number(
                        data.total || 0
                    ),

                pages:
                    Number(
                        data.pages || 0
                    )
            });

        } catch (err) {

            showAlert({
                title:
                    "Error",

                text:
                    err.message,

                icon:
                    "error"
            });

        } finally {

            setLoading(false);
            setTableLoading(false);

        }

    }

    function handleSearch(event) {

        event.preventDefault();

        setPage(1);

        setSubmittedQuery(
            query.trim()
        );

    }

    function clearFilters() {

        setQuery("");
        setSubmittedQuery("");
        setStatusFilter("");
        setRatingFilter("");
        setVerifiedFilter("");
        setPublicFilter("");
        setPage(1);

    }

    async function changeReviewStatus(
        reviewId,
        status
    ) {

        try {

            const res =
                await fetch(
                    "/api/store/admin/product-reviews/status",
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                id:
                                    reviewId,

                                businessId,

                                status
                            })
                    }
                );

            const data =
                await res.json()
                    .catch(() => ({}));

            if (!res.ok) {

                throw new Error(
                    data.error ||
                    "No se pudo actualizar el estado."
                );

            }

            setReviews(previous =>
                previous.map(review =>
                    Number(review.id) ===
                    Number(reviewId)
                        ? {
                            ...review,
                            status
                        }
                        : review
                )
            );

        } catch (err) {

            showAlert({
                title:
                    "Error",

                text:
                    err.message,

                icon:
                    "error"
            });

        }

    }

    async function changeReviewPublic(
        reviewId,
        isPublic
    ) {

        try {

            const res =
                await fetch(
                    "/api/store/admin/product-reviews/public",
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                id:
                                    reviewId,

                                businessId,

                                is_public:
                                    isPublic ? 1 : 0
                            })
                    }
                );

            const data =
                await res.json()
                    .catch(() => ({}));

            if (!res.ok) {

                throw new Error(
                    data.error ||
                    "No se pudo actualizar la publicación."
                );

            }

            setReviews(previous =>
                previous.map(review =>
                    Number(review.id) ===
                    Number(reviewId)
                        ? {
                            ...review,
                            is_public:
                                isPublic ? 1 : 0
                        }
                        : review
                )
            );

        } catch (err) {

            showAlert({
                title:
                    "Error",

                text:
                    err.message,

                icon:
                    "error"
            });

        }

    }

    function formatDate(value) {

        if (!value) {
            return "-";
        }

        return new Date(value)
            .toLocaleString(
                "es-AR",
                {
                    dateStyle:
                        "short",

                    timeStyle:
                        "short"
                }
            );

    }

    function renderStars(value) {

        const rating =
            Math.max(
                0,
                Math.min(
                    5,
                    Number(value || 0)
                )
            );

        return (
            <span
                className="d-inline-flex align-items-center gap-1"
                title={`${rating} de 5`}
            >
                {[1, 2, 3, 4, 5].map(star => (
                    <FaStar
                        key={star}
                        style={{
                            color:
                                star <= rating
                                    ? "#f59e0b"
                                    : "#d1d5db"
                        }}
                    />
                ))}

                <strong className="ms-1">
                    {rating.toFixed(1)}
                </strong>
            </span>
        );

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
                            <FaStar />
                        </span>

                        <span>
                            Reseñas de productos
                        </span>

                    </h1>

                    <p className="qr_page_subtitle">
                        Moderá las calificaciones recibidas por productos comprados.
                    </p>

                </div>

                <div className="qr_page_actions">

                    <button
                        type="button"
                        className="qr_page_btn secondary"
                        onClick={() =>
                            router.push(
                                `/dashboard/businesses/${businessId}/store`
                            )
                        }
                    >
                        Volver
                    </button>

                    <button
                        type="button"
                        className="qr_page_btn secondary"
                        disabled={tableLoading}
                        onClick={loadReviews}
                    >
                        Actualizar
                    </button>

                </div>

            </div>

            <div className="qr_page_card mt-4">

                <div className="d-flex align-items-center gap-3 flex-wrap">

                    <div className="qr_page_status">

                        <strong>
                            Total
                        </strong>

                        <br />

                        {pagination.total}

                    </div>

                    <div className="qr_page_status">

                        <strong>
                            Públicas
                        </strong>

                        <br />

                        {
                            reviews.filter(
                                review =>
                                    Number(
                                        review.is_public || 0
                                    ) === 1
                            ).length
                        }

                    </div>

                    <div className="qr_page_status">

                        <strong>
                            Verificadas
                        </strong>

                        <br />

                        {
                            reviews.filter(
                                review =>
                                    Number(
                                        review.is_verified || 0
                                    ) === 1
                            ).length
                        }

                    </div>

                </div>

            </div>

            <div className="qr_page_card mt-4">

                <h2 className="qr_page_section_title">
                    Filtrar reseñas
                </h2>

                <form
                    className="row g-2 mt-2"
                    onSubmit={handleSearch}
                >

                    <div className="col-12 col-lg-4">

                        <input
                            type="search"
                            className="qr_page_input"
                            placeholder="Buscar producto, cliente, pedido o comentario"
                            value={query}
                            onChange={(event) =>
                                setQuery(
                                    event.target.value
                                )
                            }
                        />

                    </div>

                    <div className="col-6 col-md-3 col-lg-2">

                        <select
                            className="qr_page_select"
                            value={ratingFilter}
                            onChange={(event) => {
                                setPage(1);

                                setRatingFilter(
                                    event.target.value
                                );
                            }}
                        >
                            <option value="">
                                Rating
                            </option>

                            <option value="5">
                                5 estrellas
                            </option>

                            <option value="4">
                                4 estrellas
                            </option>

                            <option value="3">
                                3 estrellas
                            </option>

                            <option value="2">
                                2 estrellas
                            </option>

                            <option value="1">
                                1 estrella
                            </option>
                        </select>

                    </div>

                    <div className="col-6 col-md-3 col-lg-2">

                        <select
                            className="qr_page_select"
                            value={statusFilter}
                            onChange={(event) => {
                                setPage(1);

                                setStatusFilter(
                                    event.target.value
                                );
                            }}
                        >
                            <option value="">
                                Estado
                            </option>

                            <option value="pending">
                                Pendientes
                            </option>

                            <option value="approved">
                                Aprobadas
                            </option>

                            <option value="rejected">
                                Rechazadas
                            </option>
                        </select>

                    </div>

                    <div className="col-6 col-md-3 col-lg-2">

                        <select
                            className="qr_page_select"
                            value={verifiedFilter}
                            onChange={(event) => {
                                setPage(1);

                                setVerifiedFilter(
                                    event.target.value
                                );
                            }}
                        >
                            <option value="">
                                Compra
                            </option>

                            <option value="verified">
                                Verificadas
                            </option>

                            <option value="unverified">
                                No verificadas
                            </option>
                        </select>

                    </div>

                    <div className="col-6 col-md-3 col-lg-2">

                        <select
                            className="qr_page_select"
                            value={publicFilter}
                            onChange={(event) => {
                                setPage(1);

                                setPublicFilter(
                                    event.target.value
                                );
                            }}
                        >
                            <option value="">
                                Publicación
                            </option>

                            <option value="public">
                                Públicas
                            </option>

                            <option value="private">
                                No públicas
                            </option>
                        </select>

                    </div>

                    <div className="col-12 d-flex gap-2 flex-wrap mt-3">

                        <button
                            type="submit"
                            className="qr_page_btn success"
                        >
                            Buscar
                        </button>

                        <button
                            type="button"
                            className="qr_page_btn secondary"
                            onClick={clearFilters}
                        >
                            Limpiar
                        </button>

                    </div>

                </form>

            </div>

            <div className="qr_page_card mt-4">

                {tableLoading && (
                    <div className="mb-3">
                        <TagsSpinner />
                    </div>
                )}

                <div className="tags_table_wrapper">

                    <table className="tags_table tags_text_normal">

                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Producto</th>
                                <th>Cliente</th>
                                <th>Rating</th>
                                <th>Reseña</th>
                                <th>Compra</th>
                                <th>Pública</th>
                                <th>Estado</th>
                            </tr>
                        </thead>

                        <tbody>

                            {reviews.map(review => (

                                <tr key={review.id}>

                                    <td>
                                        {formatDate(
                                            review.created_at
                                        )}
                                    </td>

                                    <td>

                                        <strong>
                                            {review.product_title || "Producto"}
                                        </strong>

                                        {review.variant_title && (
                                            <small className="d-block">
                                                {review.variant_title}
                                            </small>
                                        )}

                                        {review.order_number && (
                                            <small className="d-block">
                                                Pedido {review.order_number}
                                            </small>
                                        )}

                                    </td>

                                    <td>

                                        <strong>
                                            {review.customer_name || "Cliente"}
                                        </strong>

                                        {review.customer_email && (
                                            <small className="d-block">
                                                {review.customer_email}
                                            </small>
                                        )}

                                    </td>

                                    <td>
                                        {renderStars(
                                            review.rating
                                        )}
                                    </td>

                                    <td>

                                        <strong>
                                            {review.title || "Sin título"}
                                        </strong>

                                        <p className="mb-0 mt-1">
                                            {review.comment || "Sin comentario"}
                                        </p>

                                    </td>

                                    <td>

                                        {Number(
                                            review.is_verified || 0
                                        ) === 1
                                            ? (
                                                <span className="store_product_review_verified">
                                                    <FaCheckCircle />
                                                    Verificada
                                                </span>
                                            )
                                            : "-"
                                        }

                                    </td>

                                    <td>

                                        <label className="qr_page_checkbox">

                                            <input
                                                type="checkbox"
                                                checked={
                                                    Number(
                                                        review.is_public || 0
                                                    ) === 1
                                                }
                                                onChange={(event) =>
                                                    changeReviewPublic(
                                                        review.id,
                                                        event.target.checked
                                                    )
                                                }
                                            />

                                            Mostrar

                                        </label>

                                    </td>

                                    <td>

                                        <select
                                            className="qr_page_select"
                                            value={
                                                review.status ||
                                                "pending"
                                            }
                                            onChange={(event) =>
                                                changeReviewStatus(
                                                    review.id,
                                                    event.target.value
                                                )
                                            }
                                        >
                                            <option value="pending">
                                                Pendiente
                                            </option>

                                            <option value="approved">
                                                Aprobada
                                            </option>

                                            <option value="rejected">
                                                Rechazada
                                            </option>
                                        </select>

                                        <small className="d-block mt-1">
                                            {
                                                statusLabels[
                                                    review.status
                                                ] ||
                                                review.status
                                            }
                                        </small>

                                    </td>

                                </tr>

                            ))}

                            {!reviews.length && (

                                <tr>
                                    <td colSpan={8}>

                                        <div className="qr_page_info_box">
                                            No hay reseñas de productos para mostrar.
                                        </div>

                                    </td>
                                </tr>

                            )}

                        </tbody>

                    </table>

                </div>

                {pagination.pages > 1 && (

                    <div className="tags_pagination mt-4">

                        <button
                            type="button"
                            disabled={page <= 1}
                            onClick={() =>
                                setPage(previous =>
                                    Math.max(
                                        1,
                                        previous - 1
                                    )
                                )
                            }
                        >
                            ←
                        </button>

                        <span className="mx-2">
                            Página {pagination.page} de {pagination.pages}
                        </span>

                        <button
                            type="button"
                            disabled={
                                page >= pagination.pages
                            }
                            onClick={() =>
                                setPage(previous =>
                                    previous + 1
                                )
                            }
                        >
                            →
                        </button>

                    </div>

                )}

            </div>

            <style jsx global>{`

                .store_product_review_verified {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    padding: 4px 9px;
                    border-radius: 999px;
                    background: #dcfce7;
                    color: #166534;
                    border: 1px solid #86efac;
                    font-size: 12px;
                    font-weight: 700;
                    white-space: nowrap;
                }

                .store_product_review_verified svg {
                    flex: 0 0 auto;
                }

            `}</style>

        </div>
    );

}