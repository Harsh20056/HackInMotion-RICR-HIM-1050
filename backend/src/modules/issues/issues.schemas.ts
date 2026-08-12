import { z } from "zod";

export const createIssueSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(1).max(5000),
  categoryCode: z.string().min(1),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  address: z.string().max(500).optional(),
  // Set once the citizen has already seen a duplicateCandidate and
  // explicitly said "this is a different issue" — skips the dedup check.
  force: z.boolean().optional().default(false),
});
export type CreateIssueInput = z.infer<typeof createIssueSchema>;

export const listIssuesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  categoryCode: z.string().optional(),
  status: z.enum(["reported", "acknowledged", "in_progress", "resolved", "rejected", "closed"]).optional(),
  departmentId: z.string().uuid().optional(),
  reportedBy: z.string().uuid().optional(),
  // bbox = minLng,minLat,maxLng,maxLat
  bbox: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(",").map(Number) : undefined))
    .refine((v) => !v || (v.length === 4 && v.every((n) => Number.isFinite(n))), "bbox must be minLng,minLat,maxLng,maxLat"),
});
export type ListIssuesQuery = z.infer<typeof listIssuesQuerySchema>;

export const confirmDuplicateSchema = z.object({
  duplicateOfId: z.string().uuid(),
  description: z.string().min(1).max(5000),
});
export type ConfirmDuplicateInput = z.infer<typeof confirmDuplicateSchema>;
