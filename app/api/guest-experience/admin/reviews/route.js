export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getGuestAdminAccess, guestAdminAccessResponse } from "@/app/modules/guest-experience/lib/getGuestAdminAccess";
import { guestError } from "@/app/modules/guest-experience/lib/guestExperienceService";

export async function GET(req) {
    try {
        const query = new URL(req.url).searchParams;
        const businessId = Number(query.get("businessId") || 0);
        const guestAppId = Number(query.get("guestAppId") || 0);
        const page = Math.max(1, Number(query.get("page") || 1));
        const responseId = Number(query.get("responseId") || 0);
        const period = ["7", "30", "90", "365"].includes(query.get("period")) ? query.get("period") : "all";
        const rating = ["1", "2", "3", "4", "5"].includes(query.get("rating")) ? query.get("rating") : "all";
        const sort = query.get("sort") === "oldest" ? "oldest" : "recent";
        const access = await getGuestAdminAccess({ businessId, guestAppId });
        if (!access.allowed) return guestAdminAccessResponse(access);

        const [forms] = await db.query(`
            SELECT f.id form_id, f.title, f.positive_threshold, f.google_review_url,
                   p.id page_id, p.slug page_slug
            FROM tags_client_review_forms f
            INNER JOIN tags_qr_pages p ON p.id=f.page_id AND p.business_id=?
            WHERE f.business_id=? AND f.status='active' AND p.page_type='client_reviews'
            ORDER BY f.id DESC LIMIT 1
        `, [businessId, businessId]);
        const form = forms[0];
        if (!form) return guestError("Tags Reviews no está configurado para este negocio", 404);

        const [questions] = await db.query(`
            SELECT id, question_text, helper_text, is_required, sort_order
            FROM tags_client_review_questions
            WHERE form_id=? AND is_visible=1
            ORDER BY sort_order ASC, id ASC
        `, [form.form_id]);

        if (responseId) {
            const [responses] = await db.query(`
                SELECT id, customer_name, customer_email, customer_phone, average_rating,
                       general_comment, status, verified_purchase, is_public, created_at
                FROM tags_client_review_responses
                WHERE id=? AND business_id=? AND form_id=? LIMIT 1
            `, [responseId, businessId, form.form_id]);
            if (!responses[0]) return guestError("Reseña no encontrada", 404);
            const [answers] = await db.query(`
                SELECT a.id, a.rating, a.comment, q.question_text
                FROM tags_client_review_answers a
                LEFT JOIN tags_client_review_questions q ON q.id=a.question_id
                WHERE a.response_id=? ORDER BY q.sort_order ASC, a.id ASC
            `, [responseId]);
            return Response.json({ ok: true, form, questions, response: responses[0], answers });
        }

        const limit = 20;
        const offset = (page - 1) * limit;
        const conditions = ["business_id=?", "form_id=?"];
        const filterParams = [businessId, form.form_id];
        if (period !== "all") conditions.push(`created_at >= DATE_SUB(NOW(), INTERVAL ${period} DAY)`);
        if (rating !== "all") { conditions.push("ROUND(average_rating)=?"); filterParams.push(Number(rating)); }
        const whereSQL = `WHERE ${conditions.join(" AND ")}`;
        const orderSQL = sort === "oldest" ? "created_at ASC, id ASC" : "created_at DESC, id DESC";
        const [[count]] = await db.query(`
            SELECT COUNT(*) total, COALESCE(AVG(average_rating),0) average_rating
            FROM tags_client_review_responses
            ${whereSQL}
        `, filterParams);
        const [responses] = await db.query(`
            SELECT id, customer_name, customer_email, customer_phone, average_rating,
                   general_comment, status, verified_purchase, is_public, created_at
            FROM tags_client_review_responses
            ${whereSQL}
            ORDER BY ${orderSQL}
            LIMIT ? OFFSET ?
        `, [...filterParams, limit, offset]);
        return Response.json({ ok: true, form, questions, responses, total: Number(count.total || 0), summary: { total: Number(count.total || 0), average: Number(count.average_rating || 0) }, page, pages: Math.ceil(Number(count.total || 0) / limit) });
    } catch (error) {
        console.error("GUEST ADMIN REVIEWS ERROR", error);
        return guestError("No se pudieron cargar las reseñas", 500);
    }
}
