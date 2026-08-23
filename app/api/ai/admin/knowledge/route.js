import { db } from "@/app/lib/tags-db";
import { getAiChatAdminAccess, aiChatAdminError } from "@/app/modules/ai-chat/server/getAiChatAdminAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function businessIdFrom(source) { return Number(source?.businessId || source?.business_id || 0); }
function slugify(value) { return String(value || "documento").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "").slice(0, 180) || "documento"; }

async function accessFor(businessId) {
    if (!businessId) return { allowed: false, status: 400, error: "Cliente inválido" };
    return getAiChatAdminAccess(businessId);
}

export async function GET(request) {
    const businessId = businessIdFrom(Object.fromEntries(new URL(request.url).searchParams));
    const access = await accessFor(businessId);
    if (!access.allowed) return aiChatAdminError(access);
    const [rows] = await db.query("SELECT id,title,slug,topics,content,is_active,sort_order,created_at,updated_at FROM tags_ai_chatbot_knowledge WHERE business_id=? ORDER BY sort_order,id", [businessId]);
    return Response.json({ ok: true, documents: rows });
}

export async function POST(request) {
    const body = await request.json().catch(() => null);
    const businessId = businessIdFrom(body);
    const access = await accessFor(businessId);
    if (!access.allowed) return aiChatAdminError(access);
    const title = String(body?.title || "").trim().slice(0, 180);
    const content = String(body?.content || "").trim();
    if (!title || !content) return Response.json({ ok: false, error: "Completá el título y el contenido" }, { status: 400 });
    const slug = slugify(body?.slug || title);
    const topics = String(body?.topics || "").trim().slice(0, 500) || null;
    const isActive = body?.is_active === false ? 0 : 1;
    const sortOrder = Number.isFinite(Number(body?.sort_order)) ? Number(body.sort_order) : 0;
    const id = Number(body?.id || 0);
    if (id) {
        await db.query("UPDATE tags_ai_chatbot_knowledge SET title=?,slug=?,topics=?,content=?,is_active=?,sort_order=?,updated_at=NOW() WHERE id=? AND business_id=?", [title, slug, topics, content, isActive, sortOrder, id, businessId]);
        const [rows] = await db.query("SELECT id,title,slug,topics,content,is_active,sort_order FROM tags_ai_chatbot_knowledge WHERE id=? AND business_id=? LIMIT 1", [id, businessId]);
        return Response.json({ ok: true, document: rows[0] });
    }
    await db.query(
        `INSERT INTO tags_ai_chatbot_knowledge (business_id,title,slug,topics,content,is_active,sort_order)
         VALUES (?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE title=VALUES(title),topics=VALUES(topics),content=VALUES(content),is_active=VALUES(is_active),sort_order=VALUES(sort_order),updated_at=NOW()`,
        [businessId, title, slug, topics, content, isActive, sortOrder]
    );
    const [rows] = await db.query("SELECT id,title,slug,topics,content,is_active,sort_order FROM tags_ai_chatbot_knowledge WHERE business_id=? AND slug=? LIMIT 1", [businessId, slug]);
    return Response.json({ ok: true, document: rows[0] });
}

export async function DELETE(request) {
    const body = await request.json().catch(() => null);
    const businessId = businessIdFrom(body);
    const access = await accessFor(businessId);
    if (!access.allowed) return aiChatAdminError(access);
    const id = Number(body?.id || 0);
    if (!id) return Response.json({ ok: false, error: "Documento inválido" }, { status: 400 });
    await db.query("DELETE FROM tags_ai_chatbot_knowledge WHERE id=? AND business_id=?", [id, businessId]);
    return Response.json({ ok: true });
}
