import { Prisma } from "@prisma/client";
import { prisma } from "../../shared/lib/prisma.js";
import { ListIssuesQuery } from "./issues.schemas.js";

// Shape returned by the raw spatial queries below — mirrors the frontend's
// existing IssueResponse contract (category as a display string, not an id).
export interface IssueRow {
  id: string;
  public_ref: string;
  title: string;
  description: string;
  category_code: string;
  category_name_en: string;
  status: string;
  latitude: number;
  longitude: number;
  address: string | null;
  priority: number;
  reported_by: string;
  supports_count: number;
  created_at: Date;
  acknowledged_at: Date | null;
  resolved_at: Date | null;
  closed_at: Date | null;
}

const ISSUE_SELECT = Prisma.sql`
  SELECT
    i.id, i.public_ref, i.title, i.description, i.status, i.address, i.priority,
    i.reported_by, i.supports_count, i.created_at, i.acknowledged_at, i.resolved_at, i.closed_at,
    ST_Y(i.location::geometry) AS latitude,
    ST_X(i.location::geometry) AS longitude,
    c.code AS category_code,
    c.name_en AS category_name_en
  FROM issues i
  JOIN issue_categories c ON c.id = i.category_id
`;

export const issuesRepository = {
  async findDedupCandidate(params: {
    categoryId: string;
    latitude: number;
    longitude: number;
    radiusM: number;
    windowHours: number;
  }): Promise<{ id: string; title: string; publicRef: string; distanceM: number } | null> {
    const rows = await prisma.$queryRaw<{ id: string; title: string; public_ref: string; distance_m: number }[]>(
      Prisma.sql`
        SELECT id, title, public_ref,
               ST_Distance(location, ST_SetSRID(ST_MakePoint(${params.longitude}, ${params.latitude}), 4326)::geography) AS distance_m
        FROM issues
        WHERE category_id = ${params.categoryId}::uuid
          AND status NOT IN ('resolved', 'rejected', 'closed')
          AND created_at >= NOW() - (${params.windowHours} || ' hours')::interval
          AND ST_DWithin(
                location,
                ST_SetSRID(ST_MakePoint(${params.longitude}, ${params.latitude}), 4326)::geography,
                ${params.radiusM}
              )
        ORDER BY distance_m ASC
        LIMIT 1
      `
    );

    if (rows.length === 0) return null;
    const row = rows[0];
    return { id: row.id, title: row.title, publicRef: row.public_ref, distanceM: Number(row.distance_m) };
  },

  /** Inserts the issues row (raw SQL — Prisma can't write an Unsupported geography column). */
  async insertIssue(
    tx: Prisma.TransactionClient,
    data: {
      publicRef: string;
      title: string;
      description: string;
      categoryId: string;
      priority: number;
      reportedBy: string;
      latitude: number;
      longitude: number;
      address: string | null;
    }
  ): Promise<{ id: string; createdAt: Date }> {
    const rows = await tx.$queryRaw<{ id: string; created_at: Date }[]>(
      Prisma.sql`
        INSERT INTO issues (public_ref, title, description, category_id, priority, reported_by, address, location)
        VALUES (
          ${data.publicRef}, ${data.title}, ${data.description}, ${data.categoryId}::uuid, ${data.priority},
          ${data.reportedBy}::uuid, ${data.address},
          ST_SetSRID(ST_MakePoint(${data.longitude}, ${data.latitude}), 4326)::geography
        )
        RETURNING id, created_at
      `
    );
    return { id: rows[0].id, createdAt: rows[0].created_at };
  },

  async findById(id: string): Promise<IssueRow | null> {
    const rows = await prisma.$queryRaw<IssueRow[]>(Prisma.sql`${ISSUE_SELECT} WHERE i.id = ${id}::uuid`);
    return rows[0] ?? null;
  },

  async list(filters: ListIssuesQuery): Promise<{ rows: IssueRow[]; total: number }> {
    const conditions: Prisma.Sql[] = [];

    if (filters.categoryCode) conditions.push(Prisma.sql`c.code = ${filters.categoryCode}`);
    if (filters.status) conditions.push(Prisma.sql`i.status = ${filters.status}::"IssueStatus"`);
    if (filters.reportedBy) conditions.push(Prisma.sql`i.reported_by = ${filters.reportedBy}::uuid`);
    if (filters.supportedBy) {
      conditions.push(
        Prisma.sql`EXISTS (SELECT 1 FROM issue_supports s WHERE s.issue_id = i.id AND s.user_id = ${filters.supportedBy}::uuid)`
      );
    }
    if (filters.departmentId) {
      conditions.push(
        Prisma.sql`EXISTS (SELECT 1 FROM work_orders wo WHERE wo.issue_id = i.id AND wo.department_id = ${filters.departmentId}::uuid)`
      );
    }
    if (filters.bbox) {
      const [minLng, minLat, maxLng, maxLat] = filters.bbox;
      conditions.push(
        Prisma.sql`i.location && ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326)::geography`
      );
    }

    const whereClause = conditions.length > 0 ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}` : Prisma.sql``;
    const offset = (filters.page - 1) * filters.pageSize;

    const rows = await prisma.$queryRaw<IssueRow[]>(Prisma.sql`
      ${ISSUE_SELECT}
      ${whereClause}
      ORDER BY i.created_at DESC
      LIMIT ${filters.pageSize} OFFSET ${offset}
    `);

    const countRows = await prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      FROM issues i
      JOIN issue_categories c ON c.id = i.category_id
      ${whereClause}
    `);

    return { rows, total: Number(countRows[0]?.count ?? 0) };
  },
};
