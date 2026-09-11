export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getSessionUser } from "@/app/modules/users/lib/userSession";
import { ensureLoyaltyMember } from "@/app/modules/loyalty/lib/loyaltyMemberService";
import { ensureAccount } from "@/app/modules/loyalty/lib/loyaltyProgramService";
import { getPublicLoyaltyProgram } from "@/app/modules/loyalty/lib/loyaltyPublicService";

function programIdFrom(request) {
    return Number(new URL(request.url).searchParams.get("program_id"));
}

async function getMembership(programId, userId) {
    const [rows] = await db.query(
        `SELECT a.id AS account_id,a.points_balance,a.stamps_balance,a.visits_balance,a.created_at,
                lm.member_code
           FROM tags_loyalty_members lm
           INNER JOIN tags_loyalty_accounts a ON a.member_id=lm.id AND a.program_id=? AND a.status='active'
          WHERE lm.user_id=? AND lm.status='active'
          LIMIT 1`,
        [programId, userId]
    );
    return rows[0] || null;
}

export async function GET(request) {
    try {
        const programId = programIdFrom(request);
        if (!programId) return Response.json({ success: false, error: "Programa inválido" }, { status: 400 });
        const program = await getPublicLoyaltyProgram(programId);
        if (!program) return Response.json({ success: false, error: "Programa no disponible" }, { status: 404 });
        const session = await getSessionUser();
        const account = session ? await getMembership(programId, session.userId) : null;
        let movements = [];
        if (account) {
            const [rows] = await db.query(
                `SELECT id,transaction_type,points_delta,stamps_delta,visits_delta,
                        points_balance_after,stamps_balance_after,visits_balance_after,
                        description,created_at
                   FROM tags_loyalty_transactions
                  WHERE account_id=? ORDER BY created_at DESC,id DESC LIMIT 50`,
                [account.account_id]
            );
            movements = rows;
        }
        return Response.json({ success: true, program, authenticated: Boolean(session), joined: Boolean(account), account, movements });
    } catch (error) {
        console.error("LOYALTY PUBLIC PROGRAM GET ERROR", error);
        return Response.json({ success: false, error: "No se pudo cargar el programa" }, { status: 500 });
    }
}

export async function POST(request) {
    const session = await getSessionUser();
    if (!session) return Response.json({ success: false, error: "No autenticado" }, { status: 401 });
    let connection;
    try {
        const body = await request.json().catch(() => ({}));
        const programId = Number(body.program_id);
        if (!programId) return Response.json({ success: false, error: "Programa inválido" }, { status: 400 });
        connection = await db.getConnection();
        await connection.beginTransaction();
        const program = await getPublicLoyaltyProgram(programId, connection);
        if (!program) throw new Error("El programa no está disponible");
        const member = await ensureLoyaltyMember(session.userId, connection);
        const account = await ensureAccount(program.id, member.id, connection);
        if (program.directory_site_id) {
            await connection.query(
                `INSERT INTO tags_user_directory_memberships (user_id,directory_site_id,status)
                 VALUES (?,?,'active')
                 ON DUPLICATE KEY UPDATE status='active',updated_at=NOW()`,
                [session.userId, program.directory_site_id]
            );
        }
        await connection.commit();
        return Response.json({ success: true, joined: true, account });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("LOYALTY PUBLIC PROGRAM JOIN ERROR", error);
        return Response.json({ success: false, error: error.message || "No se pudo realizar la adhesión" }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}
