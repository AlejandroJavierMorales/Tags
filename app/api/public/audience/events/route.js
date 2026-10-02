import { recordAudienceEvent } from "@/app/modules/audience/server/audienceEventService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) return Response.json({ ok: false, error: "Datos inválidos" }, { status: 400 });
    const result = await recordAudienceEvent(request, body);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    if (error?.code !== "ER_NO_SUCH_TABLE") console.error("AUDIENCE EVENT ERROR", error);
    return Response.json({ ok: false, recorded: false }, { status: 202 });
  }
}
