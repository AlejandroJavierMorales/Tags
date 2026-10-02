import { getSessionBusiness } from "@/app/lib/getSessionBusiness";
import { searchConsoleAuthorizationUrl } from "@/app/modules/audience/server/searchConsoleApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSessionBusiness();
  if (session?.role !== "admin") return Response.json({ error: "No autorizado" }, { status: 403 });
  return Response.redirect(searchConsoleAuthorizationUrl());
}
