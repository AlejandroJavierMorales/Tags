import assert from "node:assert/strict";
import { collectBusinessPublicKnowledge } from "./collectBusinessPublicKnowledge.js";

const connection = {
  async query(sql) {
    if (sql.includes("FROM tags_qr_pages")) return [[{
      page_id: 9, page_type: "directory", page_title: "Litoral Mix", page_description: "Maxi kiosco y almacén",
      section_id: 42, section_title: "Servicio de Pago Fácil y Western Union", block_id: 74,
      block_type: "web_section", content_json: JSON.stringify({ title: "Pago Fácil", paragraphs: ["Aboná facturas y enviá o recibí dinero en Los Reartes"], image: "https://example.com/no-indexar.webp" }),
    }]];
    if (sql.includes("FROM tags_stores")) return [[{
      store_id: 3, app_type: "resto", store_name: "Litoral Mix", section_id: 8,
      section_title: "Nuestro menú", block_id: 81, block_title: "Comidas", block_type: "text",
      content_json: JSON.stringify({ description: "Sándwiches y bebidas" }),
    }]];
    if (sql.includes("FROM tags_directory_benefits")) return [[{
      id: 4, name: "Promo regionales", benefit_type: "percentage", benefit_value: 10,
      valid_from: "2026-10-01", valid_until: "2026-10-31", description: "Descuento en productos regionales",
    }]];
    if (sql.includes("FROM tags_loyalty_programs")) return [[{
      id: 5, name: "Clientes frecuentes", description: "Sumá puntos con cada compra", mechanic: "points",
    }]];
    if (sql.includes("FROM tags_loyalty_rewards")) return [[{
      id: 6, program_id: 5, name: "Bebida gratis", description: "Canje con puntos", reward_type: "free_product", required_points: 100,
    }]];
    if (sql.includes("FROM tags_ai_chatbot_knowledge")) return [[]];
    if (sql.includes("FROM tags_ai_business_profile_entries")) return [[]];
    throw new Error(`Consulta inesperada: ${sql}`);
  },
};

const result = await collectBusinessPublicKnowledge(connection, { businessId: 5, siteId: 1 });
assert.match(result.text, /Pago Fácil/);
assert.match(result.text, /Aboná facturas/);
assert.match(result.text, /Sándwiches y bebidas/);
assert.match(result.text, /Promo regionales/);
assert.match(result.text, /Clientes frecuentes/);
assert.match(result.text, /Bebida gratis/);
assert.doesNotMatch(result.text, /no-indexar\.webp/);
assert.deepEqual(new Set(result.sourceTypes), new Set(["qr_page_block", "resto_block", "directory_benefit", "loyalty_program", "loyalty_reward"]));

console.log("collectBusinessPublicKnowledge: fuentes públicas unificadas verificadas");
