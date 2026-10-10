import crypto from "node:crypto";
import sharp from "sharp";

import { db } from "@/app/lib/tags-db";
import { uploadFile } from "@/app/modules/files/lib/uploadFile";
import { deleteFile } from "@/app/modules/files/lib/deleteFile";
import { hashRegistrationAccessToken } from "@/app/modules/e-events/lib/eventRegistration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SIZE = 8 * 1024 * 1024;

export async function POST(request) {
    const form = await request.formData().catch(() => null);
    const token = String(form?.get("token") || "");
    const file = form?.get("file");
    const reference = String(form?.get("reference") || "").trim().slice(0, 255);
    const notes = String(form?.get("notes") || "").trim().slice(0, 2000);

    if (token.length < 32 || !file || typeof file.arrayBuffer !== "function") {
        return Response.json({ error: "Comprobante requerido" }, { status: 400 });
    }
    if (file.size <= 0 || file.size > MAX_SIZE) {
        return Response.json({ error: "El comprobante debe pesar menos de 8 MB" }, { status: 400 });
    }
    if (!IMAGE_TYPES.has(file.type) && file.type !== "application/pdf") {
        return Response.json({ error: "Usá una imagen JPG, PNG, WebP o un archivo PDF" }, { status: 400 });
    }

    const [[payment]] = await db.query(
        `SELECT pay.id,pay.status,pay.event_id,pay.proof_storage_path
           FROM tags_event_registrations r
           INNER JOIN tags_event_registration_payments pay ON pay.registration_id=r.id
          WHERE r.access_token_hash=? AND pay.provider='manual'
          LIMIT 1`,
        [hashRegistrationAccessToken(token)]
    );
    if (!payment) return Response.json({ error: "Pago no encontrado" }, { status: 404 });
    if (!["pending", "rejected", "submitted"].includes(payment.status)) {
        return Response.json({ error: "Este pago ya no admite comprobantes" }, { status: 409 });
    }

    try {
        const source = Buffer.from(await file.arrayBuffer());
        let output = source;
        let mimeType = file.type;
        let extension = "pdf";
        if (IMAGE_TYPES.has(file.type)) {
            output = await sharp(source)
                .rotate()
                .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
                .webp({ quality: 80, effort: 5 })
                .toBuffer();
            mimeType = "image/webp";
            extension = "webp";
        }

        const storagePath = `events/${payment.event_id}/payment-proofs/${payment.id}-${crypto.randomUUID()}.${extension}`;
        const uploaded = await uploadFile({ buffer: output, storagePath, mimeType });
        const [updateResult] = await db.query(
            `UPDATE tags_event_registration_payments
                SET status='submitted',proof_url=?,proof_storage_path=?,proof_mime_type=?,proof_size_bytes=?,
                    payer_reference=?,attendee_notes=?,submitted_at=NOW(),review_notes=NULL,updated_at=NOW()
              WHERE id=? AND status IN ('pending','rejected','submitted')`,
            [uploaded.url, uploaded.storagePath, mimeType, output.length, reference || null, notes || null, payment.id]
        );
        if (!updateResult.affectedRows) {
            await deleteFile(uploaded.storagePath);
            return Response.json({ error: "El pago cambió de estado y ya no admite comprobantes" }, { status: 409 });
        }
        if (payment.proof_storage_path && payment.proof_storage_path !== uploaded.storagePath) {
            await deleteFile(payment.proof_storage_path).catch(() => false);
        }
        return Response.json({ ok: true, status: "submitted", proofUrl: uploaded.url });
    } catch (error) {
        console.error("EVENT PAYMENT PROOF UPLOAD ERROR", error);
        return Response.json({ error: "No se pudo guardar el comprobante" }, { status: 500 });
    }
}
