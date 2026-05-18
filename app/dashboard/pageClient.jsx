"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import showAlert from "../components/showAlert";
import { validateQRValue } from "../lib/validateQRValue";
import TagsHeader from "../components/Header";
import { getValueLabel } from "../lib/helpers/getValueLabel";
import { mapStatus } from "../lib/helpers/getQrStatusLabel";
import "../styles/tagsModals.css"
import "../styles/tags_global.css"
import QRDownloadModal from "../components/QRDownloadModal";
import { FiDownload } from "react-icons/fi";


function getQRUrl(code) {
  /*  const base = "http://localhost:3000"; */
  const base = process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : process.env.NEXT_PUBLIC_BASE_URL;

  return `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${base}/t/${code}`;
}


export default function DashboardAdminClient({ session }) {



  const [list, setList] = useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [sort, setSort] = useState({ field: "id", dir: "desc" });

  const [selectedQR, setSelectedQR] = useState(null);
  const [stats, setStats] = useState(null);

  const [qrTypes, setQrTypes] = useState([]);

  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState("");

  const [assignQR, setAssignQR] = useState(null);

  const [assignEmail, setAssignEmail] = useState("");
  const [assignName, setAssignName] = useState("");
  const [assignPhone, setAssignPhone] = useState("");
  const [assignLabel, setAssignLabel] = useState("");
  const [assignMode, setAssignMode] = useState({
    forceActive: false
  });

  const [assignValue, setAssignValue] = useState("");

  const [editQR, setEditQR] = useState(null);
  const [editLabel, setEditLabel] = useState("");
  const [editValue, setEditValue] = useState("");

  const [total, setTotal] = useState(0);

  const [openQRModal, setOpenQRModal] = useState(false);

  // -----------------------------
  // LOAD
  // -----------------------------
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetch("/api/qr/types")
      .then(r => r.json())
      .then(data => setQrTypes(data.data || []))
      .catch(() => setQrTypes([]));
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, typeFilter, page]);

  async function load() {
    const query = new URLSearchParams({
      q: search,
      status: statusFilter,
      type: typeFilter,
      page,
      limit: 20
    });

    const res = await fetch(`/api/qr/search?${query}`);

    if (!res.ok) {
      const err = await res.json();
      console.error(err);
      return;
    }

    const data = await res.json();
    /* console.log("Datos: " + JSON.stringify(data)) */
    setList(data.data || []);
    setPages(data.pages || 1);
    setTotal(data.total || 0);
  }

  // -----------------------------
  // SEARCH
  // -----------------------------
/*   async function handleSearch(e) {
    const value = e.target.value;
    setSearch(value);
    load(value);
  } */

  // -----------------------------
  // SORT
  // -----------------------------
  function handleSort(field) {
    setSort(prev => ({
      field,
      dir: prev.field === field && prev.dir === "asc" ? "desc" : "asc"
    }));
  }

  function sortData(data) {
    return [...data].sort((a, b) => {
      const A = a[sort.field] || "";
      const B = b[sort.field] || "";

      if (A < B) return sort.dir === "asc" ? -1 : 1;
      if (A > B) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
  }

  //------------------
  // abrir Modal Asignar Qr
  //-------------------

  function openAssign(qr, options = {}) {
    setAssignQR(qr);
    setAssignEmail("");
    setAssignName("");
    setAssignPhone("");
    setAssignLabel(qr.label || "");
    setAssignMode({
      forceActive: options.forceActive || false
    });
  }
  //------------------
  // abrir Modal Editar Qr
  //-
  function openEdit(qr) {
    setEditQR(qr);
    setEditLabel(qr.label || "");
    setEditValue(qr.value || "");
  }

  /* ACTIVAR EL QR */
  async function confirmAssign() {

    const confirm = await showAlert({
      title: "Confirmar activación",
      text: "¿Querés activar este QR?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, activar",
      cancelButtonText: "Cancelar"
    });

    if (!confirm) return;

    let finalValue = null;

    // 🔥 SOLO SI ES ACTIVACIÓN DIRECTA
    if (assignMode.forceActive) {

      if (!assignEmail) {
        alert("El email es obligatorio");
        return;
      }

      // 👉 validar según tipo QR
      const result = validateQRValue(
        assignQR.qr_type_code,
        assignValue
      );

      if (result.error) {
        alert(result.error);
        return;
      }

      finalValue = result.value;
    }

    const action = assignMode.forceActive ? "active" : "assign";

    const res = await fetch("/api/qr/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: assignQR.code,
        action,
        email: assignEmail || null,
        name: assignName || null,
        phone: assignPhone || null,
        label: assignLabel || null,
        value: finalValue // 👈 SOLO SE USA SI ES ACTIVE
      })
    });

    const data = await res.json();

    if (!res.ok) {
      showAlert({
        title: "Error",
        text: data.error,
        icon: "error"
      });
      return;
    }

    showAlert({
      title: "OK",
      text: "QR activado correctamente",
      icon: "success"
    });

    setAssignQR(null);
    load();
  }

  //----------------------
  // Guardar la Edicion del QR
  //----------------------
  async function saveEditQR() {
    const confirm = await showAlert({
      title: "Confirmar cambios",
      text: "¿Guardar cambios del QR?",
      icon: "warning",
      showCancelButton: true
    });

    if (!confirm) return;

    const res = await fetch("/api/qr/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: editQR.code,
        label: editLabel,
        value: editValue
      })
    });

    const data = await res.json();

    if (!res.ok) {
      showAlert({
        title: "Error",
        text: data.error || "Error actualizando QR",
        icon: "error"
      });
      return;
    }

    showAlert({
      title: "OK",
      text: "QR actualizado",
      icon: "success"
    });

    setEditQR(null);
    load();
  }


  /* DEACTIVATE QR */
  async function updateStatus(code, action, extra = {}) {

    // -----------------------------
    // CONFIRM STOCK RESET
    // -----------------------------
    if (action === "available") {

      const confirm = await showAlert({
        title: "Pasar a stock",
        text: "Esto borrará TODOS los datos del QR (cliente, link, etc). ¿Continuar?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sí, resetear",
        cancelButtonText: "Cancelar"
      });

      if (!confirm) return;
    }

    // confirmación
    if (action === "deactivate") {
      const confirm = await showAlert({
        title: "Confirmar acción",
        text: `Vas a desactivar el QR ${code}. ¿Continuar?`,
        icon: "warning",
        showCancelButton: true
      });

      if (!confirm) return;
    }

    const res = await fetch("/api/qr/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        action,
        ...extra
      })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      showAlert({
        title: "Error",
        text: data.error || "Error actualizando QR",
        icon: "error"
      });
      return;
    }

    const msg =
      action === "deactivate"
        ? "QR desactivado"
        : action === "active"
          ? "QR activado"
          : action === "available" ? "QR en Stock Ok!"
            : "QR actualizado";

    showAlert({
      title: "OK",
      text: msg,
      icon: "success"
    });

    load();
  }

  /* DELETE QR */
  async function deleteQR(code) {

    const confirm = await showAlert({
      title: "¿Eliminar QR?",
      text: "Esta acción no se puede deshacer",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar"
    });

    if (!confirm) return;

    const res = await fetch("/api/qr/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      showAlert({
        title: "Error",
        text: data.error || "No se pudo eliminar",
        icon: "error"
      });
      return;
    }

    showAlert({
      title: "OK",
      text: "QR eliminado",
      icon: "success"
    });

    load();
  }

  // -----------------------------
  // STATS
  // -----------------------------
/*   async function loadStats(qr) {
    const res = await fetch(`/api/stats?code=${qr.code}`);
    const data = await res.json();

    setSelectedQR(qr);
    setStats({
      ...data,
      daily: data.daily.map(d => ({
        ...d,
        date: d.date.split("T")[0]
      }))
    });
  } */

  // -----------------------------
  // STATUS
  // -----------------------------
/*   async function changeStatus(code) {
    await fetch("/api/qr/deactivate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code })
    });

    load(search);
  }
 */

  // -----------------------------
  // RENDER
  // -----------------------------
  return (

    <div className="contaiber-fluid tags_container tags_text_normal m-0 p-1">
      <TagsHeader />

      <div className="row d-flex justify-content-start align-items-center">
        <div className="tags_navbar mt-3 col-12 col-md-6">
          <Link href="/dashboard/create">📦 +QRs</Link>
          <Link href="/dashboard/qr-types">🏷 Tipos</Link>
          <Link href="/dashboard/businesses">👤 Clientes</Link>
          <Link href="/dashboard/stats">📊 Estadísticas</Link>
        </div>
        {/* <div className="d-flex justify-content-end col-12 col-md-6 mb-3 pe-3">
          👤{`${session.session?.user?.name} - ${session.session?.user?.email} `}
        </div> */}
      </div>
      {/* NAVBAR */}


      {/* FILTERS */}
      <div className="tags_filters row d-flex justify-content-start align-items-end">


        {/* STATUS */}
        <div className="filter_group d-flex flex-column  col-6 col-md-3 mb-4">
          <label>Estado QR</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="form-select tags_text_normal"
          >
            <option value="">Todos</option>
            <option value="active">Activos</option>
            <option value="assigned">Asignados</option>
            <option value="disabled">Deshabilitados</option>
            <option value="available">En stock</option>
            <option value="pending">Pendientes</option>
          </select>
        </div>

        {/* TYPE */}
        <div className="filter_group d-flex flex-column col-6 col-md-3 mb-4">
          <label>Tipo QR</label>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="form-select tags_text_normal"
          >
            <option value="">Todos los tipos</option>

            {qrTypes.map(t => (
              <option key={t.id} value={t.code}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* SEARCH */}
        <div className="filter_group search_group col-12 col-md-6 mb-4">
          <div className="row d-flex justify-content-start align-items-center">
            <div className="col-9 col-md-10">
              <input
                className="form-control w-100 tags_text_normal"
                placeholder="Buscar QR o cliente..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}

              />
            </div>
            <div className="filter_group search_group col-3 col-md-2">
              <span className="ms-2 tags_text_destacado">{total} QRs</span>
            </div>
          </div>
        </div>



        {/*  <div className="tags_filters_right col-6 col-md-1">
          
        </div>
 */}
      </div>

      {/* TABLE */}
      <div className="tags_table_wrapper">

        <table className="tags_table tags_text_normal">

          <thead>
            <tr>
              <th onClick={() => handleSort("code")}>QR</th>
              <th onClick={() => handleSort("qr_type_code")}>Tipo</th>
              <th onClick={() => handleSort("status")}>Estado</th>
              <th onClick={() => handleSort("status")}>Etiqueta Qr</th>
              <th>Acciones</th>
              <th>Destino/Enlace</th>
              <th onClick={() => handleSort("business_name")}>Cliente</th>
              <th onClick={() => handleSort("label")}>Nombre</th>
            </tr>
          </thead>

          <tbody>
            {sortData(list)
              .filter(qr => !statusFilter || qr.status === statusFilter)
              .map(qr => (
                <tr key={qr.id}>

                  <td>
                    <div className="qr_cell">

                      <Image
                        src={getQRUrl(qr.code)}
                        width={50}
                        height={50}
                        alt="qr"
                      />

                      <div className="d-flex flex-column">

                        <span>
                          {qr.code}
                        </span>

                          <button
                            className=" mt-1"
                            title="Descargar QR"
                            style={{
                              fontSize: "12px",
                              padding: "4px 8px",
                              borderRadius: "5px",
                              backgroundColor:"#787978",
                              color:"#fff",
                              border:"none",
                              fontWeight:"500",
                              
                            }}
                            onClick={() => {

                              setSelectedQR(qr);
                              setOpenQRModal(true);

                            }}
                                                      >
                            <FiDownload/>
                          </button>

                      </div>

                    </div>
                  </td>
                  <td >{qr.qr_type_name || "-"}</td>
                  <td>
                    <span className={`badge ${qr.status}`}>
                      {mapStatus(qr.status)}
                    </span>
                  </td>
                  <td>
                    <span className={`badge label`}>
                      {mapStatus(qr.label)}
                    </span>
                  </td>

                  <td>
                    <div className="actions d-flex align-items-center justify-content-center gap-2">

                      <button className="icon_btn success" title="Modificar Qr" onClick={() => openEdit(qr)}>
                        ✏️
                      </button>

                      <button className="icon_btn success" title="Borrar Qr" onClick={() => deleteQR(qr.code)}>
                        🗑
                      </button>

                      {qr.status === "active" && (
                        <button className="icon_btn success" title="DesActivar" onClick={() => updateStatus(qr.code, "deactivate")}>
                          ⛔
                        </button>
                      )}

                      {qr.status === "pending" && (
                        <button
                          className="icon_btn success"
                          title="ReActivar"
                          onClick={() =>
                            updateStatus(qr.code, "active", {
                              email: qr.email,
                              business_id: qr.business_id
                            })
                          }
                        >
                          🔄
                        </button>
                      )}

                      {qr.status === "available" && (
                        <button className="icon_btn success" title="Asignar Venta" onClick={() => openAssign(qr)}>
                          💰
                        </button>
                      )}

                      {/* VENTA + ACTIVACIÓN */}
                      {qr.status !== "active" && (
                        <button
                          className="icon_btn primary"
                          title="Activar"
                          onClick={() => openAssign(qr, { forceActive: true })}
                        >
                          ⚡
                        </button>
                      )}

                      {qr.status === "disabled" && (
                        <button className="icon_btn success" title="ReActivar" onClick={() => updateStatus(qr.code, "active")}>
                          🔄
                        </button>
                      )}
                      {qr.status !== "available" && (
                        <button className="icon_btn success" title="Poner en Stock" onClick={() => updateStatus(qr.code, "available")}>
                          📦
                        </button>
                      )}

                    </div>
                  </td>
                  <td className="truncate">{qr.final_url || "-"}</td>
                  <td>{qr.email || "-"}</td>
                  <td>{qr.business_name || "-"}</td>
                </tr>
              ))}
          </tbody>

        </table>

      </div>
      {/* PAGINACION */}
      <div className="tags_pagination mt-4 mb-5">

        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
          style={{ borderRadius: "5px" }}
          className="ms-2 me-2"
        >
          ⬅
        </button>

        <span>Página {page} de {pages}</span>

        <button
          disabled={page === pages}
          onClick={() => setPage(page + 1)}
          style={{ borderRadius: "5px" }}
          className="ms-2 me-2"
        >
          ➡
        </button>

      </div>


      {/* ===================================== */}
      {/* ACTIVATE / ASSIGN QR MODAL */}
      {/* ===================================== */}

      {assignQR && (

        <div className="tags_modal_overlay">

          <div className="tags_modal_card">

            {/* CLOSE */}
            <button
              className="tags_modal_close"
              onClick={() => setAssignQR(null)}
            >
              ✕
            </button>

            {/* HEADER */}
            <div className="tags_modal_header text-center">

              <h2 className="tags_modal_title">
                {assignMode.forceActive
                  ? "Asignar y activar QR"
                  : "Asignar QR"}
              </h2>

              <p className="tags_modal_description">
                Configurá la asignación del código QR
              </p>

            </div>

            {/* BODY */}
            <div className="tags_modal_body">

              {/* QR LABEL */}
              <div className="tags_modal_group">

                <label className="tags_modal_label">
                  Etiqueta del QR
                </label>

                <input
                  className="tags_modal_input"
                  placeholder="Ej: Mesa 5, Sucursal Centro"
                  value={assignLabel}
                  onChange={(e) => setAssignLabel(e.target.value)}
                />

              </div>

              {/* CLIENT NAME */}
              <div className="tags_modal_group">

                <label className="tags_modal_label">
                  Nombre del cliente
                </label>

                <input
                  className="tags_modal_input"
                  placeholder="Opcional"
                  value={assignName}
                  onChange={(e) => setAssignName(e.target.value)}
                />

              </div>

              {/* PHONE */}
              <div className="tags_modal_group">

                <label className="tags_modal_label">
                  Teléfono
                </label>

                <input
                  className="tags_modal_input"
                  placeholder="Opcional"
                  value={assignPhone}
                  onChange={(e) => setAssignPhone(e.target.value)}
                />

              </div>

              {/* EMAIL */}
              <div className="tags_modal_group">

                <label className="tags_modal_label">
                  Email
                </label>

                <input
                  className="tags_modal_input"
                  placeholder="cliente@email.com"
                  value={assignEmail}
                  onChange={(e) => setAssignEmail(e.target.value)}
                />

              </div>

              {/* ALERT */}
              {assignMode.forceActive && !assignEmail && (
                <div className="tags_modal_alert">
                  El email es obligatorio para activar
                </div>
              )}

              {/* QR TYPE */}
              {assignMode.forceActive && (
                <div className="tags_modal_badge_container">

                  <span className="tags_modal_badge">
                    {assignQR?.qr_type_code
                      ? assignQR.qr_type_code.charAt(0).toUpperCase() +
                      assignQR.qr_type_code.slice(1)
                      : "-"}
                  </span>

                </div>
              )}

              {/* VALUE */}
              {assignMode.forceActive && (
                <div className="tags_modal_group">

                  <label className="tags_modal_label">
                    Valor del QR
                  </label>

                  <input
                    className="tags_modal_input"
                    placeholder="URL, usuario, teléfono, etc"
                    value={assignValue}
                    onChange={(e) => setAssignValue(e.target.value)}
                  />

                </div>
              )}

            </div>

            {/* ACTIONS */}
            <div className="tags_modal_actions">

              <button
                className="tags_modal_btn tags_modal_btn_success"
                onClick={confirmAssign}
              >
                {assignMode.forceActive
                  ? "⚡ Activar QR"
                  : "📌 Asignar QR"}
              </button>

              <button
                className="tags_modal_btn tags_modal_btn_cancel"
                onClick={() => setAssignQR(null)}
              >
                ✖ Cancelar
              </button>

            </div>

          </div>

        </div>

      )}


      {/* ===================================== */}
      {/* EDIT QR MODAL */}
      {/* ===================================== */}

      {editQR && (

        <div className="tags_modal_overlay">

          <div className="tags_modal_card">

            {/* CLOSE */}
            <button
              className="tags_modal_close"
              onClick={() => setEditQR(null)}
            >
              ✕
            </button>

            {/* HEADER */}
            <div className="tags_modal_header text-center">

              <h2 className="tags_modal_title">
                Editar QR
              </h2>

              <p className="tags_modal_description">
                Modificá la información del QR
              </p>

            </div>

            {/* BODY */}
            <div className="tags_modal_body">

              {/* EMAIL */}
              <div className="tags_modal_group">

                <label className="tags_modal_label">
                  Cliente asignado
                </label>

                <input
                  className="tags_modal_input tags_modal_input_disabled"
                  value={editQR?.email || "- sin cliente -"}
                  disabled
                />

              </div>

              {/* LABEL */}
              <div className="tags_modal_group">

                <label className="tags_modal_label">
                  Etiqueta del QR
                </label>

                <input
                  className="tags_modal_input"
                  placeholder="Ej: Mesa 5"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                />

              </div>

              {/* TYPE */}
              <div className="tags_modal_badge_container">

                <span className="tags_modal_badge">
                  {editQR?.qr_type_code
                    ? editQR.qr_type_code.charAt(0).toUpperCase() +
                    editQR.qr_type_code.slice(1)
                    : "Tipo no definido"}
                </span>

              </div>

              {/* VALUE */}
              <div className="tags_modal_group">

                <label className="tags_modal_label">
                  Valor del QR
                </label>

                <input
                  className="tags_modal_input"
                  placeholder={getValueLabel(editQR?.qr_type_code).place}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                />

              </div>

            </div>

            {/* ACTIONS */}
            <div className="tags_modal_actions">

              <button
                className="tags_modal_btn tags_modal_btn_success"
                onClick={saveEditQR}
              >
                🖫 Guardar cambios
              </button>

              <button
                className="tags_modal_btn tags_modal_btn_cancel"
                onClick={() => setEditQR(null)}
              >
                ✖ Cancelar
              </button>

            </div>

          </div>

        </div>

      )}


      {/* ===================================== */}
      {/* STATS MODAL */}
      {/* ===================================== */}

      {selectedQR && stats && (

        <div
          className="tags_modal_overlay"
          onClick={() => setSelectedQR(null)}
        >

          <div
            className="tags_modal_card tags_modal_large"
            onClick={(e) => e.stopPropagation()}
          >

            {/* CLOSE */}
            <button
              className="tags_modal_close"
              onClick={() => setSelectedQR(null)}
            >
              ✕
            </button>

            {/* HEADER */}
            <div className="tags_modal_header text-center">

              <h2 className="tags_modal_title">
                Estadísticas QR
              </h2>

              <p className="tags_modal_description">
                {selectedQR.label}
              </p>

            </div>

            {/* BODY */}
            <div className="tags_modal_body">

              <div className="tags_chart_container">

                <LineChart
                  width={500}
                  height={250}
                  data={stats.daily}
                >
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line dataKey="clicks" />
                </LineChart>

              </div>

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