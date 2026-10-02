import assert from "node:assert/strict";
import { normalizeArgentinaWhatsapp } from "./normalizeContactFields.js";

assert.equal(normalizeArgentinaWhatsapp("3546 40-1234"), "5493546401234");
assert.equal(normalizeArgentinaWhatsapp("+54 9 3546 40-1234"), "5493546401234");
assert.equal(normalizeArgentinaWhatsapp("5493546401234"), "5493546401234");
assert.equal(normalizeArgentinaWhatsapp("03546 15 40-1234"), "5493546401234");
assert.equal(normalizeArgentinaWhatsapp("35465450036"), "54935465450036");
assert.equal(normalizeArgentinaWhatsapp("40-1234"), "");

console.log("normalizeContactFields: formatos habituales de WhatsApp verificados");
