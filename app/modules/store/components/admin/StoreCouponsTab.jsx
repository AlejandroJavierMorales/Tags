// =====================================
// Archivo:
// /app/modules/store/components/admin/StoreCouponsTab.jsx
//
// Descripción:
// Administra cupones de descuento
// de Tags Tienda.
//
// Contexto:
// store
// =====================================

"use client";

import { useEffect, useState } from "react";

import showAlert
    from "@/app/components/showAlert";

const emptyForm = {
    couponId: null,
    code: "",
    discount_type: "percent",
    discount_value: "",
    min_order_total: "",
    max_uses: "",
    starts_at: "",
    ends_at: "",
    is_active: 1
};

const typeLabels = {
    percent: "Porcentaje",
    fixed: "Importe fijo",
    free_shipping: "Envío gratis"
};

function formatDateInput(value) {
    if (!value) return "";

    return String(value)
        .slice(0, 16);
}

export default function StoreCouponsTab({
    businessId
}) {
    const [loading, setLoading] =
        useState(false);

    const [saving, setSaving] =
        useState(false);

    const [coupons, setCoupons] =
        useState([]);

    const [form, setForm] =
        useState(emptyForm);

    const [showForm, setShowForm] =
        useState(false);

    useEffect(() => {
        loadCoupons();
    }, [businessId]);

    async function loadCoupons() {
        try {
            setLoading(true);

            const res =
                await fetch(
                    `/api/store/admin/coupons/list?businessId=${businessId}`,
                    {
                        cache: "no-store"
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {
                throw new Error(data.error);
            }

            setCoupons(data.coupons || []);

        } catch (err) {
            showAlert({
                title: "Error",
                text: err.message,
                icon: "error"
            });

        } finally {
            setLoading(false);
        }
    }

    function updateField(field, value) {
        setForm(prev => ({
            ...prev,
            [field]: value
        }));
    }

    function newCoupon() {
        setForm(emptyForm);
        setShowForm(true);
    }

    function editCoupon(coupon) {
        setForm({
            couponId: coupon.id,
            code: coupon.code || "",
            discount_type: coupon.discount_type || "percent",
            discount_value: coupon.discount_value || "",
            min_order_total: coupon.min_order_total || "",
            max_uses: coupon.max_uses || "",
            starts_at: formatDateInput(coupon.starts_at),
            ends_at: formatDateInput(coupon.ends_at),
            is_active: Number(coupon.is_active) === 1 ? 1 : 0
        });

        setShowForm(true);
    }

    async function saveCoupon() {
        try {
            setSaving(true);

            const res =
                await fetch(
                    "/api/store/admin/coupons/save",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            businessId,
                            ...form
                        })
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {
                throw new Error(data.error);
            }

            showAlert({
                title: "Guardado",
                text: data.message || "Cupón guardado correctamente.",
                icon: "success",
                timer: 1300
            });

            setShowForm(false);
            setForm(emptyForm);

            await loadCoupons();

        } catch (err) {
            showAlert({
                title: "Error",
                text: err.message,
                icon: "error"
            });

        } finally {
            setSaving(false);
        }
    }

    async function deactivateCoupon(coupon) {
        const confirmed =
            await showAlert({
                title: "Desactivar cupón",
                text: `¿Querés desactivar ${coupon.code}?`,
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Desactivar",
                cancelButtonText: "Cancelar"
            });

        if (!confirmed) return;

        try {
            const res =
                await fetch(
                    "/api/store/admin/coupons/save",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            businessId,
                            couponId: coupon.id,
                            code: coupon.code,
                            discount_type: coupon.discount_type,
                            discount_value: coupon.discount_value,
                            min_order_total: coupon.min_order_total,
                            max_uses: coupon.max_uses,
                            starts_at: coupon.starts_at,
                            ends_at: coupon.ends_at,
                            is_active: 0
                        })
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {
                throw new Error(data.error);
            }

            await loadCoupons();

        } catch (err) {
            showAlert({
                title: "Error",
                text: err.message,
                icon: "error"
            });
        }
    }

    return (
        <section className="qr_page_card">

            <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-4">
                <div>
                    <h2 className="qr_page_section_title">
                        Cupones
                    </h2>

                    <p className="qr_page_subtitle mb-0">
                        Creá descuentos por porcentaje, importe fijo o envío gratis.
                    </p>
                </div>

                <button
                    type="button"
                    className="qr_page_btn success"
                    onClick={newCoupon}
                >
                    Nuevo cupón
                </button>
            </div>

            {showForm && (
                <div className="store_coupon_form mb-4">

                    <div className="row g-3">

                        <div className="col-12 col-md-4">
                            <label>Código</label>
                            <input
                                className="qr_page_input"
                                value={form.code}
                                onChange={(e) =>
                                    updateField("code", e.target.value)
                                }
                                placeholder="Ej: TEST10"
                            />
                        </div>

                        <div className="col-12 col-md-4">
                            <label>Tipo</label>
                            <select
                                className="qr_page_select"
                                value={form.discount_type}
                                onChange={(e) =>
                                    updateField("discount_type", e.target.value)
                                }
                            >
                                <option value="percent">Porcentaje</option>
                                <option value="fixed">Importe fijo</option>
                                <option value="free_shipping">Envío gratis</option>
                            </select>
                        </div>

                        {form.discount_type !== "free_shipping" && (
                            <div className="col-12 col-md-4">
                                <label>Valor</label>
                                <input
                                    className="qr_page_input"
                                    type="number"
                                    value={form.discount_value}
                                    onChange={(e) =>
                                        updateField("discount_value", e.target.value)
                                    }
                                    placeholder="10"
                                />
                            </div>
                        )}

                        <div className="col-12 col-md-4">
                            <label>Monto mínimo</label>
                            <input
                                className="qr_page_input"
                                type="number"
                                value={form.min_order_total}
                                onChange={(e) =>
                                    updateField("min_order_total", e.target.value)
                                }
                                placeholder="0"
                            />
                        </div>

                        <div className="col-12 col-md-4">
                            <label>Máximo de usos</label>
                            <input
                                className="qr_page_input"
                                type="number"
                                value={form.max_uses}
                                onChange={(e) =>
                                    updateField("max_uses", e.target.value)
                                }
                                placeholder="Vacío = ilimitado"
                            />
                        </div>

                        <div className="col-12 col-md-4">
                            <label>Activo</label>
                            <select
                                className="qr_page_select"
                                value={form.is_active}
                                onChange={(e) =>
                                    updateField("is_active", Number(e.target.value))
                                }
                            >
                                <option value={1}>Activo</option>
                                <option value={0}>Pausado</option>
                            </select>
                        </div>

                        <div className="col-12 col-md-6">
                            <label>Inicio</label>
                            <input
                                className="qr_page_input"
                                type="datetime-local"
                                value={form.starts_at}
                                onChange={(e) =>
                                    updateField("starts_at", e.target.value)
                                }
                            />
                        </div>

                        <div className="col-12 col-md-6">
                            <label>Fin</label>
                            <input
                                className="qr_page_input"
                                type="datetime-local"
                                value={form.ends_at}
                                onChange={(e) =>
                                    updateField("ends_at", e.target.value)
                                }
                            />
                        </div>

                    </div>

                    <div className="qr_page_actions mt-4">
                        <button
                            type="button"
                            className="qr_page_btn success"
                            disabled={saving}
                            onClick={saveCoupon}
                        >
                            {saving ? "Guardando..." : "Guardar cupón"}
                        </button>

                        <button
                            type="button"
                            className="qr_page_btn secondary"
                            onClick={() => {
                                setShowForm(false);
                                setForm(emptyForm);
                            }}
                        >
                            Cancelar
                        </button>
                    </div>

                </div>
            )}

            <div className="store_coupon_table">

                {loading ? (
                    <div className="qr_page_info_box">
                        Cargando cupones...
                    </div>
                ) : coupons.length === 0 ? (
                    <div className="qr_page_info_box">
                        Todavía no creaste cupones.
                    </div>
                ) : (
                    coupons.map(coupon => (
                        <article
                            key={coupon.id}
                            className="store_coupon_row"
                        >
                            <div>
                                <strong>{coupon.code}</strong>
                                <small>
                                    {typeLabels[coupon.discount_type] || coupon.discount_type}
                                </small>
                            </div>

                            <div>
                                <span>
                                    {coupon.discount_type === "percent"
                                        ? `${Number(coupon.discount_value)}%`
                                        : coupon.discount_type === "fixed"
                                            ? `$${Number(coupon.discount_value).toLocaleString("es-AR")}`
                                            : "Envío gratis"}
                                </span>
                                <small>
                                    Mínimo ${Number(coupon.min_order_total || 0).toLocaleString("es-AR")}
                                </small>
                            </div>

                            <div>
                                <span>
                                    {coupon.used_count || 0}
                                    {" / "}
                                    {coupon.max_uses || "∞"}
                                </span>
                                <small>Usos</small>
                            </div>

                            <div>
                                <span>
                                    {Number(coupon.is_active) === 1
                                        ? "Activo"
                                        : "Pausado"}
                                </span>
                            </div>

                            <div className="store_coupon_actions">
                                <button
                                    type="button"
                                    className="store_admin_small_btn"
                                    onClick={() => editCoupon(coupon)}
                                >
                                    Editar
                                </button>

                                <button
                                    type="button"
                                    className="store_admin_danger_btn"
                                    onClick={() => deactivateCoupon(coupon)}
                                >
                                    Desactivar
                                </button>
                            </div>
                        </article>
                    ))
                )}

            </div>

        </section>
    );
}