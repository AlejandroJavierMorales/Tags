// =====================================
// API: /api/loyalty/member/qr
// Descripcion: Emite el QR personal del usuario autenticado.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getSessionUser } from "@/app/modules/users/lib/userSession";
import { ensureLoyaltyMember } from "@/app/modules/loyalty/lib/loyaltyMemberService";

export async function GET() {
    const session = await getSessionUser();
    if (!session) return Response.json({ success: false, error: "No autenticado" }, { status: 401 });

    const member = await ensureLoyaltyMember(session.userId);
    if (!member) return Response.json({ success: false, error: "No se pudo crear el miembro" }, { status: 500 });
    return Response.json({ success: true, memberCode: member.member_code, qrValue: `tags-loyalty:${member.member_code}` });
}
