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

function getQRUrl(code) {
  const base =
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : process.env.NEXT_PUBLIC_BASE_URL;

  return `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${base}/t/${code}`;
}

export default function BusinessDetailClient({ session, isAdmin }) {
  const { id } = useParams();

  const [qrs, setQrs] = useState([]);
  const [business, setBusiness] = useState(null);

  const [editQR, setEditQR] = useState(null);
  const [editLabel, setEditLabel] = useState("");
  const [editValue, setEditValue] = useState("");

  const router = useRouter();

  const [openQRModal, setOpenQRModal] = useState(false);
  const [selectedQR, setSelectedQR] = useState(null);

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

    setBusiness(data.business || null);
  }

  function openEdit(qr) {
    setEditQR(qr);
    setEditLabel(qr.label || "");
    setEditValue(extractEditableValue(qr));
  }

  async function updateStatus(code, action, extra = {}) {
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
        email: extra.email,
        ...extra,
      }),
    });

    const data = await res.json().catch(() => ({}));

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
              Dashboard 👤
            </h1>

            <p className="tags_dashboard_subtitle">
              Gestión y reporting de códigos QR
            </p>

          </div>

        </div>

        {canUseAnalytics && (

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

                <th>Acciones</th>

              </tr>

            </thead>

            <tbody>

              {qrs.map((qr) => (

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

                      {qr.status === "active" ? (

                        <button
                          className="tags_dashboard_icon_btn"
                          title="Pausar"
                          onClick={() =>
                            updateStatus(
                              qr.code,
                              "stopped"
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

              ))}

            </tbody>

          </table>

        </div>

      </div>

      {/* ===================================== */}
      {/* EDIT MODAL */}
      {/* ===================================== */}

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

              <div className="tags_modal_group tags_modal_badge_container">

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