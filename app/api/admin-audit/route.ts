import { NextRequest, NextResponse } from "next/server";
import { requireWebRole } from "../../../lib/route-auth";
import { listAdminAuditLogs } from "../../../lib/admin-audit";

export async function GET(request: NextRequest) {
  const auth = await requireWebRole(request, ["admin"]);
  if (auth.response) {
    return auth.response;
  }

  const q = request.nextUrl.searchParams.get("q") ?? undefined;
  const action = request.nextUrl.searchParams.get("action") ?? undefined;
  const entityType = request.nextUrl.searchParams.get("entityType") ?? undefined;
  const actorIdParam = request.nextUrl.searchParams.get("actorId");
  const actorId = actorIdParam ? Number(actorIdParam) : undefined;
  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "20");

  const result = await listAdminAuditLogs({
    q,
    action,
    entityType,
    actorId: Number.isFinite(actorId) ? actorId : undefined,
    page,
    limit,
  });

  return NextResponse.json(result);
}
