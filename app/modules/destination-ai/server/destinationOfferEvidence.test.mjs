import assert from "node:assert/strict";
import { explicitOfferStrength } from "./destinationOfferEvidence.js";

const task = { type: "find_business_category", subject: "pago facil", query: "donde hay un pago facil en los reartes" };

assert.equal(explicitOfferStrength("Comprá fácil, rápido y seguro. Aceptamos distintos medios de pago.", task), 18);
assert.equal(explicitOfferStrength("Contamos con servicio de Pago Fácil y Western Union para abonar facturas.", task), 30);
assert.equal(explicitOfferStrength("Alquiler de cabañas en Los Reartes", task), 0);
assert.equal(explicitOfferStrength("Venta de cigarrillos electrónicos", { type:"find_product",subject:"cigarrillos electronicos" }), 30);

console.log("destinationOfferEvidence: servicios publicados separados de frases comerciales genéricas");
