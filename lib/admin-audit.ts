import { ResultSetHeader, RowDataPacket } from "mysql2";
import pool from "./db";

export type AdminAuditItem = {
  id: number;
  actorId: number | null;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  entityLabel: string;
  description: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type AdminAuditListResult = {
  items: AdminAuditItem[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
};

type AuditRow = RowDataPacket & {
  id: number;
  actor_id: number | null;
  actor_name: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  entity_label: string | null;
  description: string | null;
  metadata: string | null;
  created_at: Date | string;
};

let auditReady = false;

async function ensureAuditTable() {
  if (auditReady) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      actor_id INT NULL,
      actor_name VARCHAR(120) NULL,
      actor_role VARCHAR(50) NULL,
      action VARCHAR(80) NOT NULL,
      entity_type VARCHAR(80) NOT NULL,
      entity_id VARCHAR(80) NOT NULL,
      entity_label VARCHAR(180) NULL,
      description TEXT NULL,
      metadata LONGTEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  auditReady = true;
}

function toIsoString(value: Date | string | null | undefined) {
  return value ? new Date(value).toISOString() : new Date().toISOString();
}

function normalizePagination(input?: { page?: number; limit?: number }) {
  const page = Math.max(1, Number(input?.page ?? 1) || 1);
  const limit = Math.min(100, Math.max(1, Number(input?.limit ?? 20) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function mapAuditRow(row: AuditRow): AdminAuditItem {
  return {
    id: row.id,
    actorId: row.actor_id == null ? null : Number(row.actor_id),
    actorName: row.actor_name ?? "Sistem",
    actorRole: row.actor_role ?? "system",
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    entityLabel: row.entity_label ?? "-",
    description: row.description ?? "",
    metadata: row.metadata ? (JSON.parse(row.metadata) as Record<string, unknown>) : null,
    createdAt: toIsoString(row.created_at),
  };
}

export async function writeAdminAuditLog(input: {
  actorId?: number | null;
  actorName?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId: string | number;
  entityLabel?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  await ensureAuditTable();

  await pool.query(
    `
      INSERT INTO admin_audit_logs
      (actor_id, actor_name, actor_role, action, entity_type, entity_id, entity_label, description, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      input.actorId ?? null,
      input.actorName ?? null,
      input.actorRole ?? null,
      input.action,
      input.entityType,
      String(input.entityId),
      input.entityLabel ?? null,
      input.description ?? null,
      input.metadata ? JSON.stringify(input.metadata) : null,
    ]
  );
}

export async function listAdminAuditLogs(filters?: {
  q?: string;
  action?: string;
  entityType?: string;
  actorId?: number;
  page?: number;
  limit?: number;
}) {
  await ensureAuditTable();
  const { page, limit, offset } = normalizePagination(filters);
  const conditions: string[] = [];
  const params: Array<string | number> = [];

  if (filters?.q?.trim()) {
    const keyword = `%${filters.q.trim()}%`;
    conditions.push("(actor_name LIKE ? OR entity_label LIKE ? OR description LIKE ?)");
    params.push(keyword, keyword, keyword);
  }

  if (filters?.action) {
    conditions.push("action = ?");
    params.push(filters.action);
  }

  if (filters?.entityType) {
    conditions.push("entity_type = ?");
    params.push(filters.entityType);
  }

  if (filters?.actorId) {
    conditions.push("actor_id = ?");
    params.push(filters.actorId);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS count FROM admin_audit_logs ${whereClause}`,
    params
  );
  const [rows] = await pool.query<AuditRow[]>(
    `
      SELECT
        id,
        actor_id,
        actor_name,
        actor_role,
        action,
        entity_type,
        entity_id,
        entity_label,
        description,
        metadata,
        created_at
      FROM admin_audit_logs
      ${whereClause}
      ORDER BY created_at DESC, id DESC
      LIMIT ? OFFSET ?
    `,
    [...params, limit, offset]
  );

  return {
    items: rows.map(mapAuditRow),
    meta: {
      page,
      limit,
      totalItems: Number(countRows[0]?.count ?? 0),
      totalPages: Math.max(1, Math.ceil(Number(countRows[0]?.count ?? 0) / limit)),
    },
  } satisfies AdminAuditListResult;
}
