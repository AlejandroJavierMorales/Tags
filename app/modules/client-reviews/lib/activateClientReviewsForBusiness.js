import { createSlug } from "@/app/modules/qr-page/lib/createSlug";
import { createAppQRCode } from "@/app/modules/qr/lib/createAppQRCode";
import { registerQRAddonUsage } from "@/app/modules/addons/lib/registerQRAddonUsage";

const DEFAULT_QUESTIONS = [
  ["¿Cómo calificás tu experiencia general?", "Tu opinión nos ayuda a mejorar."],
  ["¿Cómo calificás la atención recibida?", "Queremos saber cómo fue el trato."],
  ["¿Cómo calificás la calidad del producto o servicio?", "Contanos si cumplimos tus expectativas."]
];

export async function activateClientReviewsForBusiness({
  conn,
  businessId,
  title,
  slug,
  baseUrl,
  allowTrial = false
}) {
  if (!conn || !businessId) throw new Error("Faltan datos para activar Tags Reviews");

  const [[existing]] = await conn.query(
    `SELECT p.id page_id,p.qr_code_id,p.slug,f.id form_id
       FROM tags_qr_pages p
       LEFT JOIN tags_client_review_forms f ON f.page_id=p.id
      WHERE p.business_id=? AND p.page_type='client_reviews'
      ORDER BY p.id DESC LIMIT 1`,
    [businessId]
  );
  if (existing?.page_id && existing?.qr_code_id && existing?.form_id) {
    const publicUrl = `${String(baseUrl || "").replace(/\/+$/, "")}/p/${existing.slug}`;
    await conn.query("UPDATE tags_qr_pages SET status='published',updated_at=NOW() WHERE id=? AND business_id=? AND page_type='client_reviews'", [existing.page_id, businessId]);
    await conn.query("UPDATE tags_client_review_forms SET status='active',updated_at=NOW() WHERE id=? AND business_id=?", [existing.form_id, businessId]);
    await conn.query("UPDATE tags_qr_codes SET has_qr_page=1,is_active=1,status='active',value=?,final_url=? WHERE id=? AND business_id=?", [publicUrl, publicUrl, existing.qr_code_id, businessId]);
    await registerQRAddonUsage({ conn, qrCodeId: existing.qr_code_id, businessId, addonCode: "client_reviews", sourceTable: "tags_client_review_forms", sourceId: existing.form_id });
    return { ...existing, qrId: existing.qr_code_id, publicUrl, alreadyActive: true };
  }
  if (existing) throw new Error("Tags Reviews existe pero su QR-Page o formulario está incompleto");

  const cleanSlug = createSlug(slug || `opiniones-${businessId}`);
  if (!cleanSlug) throw new Error("No se pudo generar el slug de Tags Reviews");
  const [[collision]] = await conn.query("SELECT id FROM tags_qr_pages WHERE slug=? LIMIT 1", [cleanSlug]);
  const finalSlug = collision ? createSlug(`${cleanSlug}-${businessId}`) : cleanSlug;
  const finalTitle = String(title || "¿Cómo fue tu experiencia?").trim();
  const publicUrl = `${String(baseUrl || "").replace(/\/+$/, "")}/p/${finalSlug}`;

  const qr = await createAppQRCode({
    conn,
    businessId,
    label: finalTitle,
    value: publicUrl,
    finalUrl: publicUrl,
    status: "active",
    allowTrial
  });

  const [pageResult] = await conn.query(
    `INSERT INTO tags_qr_pages
      (business_id,qr_code_id,page_type,schema_type,slug,slug_locked,title,description,status,global_styles,header_config,footer_config,seo_title,seo_description,created_at,updated_at)
     VALUES (?,?,'client_reviews','review_form',?,1,?,?,'published',?,?,?,?,?,NOW(),NOW())`,
    [businessId, qr.id, finalSlug, finalTitle, "Dejanos tu opinión para ayudarnos a mejorar.", JSON.stringify({}), JSON.stringify({}), JSON.stringify({}), finalTitle, "Dejanos tu opinión para ayudarnos a mejorar."]
  );

  const [formResult] = await conn.query(
    `INSERT INTO tags_client_review_forms
      (business_id,qr_code_id,page_id,title,subtitle,positive_threshold,success_title,success_message,google_cta_title,google_cta_text,google_cta_button_label,private_feedback_title,private_feedback_text,styles_json,settings_json,status)
     VALUES (?,?,?,?,?,4,?,?,?,?,?,?,?,?,?,'active')`,
    [businessId, qr.id, pageResult.insertId, finalTitle, "Tu opinión nos ayuda a mejorar nuestro servicio.", "¡Gracias por tu opinión!", "Valoramos mucho que te hayas tomado un momento para responder.", "¿Nos ayudás compartiendo tu experiencia en Google?", "Tu reseña pública ayuda a que más personas nos conozcan.", "Dejar reseña en Google", "Gracias por contarnos cómo podemos mejorar", "Vamos a revisar tu comentario para seguir mejorando.", JSON.stringify({}), JSON.stringify({})]
  );

  for (let index = 0; index < DEFAULT_QUESTIONS.length; index += 1) {
    const [questionText, helperText] = DEFAULT_QUESTIONS[index];
    await conn.query(
      "INSERT INTO tags_client_review_questions (form_id,question_text,helper_text,sort_order) VALUES (?,?,?,?)",
      [formResult.insertId, questionText, helperText, index + 1]
    );
  }

  await registerQRAddonUsage({
    conn,
    qrCodeId: qr.id,
    businessId,
    addonCode: "client_reviews",
    sourceTable: "tags_client_review_forms",
    sourceId: formResult.insertId
  });
  await conn.query("UPDATE tags_qr_codes SET has_qr_page=1 WHERE id=? AND business_id=?", [qr.id, businessId]);

  return { pageId: pageResult.insertId, formId: formResult.insertId, qrId: qr.id, slug: finalSlug, publicUrl, alreadyActive: false };
}
