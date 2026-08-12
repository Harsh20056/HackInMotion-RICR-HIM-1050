import { Prisma } from "@prisma/client";
import { prisma } from "../../shared/lib/prisma.js";

/**
 * Server-side analytics (PS #7). Every number here is computed in SQL from
 * real rows — nothing is estimated, seeded or filled in client-side.
 *
 * Resolution durations come from the append-only issue_status_history
 * (created -> first "resolved" entry), NOT from updated_at, which any later
 * edit would corrupt.
 */

const RESOLUTION_DURATIONS = Prisma.sql`
  SELECT
    i.id,
    i.category_id,
    EXTRACT(EPOCH FROM (h.first_resolved_at - i.created_at)) AS seconds
  FROM issues i
  JOIN (
    SELECT issue_id, MIN(created_at) AS first_resolved_at
    FROM issue_status_history
    WHERE to_status = 'resolved'
    GROUP BY issue_id
  ) h ON h.issue_id = i.id
`;

function toNumber(v: unknown): number {
  if (v === null || v === undefined) return 0;
  return typeof v === "bigint" ? Number(v) : Number(v);
}

/** Seconds -> hours, one decimal. Null when there's nothing to average. */
function toHours(seconds: unknown): number | null {
  if (seconds === null || seconds === undefined) return null;
  const n = Number(seconds);
  if (!Number.isFinite(n)) return null;
  return Math.round((n / 3600) * 10) / 10;
}

export const analyticsService = {
  async overview() {
    const [statusRows, categoryRows, totals, durations] = await Promise.all([
      prisma.$queryRaw<{ status: string; count: bigint }[]>(
        Prisma.sql`SELECT status::text AS status, COUNT(*)::bigint AS count FROM issues GROUP BY status ORDER BY count DESC`
      ),
      prisma.$queryRaw<{ code: string; name_en: string; count: bigint }[]>(
        Prisma.sql`
          SELECT c.code, c.name_en, COUNT(i.id)::bigint AS count
          FROM issue_categories c
          LEFT JOIN issues i ON i.category_id = c.id
          GROUP BY c.code, c.name_en
          ORDER BY count DESC
        `
      ),
      prisma.$queryRaw<{ total: bigint; geotagged: bigint; this_week: bigint; reopened: bigint }[]>(
        Prisma.sql`
          SELECT
            COUNT(*)::bigint AS total,
            COUNT(*) FILTER (WHERE location IS NOT NULL)::bigint AS geotagged,
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::bigint AS this_week,
            COUNT(*) FILTER (WHERE reopen_count > 0)::bigint AS reopened
          FROM issues
        `
      ),
      prisma.$queryRaw<{ avg_seconds: number | null; p90_seconds: number | null; resolved_count: bigint }[]>(
        Prisma.sql`
          SELECT
            AVG(seconds) AS avg_seconds,
            PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY seconds) AS p90_seconds,
            COUNT(*)::bigint AS resolved_count
          FROM (${RESOLUTION_DURATIONS}) d
        `
      ),
    ]);

    const t = totals[0];
    const d = durations[0];

    return {
      totals: {
        issues: toNumber(t?.total),
        geoTagged: toNumber(t?.geotagged),
        reportedThisWeek: toNumber(t?.this_week),
        reopened: toNumber(t?.reopened),
        resolved: toNumber(d?.resolved_count),
      },
      byStatus: statusRows.map((r) => ({ status: r.status, count: toNumber(r.count) })),
      byCategory: categoryRows.map((r) => ({ code: r.code, nameEn: r.name_en, count: toNumber(r.count) })),
      resolutionTime: {
        avgHours: toHours(d?.avg_seconds),
        p90Hours: toHours(d?.p90_seconds),
      },
    };
  },

  async departments() {
    const rows = await prisma.$queryRaw<
      {
        id: string;
        code: string;
        name_en: string;
        total: bigint;
        open: bigint;
        resolved: bigint;
        avg_seconds: number | null;
        p90_seconds: number | null;
      }[]
    >(Prisma.sql`
      WITH durations AS (${RESOLUTION_DURATIONS})
      SELECT
        d.id, d.code, d.name_en,
        COUNT(DISTINCT wo.issue_id)::bigint AS total,
        COUNT(DISTINCT wo.issue_id) FILTER (
          WHERE i.status NOT IN ('resolved','verified','closed','rejected')
        )::bigint AS open,
        COUNT(DISTINCT wo.issue_id) FILTER (
          WHERE i.status IN ('resolved','verified','closed')
        )::bigint AS resolved,
        AVG(dur.seconds) AS avg_seconds,
        PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY dur.seconds) AS p90_seconds
      FROM departments d
      LEFT JOIN work_orders wo ON wo.department_id = d.id AND wo.role = 'primary'
      LEFT JOIN issues i ON i.id = wo.issue_id
      LEFT JOIN durations dur ON dur.id = i.id
      WHERE d.active = true
      GROUP BY d.id, d.code, d.name_en
      ORDER BY total DESC
    `);

    return {
      items: rows.map((r) => {
        const total = toNumber(r.total);
        const resolved = toNumber(r.resolved);
        return {
          departmentId: r.id,
          code: r.code,
          nameEn: r.name_en,
          totalIssues: total,
          openIssues: toNumber(r.open),
          resolvedIssues: resolved,
          resolutionRate: total === 0 ? 0 : Math.round((resolved / total) * 100),
          avgResolutionHours: toHours(r.avg_seconds),
          p90ResolutionHours: toHours(r.p90_seconds),
        };
      }),
    };
  },

  /**
   * Geographic hotspots via a PostGIS grid. Issues are snapped to a
   * ~precision-degree grid and counted; cells with a single report are
   * dropped so the map shows genuine clusters rather than every pin.
   */
  async hotspots(params: { precision?: number; minCount?: number } = {}) {
    const precision = params.precision ?? 0.02; // ≈2 km at the equator
    const minCount = params.minCount ?? 2;

    const rows = await prisma.$queryRaw<
      { cell_lat: number; cell_lng: number; count: bigint; top_category: string | null; open_count: bigint }[]
    >(Prisma.sql`
      SELECT
        ROUND((ST_Y(location::geometry) / ${precision})::numeric) * ${precision} AS cell_lat,
        ROUND((ST_X(location::geometry) / ${precision})::numeric) * ${precision} AS cell_lng,
        COUNT(*)::bigint AS count,
        COUNT(*) FILTER (WHERE i.status NOT IN ('resolved','verified','closed','rejected'))::bigint AS open_count,
        MODE() WITHIN GROUP (ORDER BY c.name_en) AS top_category
      FROM issues i
      JOIN issue_categories c ON c.id = i.category_id
      GROUP BY cell_lat, cell_lng
      HAVING COUNT(*) >= ${minCount}
      ORDER BY count DESC
      LIMIT 50
    `);

    return {
      precision,
      items: rows.map((r) => ({
        latitude: Number(r.cell_lat),
        longitude: Number(r.cell_lng),
        count: toNumber(r.count),
        openCount: toNumber(r.open_count),
        topCategory: r.top_category,
      })),
    };
  },

  /** Monthly report + resolution counts for the trailing N months. */
  async trends(months = 6) {
    const rows = await prisma.$queryRaw<{ month: Date; reported: bigint; resolved: bigint }[]>(Prisma.sql`
      WITH span AS (
        SELECT generate_series(
          DATE_TRUNC('month', NOW()) - (${months - 1} || ' months')::interval,
          DATE_TRUNC('month', NOW()),
          '1 month'
        ) AS month
      ),
      -- Aggregate each series independently; joining the raw rows together
      -- would multiply them into a cartesian product per month.
      reported_by_month AS (
        SELECT DATE_TRUNC('month', created_at) AS month, COUNT(*)::bigint AS n
        FROM issues GROUP BY 1
      ),
      resolved_by_month AS (
        SELECT DATE_TRUNC('month', resolved_at) AS month, COUNT(*)::bigint AS n
        FROM (
          SELECT issue_id, MIN(created_at) AS resolved_at
          FROM issue_status_history WHERE to_status = 'resolved' GROUP BY issue_id
        ) f
        GROUP BY 1
      )
      SELECT
        s.month,
        COALESCE(rep.n, 0)::bigint AS reported,
        COALESCE(res.n, 0)::bigint AS resolved
      FROM span s
      LEFT JOIN reported_by_month rep ON rep.month = s.month
      LEFT JOIN resolved_by_month res ON res.month = s.month
      ORDER BY s.month ASC
    `);

    return {
      items: rows.map((r) => ({
        month: r.month.toISOString().slice(0, 7),
        reported: toNumber(r.reported),
        resolved: toNumber(r.resolved),
      })),
    };
  },
};
