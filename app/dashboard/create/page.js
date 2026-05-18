"use client";

import { useEffect, useState } from "react";
import "../../styles/tagsModals.css";
import TagsHeader from "../../components/Header";
import showAlert from "@/app/components/showAlert";

export default function CreateQR() {

  const [businesses, setBusinesses] = useState([]);
  const [types, setTypes] = useState([]);
  const [products, setProducts] = useState([]);

  const [businessId, setBusinessId] = useState("");
  const [qrTypeId, setQrTypeId] = useState("");
  const [productId, setProductId] = useState("");

  const [selectedProduct, setSelectedProduct] = useState(null);

  const [quantity, setQuantity] = useState(1);

  const [createdCodes, setCreatedCodes] = useState([]);

  const isDigital =  Number(selectedProduct?.is_digital) === 1;

  // -----------------------------
  // LOAD BUSINESSES
  // -----------------------------
  useEffect(() => {

    fetch("/api/business/list")
      .then(r => r.json())
      .then(setBusinesses)
      .catch(() => setBusinesses([]));

  }, []);

  // -----------------------------
  // LOAD QR TYPES
  // -----------------------------
  useEffect(() => {

    fetch("/api/qr/types")
      .then(r => r.json())
      .then(data => setTypes(data.data || []))
      .catch(() => setTypes([]));

  }, []);

  // -----------------------------
  // LOAD PRODUCTS
  // -----------------------------
  useEffect(() => {

    fetch("/api/products")
      .then(r => r.json())
      .then(data => {

        setProducts(
          Array.isArray(data)
            ? data
            : data.products || data.data || []
        );

      })
      .catch(() => setProducts([]));

  }, []);

  // -----------------------------
  // CREATE QR
  // -----------------------------
  async function createNewQR() {

    // =========================
    // VALIDATE PRODUCT
    // =========================
    if (!productId) {

      await showAlert({
        title: "Error",
        text: "Seleccioná un producto",
        icon: "error"
      });

      return;
    }

    // =========================
    // VALIDATE QTY
    // =========================
    if (quantity < 1 || quantity > 100) {

      await showAlert({
        title: "Error",
        text: "Cantidad inválida (1 a 100)",
        icon: "error"
      });

      return;
    }

    // =========================
    // DIGITAL NEEDS CLIENT
    // =========================
    /* if (isDigital && !businessId) {

      await showAlert({
        title: "Error",
        text: "Seleccioná un cliente",
        icon: "error"
      });

      return;
    } */

    try {

      const res = await fetch("/api/qr/create", {

        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({

          business_id:
            businessId
              ? Number(businessId)
              : null,

          qr_type_id:
            qrTypeId
              ? Number(qrTypeId)
              : null,

          product_id:
            productId
              ? Number(productId)
              : null,

          quantity:
            Number(quantity)
        })
      });

      const data = await res.json();

      // =========================
      // ERROR
      // =========================
      if (!res.ok) {

        await showAlert({
          title: "Error",
          text: data.error || "Error creando QRs",
          icon: "error"
        });

        return;
      }

      // =========================
      // SUCCESS
      // =========================
      await showAlert({
        title: "OK",
        text: "QRs creados correctamente",
        icon: "success"
      });

      setCreatedCodes(data.codes || []);

      // RESET
      setQuantity(1);
      setBusinessId("");

    } catch (err) {

      console.error(err);

      await showAlert({
        title: "Error",
        text: "Error interno",
        icon: "error"
      });
    }
  }

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div
      className="container-fluid tags_container m-0 p-0"
      style={{ minHeight: "100vh" }}
    >

      <TagsHeader />

      <div className="tags_container d-flex flex-column justify-content-center align-items-center">

        {/* HEADER */}
        <div className="tags_header d-flex flex-column">

          <h1>
            Crear QRs
          </h1>

          <p>
            Generá códigos y gestioná producción
          </p>

        </div>

        {/* FORM */}
        <div
          className="tags_card_form"
          style={{ maxWidth: "450px" }}
        >

          {/* PRODUCT */}
          <div className="tags_form_group">

            <label className="tags_form_label">
              Producto
            </label>

            <select
              className="tags_input"
              value={productId}
              onChange={(e) => {

                const id = e.target.value;

                setProductId(id);

                const product =
                  products.find(
                    p => String(p.id) === id
                  );

                setSelectedProduct(product || null);
              }}
            >

              <option value="">
                Seleccionar producto
              </option>

              {products.map((p) => (

                <option
                  key={p.id}
                  value={p.id}
                >
                  {p.name}
                </option>

              ))}

            </select>

            {/* TYPE */}
            {productId && (

              <p className="tags_text_normal">
                Tipo: <b>{isDigital ? "Digital" : "Físico"}</b>
              </p>

            )}

            {/* PHYSICAL */}
            {productId && !isDigital && (

              <p className="tags_text_normal">

                Los QRs físicos se crearán en estado{" "}
                <b>generated</b> hasta completar
                una orden de producción.

              </p>

            )}

            {/* DIGITAL */}
            {productId && isDigital && (

              <p className="tags_text_normal">

                Los QRs digitales quedarán
                disponibles inmediatamente.

              </p>

            )}

          </div>

          {/* QUANTITY */}
          <div className="tags_form_group">

            <label className="tags_form_label">
              Cantidad
            </label>

            <input
              className="tags_input"
              type="number"
              min={1}
              max={100}
              value={quantity}
              onChange={(e) =>
                setQuantity(e.target.value)
              }
            />

          </div>

          {/* BUSINESS DIGITAL ONLY */}
          {isDigital && (

            <div className="tags_form_group">

              <label className="tags_form_label">
                Cliente
              </label>

              <select
                className="tags_input"
                value={businessId}
                onChange={(e) =>
                  setBusinessId(e.target.value)
                }
              >

                <option value="">
                  Seleccionar cliente
                </option>

                {businesses.map((b) => (

                  <option
                    key={b.id}
                    value={b.id}
                  >
                    {b.name}
                  </option>

                ))}

              </select>

            </div>
          )}

          {/* BUTTON */}
          <button
            className="tags_btn"
            onClick={createNewQR}
          >
            ✚ Crear QRs
          </button>

        </div>

        {/* RESULT */}
        {createdCodes.length > 0 && (

          <div className="tags_result_card">

            <h3>
              QRs creados
            </h3>

            <div className="tags_codes_list">

              {createdCodes.map((c, i) => (

                <div
                  key={i}
                  className="tags_code_item"
                >
                  {c}
                </div>

              ))}

            </div>

          </div>
        )}

      </div>
    </div>
  );
}