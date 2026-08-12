import { prisma } from "../../shared/lib/prisma.js";
import { eventBus } from "../../shared/lib/eventBus.js";
import { issuesRepository, IssueRow } from "./issues.repository.js";
import { generatePublicRef } from "../../shared/lib/publicRef.js";
import { NotFoundError, ValidationError, ConflictError } from "../../shared/errors/AppError.js";
import { CreateIssueInput, ListIssuesQuery, ConfirmDuplicateInput } from "./issues.schemas.js";

function toApiIssue(row: IssueRow) {
  return {
    id: row.id,
    publicRef: row.public_ref,
    title: row.title,
    description: row.description,
    category: { code: row.category_code, nameEn: row.category_name_en },
    status: row.status,
    latitude: row.latitude,
    longitude: row.longitude,
    address: row.address,
    priority: row.priority,
    reportedBy: row.reported_by,
    supportsCount: row.supports_count,
    resolutionNote: row.resolution_note,
    createdAt: row.created_at,
    acknowledgedAt: row.acknowledged_at,
    resolvedAt: row.resolved_at,
    verifiedAt: row.verified_at,
    closedAt: row.closed_at,
  };
}

export const issuesService = {
  async list(filters: ListIssuesQuery) {
    const { rows, total } = await issuesRepository.list(filters);
    return {
      items: rows.map(toApiIssue),
      page: filters.page,
      pageSize: filters.pageSize,
      total,
    };
  },

  async getById(id: string) {
    const row = await issuesRepository.findById(id);
    if (!row) throw new NotFoundError("Issue not found");
    const [media, workOrders] = await Promise.all([
      prisma.issueMedia.findMany({ where: { issueId: id } }),
      prisma.workOrder.findMany({ where: { issueId: id } }),
    ]);
    return {
      ...toApiIssue(row),
      media: media.map((m) => ({ id: m.id, kind: m.kind, url: m.url })),
      workOrders: workOrders.map((wo) => ({ id: wo.id, departmentId: wo.departmentId, role: wo.role, status: wo.status })),
    };
  },

  /**
   * The core reporting pipeline:
   *  1. resolve category (FK lookup by code)
   *  2. PostGIS dedup check within the category's radius + time window
   *  3. if a candidate exists, return it for citizen confirmation — no insert
   *  4. otherwise, create the issue + primary report + work orders (from
   *     category_department_rules, data-driven, no if/else chains) +
   *     the initial status_history entry, all in one transaction
   */
  async create(input: CreateIssueInput, reporterId: string) {
    const category = await prisma.issueCategory.findUnique({ where: { code: input.categoryCode } });
    if (!category || !category.active) throw new ValidationError(`Unknown category: ${input.categoryCode}`);

    if (!input.force) {
      const dedupCandidate = await issuesRepository.findDedupCandidate({
        categoryId: category.id,
        latitude: input.latitude,
        longitude: input.longitude,
        radiusM: category.dedupRadiusM,
        windowHours: category.dedupWindowHours,
      });

      if (dedupCandidate) {
        return { duplicateCandidate: dedupCandidate };
      }
    }

    const rules = await prisma.categoryDepartmentRule.findMany({
      where: { categoryId: category.id },
      orderBy: { priority: "asc" },
    });
    if (rules.length === 0) {
      throw new ValidationError(`No routing rules configured for category: ${input.categoryCode}`);
    }

    const issue = await prisma.$transaction(async (tx) => {
      const inserted = await issuesRepository.insertIssue(tx, {
        publicRef: generatePublicRef(),
        title: input.title,
        description: input.description,
        categoryId: category.id,
        priority: category.defaultPriority,
        reportedBy: reporterId,
        latitude: input.latitude,
        longitude: input.longitude,
        address: input.address ?? null,
      });

      await tx.issueReport.create({
        data: { issueId: inserted.id, reporterId, description: input.description, isPrimary: true },
      });

      // Data-driven routing: one work order per matching department rule.
      await tx.workOrder.createMany({
        data: rules.map((rule, idx) => ({
          issueId: inserted.id,
          departmentId: rule.departmentId,
          role: rule.role,
          priority: rule.priority,
          sequence: idx,
        })),
      });

      await tx.issueStatusHistory.create({
        data: {
          issueId: inserted.id,
          fromStatus: null,
          toStatus: "reported",
          actorId: reporterId,
          actorRole: "citizen",
          reason: "Issue reported",
        },
      });

      return inserted;
    });

    const row = await issuesRepository.findById(issue.id);
    const apiIssue = toApiIssue(row!);

    eventBus.emitIssueEvent({
      type: "issue.created",
      issueId: issue.id,
      departmentIds: rules.map((r) => r.departmentId),
      payload: { issue: apiIssue },
      at: new Date().toISOString(),
    });

    return { issue: apiIssue };
  },

  /** Citizen confirms an existing issue matches theirs — adds a corroborating report, no new issue. */
  async confirmDuplicate(input: ConfirmDuplicateInput, reporterId: string) {
    const existing = await issuesRepository.findById(input.duplicateOfId);
    if (!existing) throw new NotFoundError("Issue not found");

    await prisma.$transaction([
      prisma.issueReport.create({
        data: { issueId: existing.id, reporterId, description: input.description, isPrimary: false },
      }),
      prisma.issue.update({ where: { id: existing.id }, data: { supportsCount: { increment: 1 } } }),
    ]);

    const row = await issuesRepository.findById(existing.id);
    return toApiIssue(row!);
  },

  async support(issueId: string, userId: string) {
    const issue = await prisma.issue.findUnique({ where: { id: issueId } });
    if (!issue) throw new NotFoundError("Issue not found");

    const existing = await prisma.issueSupport.findUnique({
      where: { issueId_userId: { issueId, userId } },
    });
    if (existing) throw new ConflictError("Already supported");

    await prisma.$transaction([
      prisma.issueSupport.create({ data: { issueId, userId } }),
      prisma.issue.update({ where: { id: issueId }, data: { supportsCount: { increment: 1 } } }),
    ]);

    const row = await issuesRepository.findById(issueId);
    return toApiIssue(row!);
  },

  async unsupport(issueId: string, userId: string): Promise<void> {
    const existing = await prisma.issueSupport.findUnique({
      where: { issueId_userId: { issueId, userId } },
    });
    if (!existing) throw new NotFoundError("Support not found");

    await prisma.$transaction([
      prisma.issueSupport.delete({ where: { id: existing.id } }),
      prisma.issue.update({ where: { id: issueId }, data: { supportsCount: { decrement: 1 } } }),
    ]);
  },

  async listSupportedByUser(userId: string) {
    return this.list({ page: 1, pageSize: 100, supportedBy: userId });
  },
};
