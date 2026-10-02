// =====================================
// API: /api/loyalty/admin/accredit
// Descripcion: Acredita puntos, sellos o visitas con ledger atomico.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getLoyaltyAdminScope, loyaltyApiError } from "@/app/modules/loyalty/lib/loyaltyAdminScope";
import { requireActiveLoyaltyAddon } from "@/app/modules/loyalty/lib/loyaltyAccess";
import { ensureAccount, getProgramByBusinessId, getProgramById, getProgramsByBusinessId } from "@/app/modules/loyalty/lib/loyaltyProgramService";
import { createOrGetUser, ensureLoyaltyMember, getMemberByCode, getUserByEmail } from "@/app/modules/loyalty/lib/loyaltyMemberService";
import { postLoyaltyTransaction } from "@/app/modules/loyalty/lib/loyaltyLedgerService";
import { sendBusinessPush } from "@/app/modules/notifications/server/sendBusinessPush";

export async function POST(request) {
    try {
        const body = await request.json().catch(() => null);
        const { businessId, session } = await getLoyaltyAdminScope(body?.business_id);
        await requireActiveLoyaltyAddon(businessId);

        const programs = await getProgramsByBusinessId(businessId);
        if (programs.length > 1 && !Number(body?.program_id)) throw new Error("Seleccioná el programa al que corresponde el movimiento");
        const program = Number(body?.program_id)
            ? await getProgramById(Number(body.program_id), businessId)
            : await getProgramByBusinessId(businessId);
        if (!program) throw new Error("Primero configurá el programa de fidelización");

        let user = null;
        if (body?.member_code) {
            const memberByCode = await getMemberByCode(body.member_code);
            if (memberByCode) user = { id: memberByCode.user_id, email: memberByCode.email, first_name: memberByCode.first_name, last_name: memberByCode.last_name };
        }
        if (!user && body?.email) user = await getUserByEmail(body.email);
        if (!user && body?.first_name && body?.last_name && body?.email) {
            user = await createOrGetUser({
                email: body.email,
                firstName: body.first_name,
                lastName: body.last_name,
                phone: body.phone,
                whatsapp: body.whatsapp,
                source: "loyalty_manual"
            });
        }
        if (!user) throw new Error("Indicá un email de usuario existente o completá nombre y apellido");

        const member = await ensureLoyaltyMember(user.id);
        const account = await ensureAccount(program.id, member.id);
        const transaction = await postLoyaltyTransaction({
            businessId,
            accountId: account.id,
            transactionType: body?.transaction_type,
            pointsDelta: body?.points_delta || 0,
            stampsDelta: body?.stamps_delta || 0,
            visitsDelta: body?.visits_delta || 0,
            amount: body?.amount || null,
            source: body?.source || "manual",
            referenceType: body?.reference_type || null,
            referenceId: body?.reference_id || null,
            description: body?.description || null,
            performedByUserId: session?.userId || null,
            idempotencyKey: body?.idempotency_key || null,
            metadata: body?.metadata || null
        });

        const pointsDelta = Number(body?.points_delta || 0);
        const stampsDelta = Number(body?.stamps_delta || 0);
        const visitsDelta = Number(body?.visits_delta || 0);
        const movementParts = [
            pointsDelta ? `${pointsDelta > 0 ? "+" : ""}${pointsDelta} puntos` : "",
            stampsDelta ? `${stampsDelta > 0 ? "+" : ""}${stampsDelta} sellos` : "",
            visitsDelta ? `${visitsDelta > 0 ? "+" : ""}${visitsDelta} visitas` : ""
        ].filter(Boolean);
        await sendBusinessPush({
            businessId,
            moduleCode: "loyalty",
            eventCode: "movement_confirmed",
            entityType: "loyalty_transaction",
            entityId: transaction?.id || transaction?.insertId || null,
            title: "Movimiento registrado",
            body: `${movementParts.join(", ") || "Se actualizó tu programa"} en ${program.name}.`,
            url: "/mi-cuenta/fidelizacion",
            idempotencyKey: `loyalty:transaction:${transaction?.id || transaction?.insertId || `${account.id}:${Date.now()}`}:guest`,
            audience: "guest",
            recipientId: user.id,
            payload: { programId: program.id, accountId: account.id, transactionId: transaction?.id || transaction?.insertId || null }
        });

        return Response.json({ success: true, member, account, transaction });
    } catch (error) {
        console.error("LOYALTY ACCREDIT ERROR", error);
        return loyaltyApiError(error);
    }
}
