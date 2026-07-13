"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { validateQRValue } from "@/app/lib/validateQRValue";
import { extractEditableValue } from "@/app/lib/extractEditableValue";
import { FaChartBar } from "react-icons/fa";
import { hasPermission } from "@/app/lib/permissions";
import { getSubscriptionStatusLabel } from "@/app/lib/helpers/getSubscriptionStatusLabel";
import { mapStatus } from "@/app/lib/helpers/getQrStatusLabel";
import { getValueLabel } from "@/app/lib/helpers/getValueLabel";

import "../../../styles/tagsModals.css";
import "../../../styles/tags_dashboard.css";
import showAlert from "@/app/components/showAlert";
import { FiDownload } from "react-icons/fi";
import QRDownloadModal from "@/app/components/QRDownloadModal";
import QRPageSelectorModal from "@/app/components/businesses/QRPageSelectorModal";
import QRPageActivateModal from "@/app/components/businesses/QRPageActivateModal";
import PortalDashboard from "@/app/components/businesses/PortalDashboard";
import {
  buildPortalDashboard,
  hasAnyPage,
  isTagsIdQR,
  isTagsIdPage,
  isClientReviewsPage
} from "@/app/lib/portal/buildPortalDashboard";
import QRPageManagerModal from "@/app/components/businesses/QRPageManagerModal";
import WorkspaceAppCreateModal from "@/app/components/businesses/WorkspaceAppCreateModal";
import TagsSpinner from "@/app/components/TagsSpinner";

function getQRUrl(code) {
  const base =
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : process.env.NEXT_PUBLIC_BASE_URL_PROD;

  return `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${base}/t/${code}`;
}


/////////////////////////////////////////////////
//Pagina Pricipal del cliente: Portal /QRs Admin
////////////////////////////////////////////////
export default function BusinessDetailClient({ session, isAdmin }) {
  const { id } = useParams();

  const [loading, setLoading] = useState(true);

  const [portal, setPortal] = useState(null);
  const [portalRoutes, setPortalRoutes] = useState([]);
  const [qrPageSelectorOpen, setQrPageSelectorOpen] = useState(false);
  const [qrPageActivateOpen, setQrPageActivateOpen] = useState(false);

  const [qrs, setQrs] = useState([]);
  const [business, setBusiness] = useState(null);

  const [editQR, setEditQR] = useState(null);
  const [editLabel, setEditLabel] = useState("");
  const [editValue, setEditValue] = useState("");
  const [editStopMessage, setEditStopMessage] = useState("");

  const router = useRouter();
  const [store, setStore] = useState(null);
  const [storeActivateOpen, setStoreActivateOpen] =
    useState(false);

  const [openQRModal, setOpenQRModal] = useState(false);
  const [selectedQR, setSelectedQR] = useState(null);
  const [features, setFeatures] = useState(null);

  const [subscriptionSummary, setSubscriptionSummary] =
    useState(null);
  const [businessAddons, setBusinessAddons] =
    useState([]);
  const [qrPageCreateOpen, setQrPageCreateOpen] = useState(false);
  const [reviewsActivateOpen, setReviewsActivateOpen] =
    useState(false);
  const [tagsIdActivateOpen, setTagsIdActivateOpen] =
    useState(false);
  const [portalActivateOpen, setPortalActivateOpen] =
    useState(false);


  // =====================================
  // 🔐 DATOS
  // =====================================

  const plan = session?.plan;

  const permissions = plan?.permissions || {};

  const subscriptionActive =
    session?.subscriptionStatus === "active";

  const subscriptionStatusLabel =
    getSubscriptionStatusLabel(session?.subscriptionStatus);

  // =====================================
  // 🔐 FLAGS
  // =====================================

  const canUseDashboard =
    isAdmin || hasPermission(session, "dashboard");

  const canUseReports =
    isAdmin || hasPermission(session, "reports");

  const canUseAnalytics =
    isAdmin || hasPermission(session, "analytics");

  const canUseAnalyticsPlus =
    isAdmin || hasPermission(session, "analyticsPus");

  const canPauseQr = hasPermission(session, "pauseQr");

  const canEditQr =
    isAdmin || hasPermission(session, "editQr");

  useEffect(() => {
    load();
    loadSubscriptionSummary();
    loadStore();
    loadPortal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function load() {
    const res = await fetch(`/api/business/qrs?id=${id}`);

    const text = await res.text();

    if (!text) {
      console.error("Respuesta vacía del servidor");
      return;
    }

    let data;

    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("JSON inválido:", text);
      return;
    }

    const filteredQrs = (data.qrs || []).filter((qr) =>
      ["active", "pending", "stopped", "assigned"].includes(qr.status)
    );

    setQrs(filteredQrs);
    const featuresRes =
      await fetch(`/api/business/features?business_id=${id}`);

    const featuresData =
      await featuresRes.json().catch(() => null);

    if (featuresData?.ok) {
      setFeatures(featuresData.features);
    }
    setBusiness(data.business || null);

    setBusinessAddons(data.addons || []);

  }

  async function loadPortal() {
    setLoading(true);
    try {
      const res =
        await fetch(`/api/portal/admin/get?businessId=${id}`);

      const data =
        await res.json().catch(() => null);

      if (res.ok && data?.ok) {
        setPortal(data.portal || null);
        setPortalRoutes(Array.isArray(data.routes) ? data.routes : []);
      }

    } catch (err) {
      console.error("PORTAL LOAD ERROR:", err);
    }
    finally {
      setLoading(false);
    }
  }

  async function loadSubscriptionSummary() {

    try {

      const res =
        await fetch(
          `/api/business/subscription-summary?id=${id}`
        );

      const data =
        await res.json().catch(() => null);

      if (res.ok && data?.ok) {
        setSubscriptionSummary(data);
      }

    } catch (err) {

      console.error(
        "SUBSCRIPTION SUMMARY LOAD ERROR:",
        err
      );
    }
  }

  async function loadStore() {
    try {
      const res =
        await fetch(`/api/store/admin/get?businessId=${id}`);

      const data =
        await res.json().catch(() => null);

      if (res.ok && data?.ok) {
        setStore(data.store || null);
      }

    } catch (err) {
      console.error("STORE LOAD ERROR:", err);
    }
  }


  function openEdit(qr) {
    setEditQR(qr);
    setEditLabel(qr.label || "");
    setEditValue(extractEditableValue(qr));
    setEditStopMessage(qr.stop_message || "");
  }

  async function updateStatus(code, action, stopped_message = '', extra = {}) {
    if (action === "deactivate") {
      const confirm = await showAlert({
        title: "Confirmar acción",
        text: `Vas a desactivar el QR ${code}. ¿Continuar?`,
        icon: "warning",
        showCancelButton: true,
      });

      if (!confirm) return;
    }

    const res = await fetch("/api/qr/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({
        code,
        action,
        stopped_message,
        email: extra.email,
        ...extra,
      }),
    });


    const data = await res.json().catch(() => ({}));

    console.log(JSON.stringify({
      code,
      action,
      stopped_message,
      email: extra.email,
      ...extra,
    }))

    if (!res.ok) {
      showAlert({
        title: "Error",
        text: data.error || "Error actualizando QR",
        icon: "error",
      });

      return;
    }

    const msg =
      action === "deactivate"
        ? "QR desactivado"
        : action === "active"
          ? "QR activado"
          : "QR actualizado";

    showAlert({
      title: "OK",
      text: msg,
      icon: "success",
    });

    load();
  }

  async function deleteQR(code) {
    const confirm = await showAlert({
      title: "¿Eliminar QR?",
      text: "Esta acción no se puede deshacer",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
    });

    if (!confirm) return;

    const res = await fetch("/api/qr/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({ code }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      showAlert({
        title: "Error",
        text: data.error || "No se pudo eliminar",
        icon: "error",
      });

      return;
    }

    showAlert({
      title: "OK",
      text: "QR eliminado",
      icon: "success",
    });

    load();
  }

  async function saveEditQR() {
    const result = validateQRValue(
      editQR.qr_type_code,
      editValue
    );

    if (result.error) {
      showAlert({
        title: "Error",
        text: result.error,
        icon: "error",
      });

      return;
    }

    const res = await fetch("/api/qr/update", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        code: editQR.code,
        label: editLabel,
        value: result.value,
        stop_message: editStopMessage
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      showAlert({
        title: "Error",
        text: data.error || "Error actualizando QR",
        icon: "error",
      });

      return;
    }

    showAlert({
      title: "OK",
      text: "QR actualizado correctamente",
      icon: "success",
    });

    setEditQR(null);

    load();
  }

  function handleViewQRPage(qr) {

    if (
      qr.qr_page_status === "published" &&
      qr.qr_page_slug
    ) {
      window.open(
        `/p/${qr.qr_page_slug}`,
        "_blank"
      );

      return;
    }

    showAlert({
      title: "Página no publicada",
      text: "Esta QR-Page todavía no está publicada.",
      icon: "info"
    });
  }



  const {
    qrPages,
    qrsAvailableForQrPage,
    canActivateQrPage,
    canActivateTagsId,
    activePortalFeatures,
    inactivePortalFeatures
  } = buildPortalDashboard({
    qrs,
    store,
    portal,
    subscriptionSummary,
    businessAddons,
    businessId: id,
    router,
    setQrPageSelectorOpen,
    setQrPageActivateOpen: setQrPageCreateOpen,
    setStoreActivateOpen,
    setReviewsActivateOpen,
    setTagsIdActivateOpen,
    setPortalActivateOpen
  });

  if (loading) {
    return (
      <div className="tags_dashboard_page">
        <div
          className="d-flex align-items-center justify-content-center"
          style={{ minHeight: "60vh" }}
        >
          <TagsSpinner />
        </div>
      </div>
    );
  }

  /*  UI  */

  return (
    <div className="tags_dashboard_page">

      {/* HERO */}

      <div className="tags_dashboard_hero">

        <div className="tags_dashboard_hero_left">

          <div className="tags_dashboard_logo_box">

            <Image
              src="/logo_tags_transparente.webp"
              alt="Tags"
              width={70}
              height={70}
              className="img-fluid"
            />

          </div>

          <div>

            <h1 className="tags_dashboard_title">
              Portal Digital 👤
            </h1>

            <p className="tags_dashboard_subtitle">
              Panel de control del negocio, funcionalidades y accesos QR
            </p>

          </div>

        </div>

        {(isAdmin || features?.plan?.permissions?.analytics) && (

          <button
            className="tags_dashboard_stats_btn"
            onClick={() =>
              router.push(
                `/dashboard/businesses/stats?business_id=${id}`
              )
            }
          >
            📊 Ver estadísticas
          </button>

        )}

      </div>

      {/* CLIENT CARD */}

      <div className="tags_dashboard_client_card">

        <div className="tags_dashboard_client_top">

          <div>

            <p className="tags_dashboard_client_label">
              Cliente
            </p>

            <h3 className="tags_dashboard_client_email">
              {business?.email || ""}
            </h3>

          </div>

          <div className="tags_dashboard_plan_box">

            <span className="tags_dashboard_plan">
              {plan?.name || "Administrador"}
            </span>

            <span
              className={`badge ${subscriptionStatusLabel === "Activo"
                ? "active"
                : "disabled"
                }`}
            >
              {subscriptionStatusLabel}
            </span>

          </div>

        </div>

      </div>

      {/* RESUMEN DE SUBCRIPCION */}
      {subscriptionSummary && (
        <div className=" mb-4 W-100 mt-3 mb-5">

          <div className="row align-items-start">

            <div className="col-12 col-md-4 mb-3 mb-md-0">

              <small className="text-muted">
                Plan contratado
              </small>

              <h3 className="m-0">
                {subscriptionSummary.plan?.name || "-"}
              </h3>

              <p className="m-0 text-muted">
                {subscriptionSummary.plan?.description || "Sin descripción"}
              </p>

              <div className="mt-2 d-flex gap-2 flex-wrap">

                <span className="tags_badge tags_badge_info">
                  {subscriptionSummary.plan?.currency || "ARS"}{" "}
                  {Number(subscriptionSummary.plan?.price || 0).toLocaleString("es-AR")}
                </span>

                <span className={
                  subscriptionSummary.subscription?.status === "active"
                    ? "tags_badge tags_badge_success"
                    : "tags_badge tags_badge_warning"
                }>
                  {subscriptionSummary.subscription?.status || "-"}
                </span>

              </div>

            </div>

            <div className="col-12 col-md-4 mb-3 mb-md-0">

              <small className="text-muted">
                Suscripción
              </small>

              <p className="m-0">
                <strong>Inicio:</strong>{" "}
                {
                  subscriptionSummary.subscription?.started_at
                    ? new Date(subscriptionSummary.subscription.started_at).toLocaleDateString("es-AR")
                    : "-"
                }
              </p>

              <p className="m-0">
                <strong>Vence:</strong>{" "}
                {
                  subscriptionSummary.subscription?.expires_at
                    ? new Date(subscriptionSummary.subscription.expires_at).toLocaleDateString("es-AR")
                    : "Sin vencimiento"
                }
              </p>

              <p className="m-0">
                <strong>Auto renovación:</strong>{" "}
                {
                  Number(subscriptionSummary.subscription?.auto_renew) === 1
                    ? "Sí"
                    : "No"
                }
              </p>

            </div>

            <div className="col-12 col-md-4">

              <small className="text-muted">
                Último pago
              </small>

              {
                subscriptionSummary.lastPayment ? (
                  <>
                    <p className="m-0">
                      <strong>Monto:</strong>{" "}
                      {subscriptionSummary.lastPayment.currency}{" "}
                      {Number(subscriptionSummary.lastPayment.amount || 0).toLocaleString("es-AR")}
                    </p>

                    <p className="m-0">
                      <strong>Medio:</strong>{" "}
                      {subscriptionSummary.lastPayment.provider}
                    </p>

                    <p className="m-0">
                      <strong>Fecha:</strong>{" "}
                      {
                        subscriptionSummary.lastPayment.paid_at
                          ? new Date(subscriptionSummary.lastPayment.paid_at).toLocaleDateString("es-AR")
                          : "-"
                      }
                    </p>
                  </>
                ) : (
                  <p className="m-0">
                    No hay pagos registrados.
                  </p>
                )
              }

            </div>

          </div>

          <hr />

          <div className="row">

            <div className="col-6 col-md-2 mb-3">
              <strong>QRs</strong>
              <div>
                {subscriptionSummary.usage.qrs_used} / {subscriptionSummary.usage.qrs_total}
              </div>
            </div>

            <div className="col-6 col-md-2 mb-3">
              <strong>QR-Page</strong>
              <div>
                {subscriptionSummary.usage.qr_pages_used} / {subscriptionSummary.usage.qr_pages_total}
              </div>
            </div>

            <div className="col-6 col-md-2 mb-3">
              <strong>Tags ID</strong>
              <div>
                {subscriptionSummary.usage.tags_id_used} / {subscriptionSummary.usage.tags_id_total}
              </div>
            </div>

            <div className="col-6 col-md-2 mb-3">
              <strong>Tienda</strong>
              <div>
                {subscriptionSummary.usage.store_used}
                {" / "}
                {subscriptionSummary.usage.store_total}
              </div>
            </div>

            <div className="col-6 col-md-2 mb-3">
              <strong>Reviews</strong>
              <div>
                {subscriptionSummary.usage.reviews_used}
                {" / "}
                {subscriptionSummary.usage.reviews_total}
              </div>
            </div>

            <div className="col-6 col-md-2 mb-3">
              <strong>Analytics</strong>
              <div>
                {
                  subscriptionSummary.features.analytics_plus_enabled
                    ? "Full"
                    : subscriptionSummary.features.analytics_enabled
                      ? "Básico"
                      : "No incluido"
                }
              </div>
            </div>

          </div>

          <div className="d-flex gap-2 flex-wrap mt-2">

            {subscriptionSummary.features.dashboard_enabled && (
              <span className="tags_badge tags_badge_success">
                Dashboard
              </span>
            )}

            {subscriptionSummary.features.reports_enabled && (
              <span className="tags_badge tags_badge_success">
                Reportes
              </span>
            )}

            {subscriptionSummary.features.reports_email_enabled && (
              <span className="tags_badge tags_badge_success">
                Reportes email
              </span>
            )}

            {subscriptionSummary.features.reports_whatsapp_enabled && (
              <span className="tags_badge tags_badge_success">
                Reportes WhatsApp
              </span>
            )}

            {subscriptionSummary.features.allow_edit_qr && (
              <span className="tags_badge tags_badge_success">
                Editar QR
              </span>
            )}

            {subscriptionSummary.features.allow_pause_qr && (
              <span className="tags_badge tags_badge_success">
                Pausar QR
              </span>
            )}

            {subscriptionSummary.features.priority_support && (
              <span className="tags_badge tags_badge_info">
                Soporte prioritario
              </span>
            )}

          </div>

          {!isAdmin && (
            <div className="mt-3">
              <button
                type="button"
                className="tags_btn rounded tags_text_normal"
                style={{
                  maxWidth: "230px"
                }}
                onClick={() =>
                  showAlert({
                    title: "Plan y suscripción",
                    text: "Para renovar, cambiar de plan o consultar tu suscripción, contactanos.",
                    icon: "info"
                  })
                }
              >
                💬 Consultar plan
              </button>
            </div>
          )}

          {isAdmin && (
            <div className="mt-3">
              <button
                type="button"
                className="tags_btn rounded tags_text_normal"
                style={{
                  maxWidth: "230px"
                }}
                onClick={() =>
                  router.push(
                    `/dashboard/businesses/${id}/subscriptions`
                  )
                }
              >
                👤 Administrar suscripción
              </button>
            </div>
          )}

        </div>
      )}


      {/* ===================================== */}
      {/* PORTAL FEATURES */}
      {/* ===================================== */}
      <PortalDashboard
        business={business}
        portal={portal}
        portalRoutes={portalRoutes}
        activePortalFeatures={activePortalFeatures}
        inactivePortalFeatures={inactivePortalFeatures}
        onReload={loadPortal}
      />

      <div className="tags_portal_section_header">
        <div>
          <h2>QRs Inteligentes</h2>
          <p>
            Accesos físicos o digitales del negocio. Pueden apuntar al Portal,
            a una funcionalidad o a un enlace externo.
          </p>
        </div>
      </div>

      {/* TABLE */}

      <div className="tags_dashboard_table_card">

        <div className="tags_dashboard_table_scroll">

          <table className="tags_dashboard_table">

            <thead>

              <tr>

                <th>QR</th>

                <th>Nombre</th>

                <th>Tipo</th>

                <th>Destino</th>

                <th>Estado</th>

                <th>Mensaje Pausado</th>

                <th>Acciones</th>

              </tr>

            </thead>

            <tbody>

              {qrs.map((qr) => {

                /* console.log("QR BUTTON DEBUG", {
                  code: qr.code,
                  qr_type_code: qr.qr_type_code,
                  qr_type_name: qr.qr_type_name,
                  hasAnyPage: hasAnyPage(qr),
                  isTagsIdQR: isTagsIdQR(qr),
                  hasTagsIdAlready,
                  canActivateTagsId,
                  featuresTagsId: features?.tagsId,
                  subscriptionUsage: subscriptionSummary?.usage
                }); */

                return (


                  <tr key={qr.id}>

                    {/* QR */}

                    <td>

                      <div className="tags_dashboard_qr_cell">

                        <Image
                          src={getQRUrl(qr.code)}
                          width={82}
                          height={82}
                          alt={`qr-${qr.code}`}
                          className="tags_dashboard_qr_image"
                        />

                        <div className="tags_dashboard_qr_meta">

                          <small>
                            {qr.code}
                          </small>

                          <button
                            className=" mt-1"
                            title="Descargar/Escanear QR"
                            style={{
                              fontSize: "12px",
                              padding: "4px 8px",
                              borderRadius: "5px",
                              backgroundColor: "#787978",
                              color: "#fff",
                              border: "none",
                              fontWeight: "500",

                            }}
                            onClick={() => {

                              setSelectedQR(qr);
                              setOpenQRModal(true);

                            }}
                          >
                            <FiDownload />
                          </button>

                        </div>

                      </div>

                    </td>

                    {/* LABEL */}

                    <td>

                      <div className="tags_dashboard_label">
                        {qr.label || "-"}
                      </div>

                    </td>

                    {/* TYPE */}

                    <td>

                      <div className="tags_dashboard_type">
                        {qr.qr_type_name || "-"}
                      </div>

                    </td>

                    {/* URL */}

                    <td>

                      <div className="tags_dashboard_url">
                        {qr.final_url ||
                          qr.destination_url ||
                          "-"}
                      </div>

                    </td>

                    {/* STATUS */}

                    <td>

                      <span
                        className={`badge ${qr.status}`}
                      >
                        {mapStatus(qr.status)}
                      </span>

                    </td>

                    {/* Stop_Message */}
                    {/* TYPE */}

                    <td>

                      <div className="tags_dashboard_type">
                        {qr.stop_message || "-"}
                      </div>

                    </td>

                    {/* ACTIONS */}

                    <td>

                      <div className="tags_dashboard_actions">

                        <button
                          className="tags_dashboard_icon_btn"
                          title="Editar"
                          onClick={() => openEdit(qr)}
                        >
                          ✏️
                        </button>

                        {/* ========================= */}
                        {/* CLIENT REVIEWS */}
                        {/* ========================= */}
                        {isClientReviewsPage(qr) && (
                          <>
                            <button
                              className="tags_dashboard_icon_btn"
                              title="Ver formulario público"
                              onClick={() => handleViewQRPage(qr)}
                            >
                              🌐
                            </button>

                            <button
                              className="tags_dashboard_icon_btn"
                              title="Gestionar Tags Reviews"
                              onClick={() =>
                                router.push(
                                  `/dashboard/businesses/${id}/qrs/${qr.id}/client-reviews`
                                )
                              }
                            >
                              ⭐
                            </button>
                          </>
                        )}

                        {/* ========================= */}
                        {/* QR-PAGE / TAGSID */}
                        {/* ========================= */}

                        {hasAnyPage(qr) && !isClientReviewsPage(qr) && (
                          <>
                            <button
                              style={{
                                minWidth: "80px"
                              }}
                              type="button"
                              className="tags_dashboard_icon_btn"
                              title={
                                qr.qr_page_status === "published"
                                  ? "Ver página pública"
                                  : "Página no publicada"
                              }
                              onClick={() => handleViewQRPage(qr)}
                            >
                              <div
                                className="d-flex flex-column align-items-center justify-content-center"
                                style={{
                                  lineHeight: 1.1
                                }}
                              >
                                <span style={{ fontSize: "14px" }}>
                                  {
                                    qr.qr_page_status === "published"
                                      ? "🟢"
                                      : "🟡"
                                  }
                                </span>

                                <span
                                  style={{
                                    fontSize: "10px",
                                    marginTop: 2
                                  }}
                                >
                                  {
                                    qr.qr_page_status === "published"
                                      ? (
                                        isTagsIdPage(qr)
                                          ? "Ver TagsID"
                                          : "Ver QR-Page"
                                      )
                                      : "Sin publicar"
                                  }
                                </span>
                              </div>
                            </button>

                            <button
                              className="tags_dashboard_icon_btn"
                              title={
                                isTagsIdPage(qr)
                                  ? "Editar TagsID"
                                  : "Editar QR-Page"
                              }
                              onClick={() =>
                                router.push(
                                  `/dashboard/businesses/${id}/qrs/${qr.id}/qr-page`
                                )
                              }
                            >
                              {isTagsIdPage(qr) ? "🪪" : "📄"}
                            </button>
                          </>
                        )}

                        {!hasAnyPage(qr) && !isTagsIdQR(qr) && canActivateQrPage && (
                          <button
                            className="tags_dashboard_icon_btn"
                            title="Activar QR-Page"
                            onClick={() =>
                              router.push(
                                `/dashboard/businesses/${id}/qrs/${qr.id}/qr-page/activate`
                              )
                            }
                          >
                            ➕📄
                          </button>
                        )}

                        {!hasAnyPage(qr) && !isTagsIdQR(qr) && !canActivateQrPage && (
                          <button
                            className="tags_dashboard_icon_btn"
                            title="Sin cupo QR-Page"
                            onClick={() =>
                              showAlert({
                                title: "Sin cupo QR-Page",
                                text: "Este cliente no tiene QR-Pages disponibles.",
                                icon: "info"
                              })
                            }
                          >
                            🚫📄
                          </button>
                        )}

                        {!hasAnyPage(qr) && isTagsIdQR(qr) && canActivateTagsId && (
                          <button
                            className="tags_dashboard_icon_btn"
                            title="Activar TagsID"
                            onClick={() =>
                              router.push(
                                `/dashboard/businesses/${id}/qrs/${qr.id}/tags-id`
                              )
                            }
                          >
                            🪪
                          </button>
                        )}

                        {qr.status === "active" ? (

                          <button
                            className="tags_dashboard_icon_btn"
                            title="Pausar"
                            onClick={() =>
                              updateStatus(
                                qr.code,
                                "stopped",
                                qr.stop_message
                              )
                            }
                          >
                            ⏸️
                          </button>

                        ) : qr.status === "stopped" ? (

                          <button
                            className="tags_dashboard_icon_btn"
                            title="Reactivar"
                            onClick={() =>
                              updateStatus(
                                qr.code,
                                "reactive",
                                {
                                  email:
                                    business.email,
                                  business_id:
                                    business.id,
                                  label: qr.label,
                                }
                              )
                            }
                          >
                            ▶️
                          </button>

                        ) : null}

                      </div>

                    </td>

                  </tr>

                );
              })}

            </tbody>

          </table>

        </div>

      </div>

      {/* ===================================== */}
      {/* EDIT MODAL */}
      {/* ===================================== */}

      <WorkspaceAppCreateModal
        open={portalActivateOpen}
        businessId={id}
        title="Portal Público"
        description="Creá el Portal Público de tu negocio."
        endpoint="/api/workspace/apps/portal-public/activate"
        createButtonLabel="Crear Portal"
        successTitle="Portal creado"
        successMessage="El Portal Público fue creado correctamente."
        onClose={() => setPortalActivateOpen(false)}
        onCreated={async () => {
          await loadPortal();
          setPortalActivateOpen(false);
        }}
      />

      <WorkspaceAppCreateModal
        open={tagsIdActivateOpen}
        businessId={id}
        title="Tags ID"
        description="Creá tu perfil profesional digital."
        endpoint="/api/workspace/apps/tags-id/activate"
        createButtonLabel="Crear Perfil"
        successTitle="Perfil creado"
        successMessage="Tu Tags ID fue creado correctamente."
        onClose={() =>
          setTagsIdActivateOpen(false)
        }
        onCreated={() => {
          load();
          loadPortal();
          setTagsIdActivateOpen(false);

        }}
      />

      <WorkspaceAppCreateModal
        open={storeActivateOpen}
        businessId={id}
        title="Tags Tienda"
        description="Creá tu tienda online."
        endpoint="/api/workspace/apps/store/activate"
        createButtonLabel="Crear Tienda"
        successTitle="Tienda creada"
        successMessage="La tienda fue creada correctamente."
        onClose={() =>
          setStoreActivateOpen(false)
        }
        onCreated={() => {
          load();
          loadStore();
          loadPortal();
          setStoreActivateOpen(false);
        }}
      />

      <WorkspaceAppCreateModal
        open={reviewsActivateOpen}
        businessId={id}
        title="Tags Reviews"
        description="Creá el sistema de reseñas del negocio."
        endpoint="/api/workspace/apps/client-reviews/activate"
        createButtonLabel="Crear Reviews"
        successTitle="Tags Reviews creado"
        successMessage="El sistema de reseñas fue creado correctamente."
        onClose={() =>
          setReviewsActivateOpen(false)
        }
        onCreated={() => {
          load();
          loadPortal();
          setReviewsActivateOpen(false);
        }}
      />

      <QRPageManagerModal
        qrPages={qrPages}
        total={subscriptionSummary?.usage?.qr_pages_total || 0}
        router={router}
        open={qrPageCreateOpen}
        businessId={id}
        onClose={() => setQrPageCreateOpen(false)}
        onCreated={() => {
          load();
          loadSubscriptionSummary();
          loadPortal();
        }}
      />

      <QRPageSelectorModal
        open={qrPageSelectorOpen}
        qrPages={qrPages}
        businessId={id}
        router={router}
        onClose={() => setQrPageSelectorOpen(false)}
      />

      <QRPageActivateModal
        open={qrPageActivateOpen}
        qrsAvailableForQrPage={qrsAvailableForQrPage}
        businessId={id}
        router={router}
        onClose={() => setQrPageActivateOpen(false)}
      />


      {editQR && (

        <div className="tags_modal_overlay">

          <div className="tags_modal_card tags_card_block tags_text_normal">

            <div className="tags_modal_header row align-items-center">

              <div className="col-4 tags_modal_logo_container">

                <Image
                  src="/logo_tags_transparente.webp"
                  alt="Tags"
                  width={120}
                  height={90}
                  className="img-fluid"
                />

              </div>

              <div className="col-8 tags_modal_title_container">

                <h2 className="tags_modal_title tags_title_super">
                  Editar QR
                </h2>

                <p className="tags_modal_description tags_text_normal">
                  Configurá el nombre y enlace del QR
                </p>

              </div>

            </div>

            <div className="tags_modal_body">

              <div className="tags_modal_group">

                <label className="tags_modal_label tags_text_normal">
                  Nombre del QR
                </label>

                <input
                  className="tags_modal_input tags_text_normal"
                  value={editLabel}
                  onChange={(e) =>
                    setEditLabel(e.target.value)
                  }
                  placeholder="Ej: Carta Principal"
                />

              </div>

              <div className="tags_modal_group tags_modal_badge_container m-2">

                <span className="tags_modal_badge">

                  {editQR?.qr_type_code
                    ? editQR.qr_type_code.charAt(0).toUpperCase() +
                    editQR.qr_type_code.slice(1)
                    : "-"}

                </span>

              </div>

              <div className="tags_modal_group">

                <label className="tags_modal_label tags_text_normal">
                  Enlace del QR
                </label>

                <input
                  className="tags_modal_input tags_text_normal"
                  value={editValue}
                  onChange={(e) =>
                    setEditValue(e.target.value)
                  }
                  placeholder={
                    getValueLabel(
                      editQR?.qr_type_code
                    ).place
                  }
                />

              </div>
              {/* Stop_Message */}
              <div className="tags_modal_group mt-4">

                <label className="tags_modal_label tags_text_normal">
                  Mensaje cuando el QR está pausado
                </label>

                <textarea
                  className="tags_modal_input tags_text_normal"
                  rows={3}
                  value={editStopMessage}
                  onChange={(e) =>
                    setEditStopMessage(e.target.value)
                  }
                  placeholder="Este QR se encuentra temporalmente deshabilitado."
                />

              </div>

            </div>

            <div className="tags_modal_actions">

              <button
                className="tags_modal_btn tags_modal_btn_success tags_subtitle"
                onClick={saveEditQR}
              >
                🖫 Guardar
              </button>

              <button
                className="tags_modal_btn tags_modal_btn_cancel tags_text_normal"
                onClick={() => setEditQR(null)}
              >
                ✖ Cancelar
              </button>

            </div>

          </div>

        </div>

      )}

      {/* MODAL DE DESCARGA QR */}
      {/* ******************* */}
      <QRDownloadModal
        isOpen={openQRModal}
        onClose={() => setOpenQRModal(false)}
        qr={selectedQR}
      />
    </div>
  );
}