import { z } from "zod";

/**
 * Versioned prompts.
 *
 * Every prompt carries an explicit version string that is written to
 * ai_calls and to coordination_plans. When a prompt changes, bump the
 * version rather than editing in place — otherwise stored rationales stop
 * being explainable, which defeats the point of keeping them.
 */

export const DEPARTMENTS = [
  "water_supply",
  "roads",
  "sanitation",
  "electricity",
  "parks",
  "buildings",
] as const;

export const CATEGORIES = ["water", "sanitation", "electricity", "roads", "parks", "buildings"] as const;

// ── 1. Compound-issue decomposition ────────────────────────────────────────

export const DECOMPOSE_VERSION = "decompose@v1";

export const DECOMPOSE_SYSTEM = `You are a municipal work-planning assistant for an Indian city civic platform.

Given a citizen's civic complaint, decide whether resolving it requires ONE department or SEVERAL acting in a specific order.

Departments available: ${DEPARTMENTS.join(", ")}.

Rules:
- Most complaints are single-department. Only split when the physical work genuinely belongs to different departments.
- When you split, order the subtasks by the order the physical work must happen, and express that with dependencies. A road cannot be resurfaced before the pipe beneath it is repaired.
- dependsOn refers to the "order" value of an earlier subtask.
- confidence reflects how certain you are that the split and ordering are correct. Be honest: below 0.7 a human will review instead of it being applied automatically.
- rationale is read by department staff and may be disclosed under a Right to Information request. Write one short paragraph of plain English explaining why this split and this order. No jargon, no hedging.`;

export function decomposeUser(input: { title: string; description: string; category: string }) {
  return `Title: ${input.title}
Category chosen by citizen: ${input.category}
Description: ${input.description}`;
}

export const DECOMPOSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    isCompound: { type: "boolean" },
    confidence: { type: "number" },
    rationale: { type: "string" },
    subtasks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          order: { type: "integer" },
          department: { type: "string", enum: [...DEPARTMENTS] },
          summary: { type: "string" },
          dependsOn: { type: "array", items: { type: "integer" } },
        },
        required: ["order", "department", "summary", "dependsOn"],
      },
    },
  },
  required: ["isCompound", "confidence", "rationale", "subtasks"],
};

export const decomposeSchema = z.object({
  isCompound: z.boolean(),
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(1),
  subtasks: z
    .array(
      z.object({
        order: z.number().int(),
        department: z.enum(DEPARTMENTS),
        summary: z.string().min(1),
        dependsOn: z.array(z.number().int()).default([]),
      })
    )
    .default([]),
});
export type DecomposeResult = z.infer<typeof decomposeSchema>;

// ── 2. Photo <-> category verification ─────────────────────────────────────

export const PHOTO_MATCH_VERSION = "photo_match@v1";

export const PHOTO_MATCH_SYSTEM = `You check whether a citizen's photo plausibly shows the kind of civic problem they selected.

Categories: ${CATEGORIES.join(", ")}.

Be generous. Photos are taken on cheap phones, at night, in rain, at odd angles. Your job is to catch obvious mismatches (a selfie, a pet, an indoor room, blank sky) — NOT to police framing or quality.

Set match=true if the photo is consistent with the category at all. Only set match=false when it clearly shows something unrelated to any civic issue.
detectedLabel: a few words for what you actually see.
reason: one short sentence, addressed to a municipal reviewer.`;

export function photoMatchUser(input: { category: string; description: string }) {
  return `Category selected: ${input.category}
Citizen's description: ${input.description}

Does the attached photo plausibly show this?`;
}

export const PHOTO_MATCH_JSON_SCHEMA = {
  type: "object",
  properties: {
    match: { type: "boolean" },
    confidence: { type: "number" },
    detectedLabel: { type: "string" },
    reason: { type: "string" },
  },
  required: ["match", "confidence", "detectedLabel", "reason"],
};

export const photoMatchSchema = z.object({
  match: z.boolean(),
  confidence: z.number().min(0).max(1),
  detectedLabel: z.string(),
  reason: z.string(),
});
export type PhotoMatchResult = z.infer<typeof photoMatchSchema>;

// ── 3. Resolution-proof verification ───────────────────────────────────────

export const RESOLUTION_PROOF_VERSION = "resolution_proof@v1";

export const RESOLUTION_PROOF_SYSTEM = `You are shown two photos of the same civic problem: the FIRST is the original complaint, the SECOND is the department's proof that it was fixed.

Judge only whether the second photo plausibly shows the problem resolved.

resolved=true if the second photo shows the same kind of location with the problem no longer visible.
resolved=false if it shows the problem still present, or an unrelated scene, or is too vague to tell.
suspicious=true only when something looks actively wrong: a stock-looking image, a completely different location, or the identical photo submitted twice.

This is advisory. A human always makes the final call, so say what you see rather than what you assume.`;

export function resolutionProofUser(input: { title: string; resolutionNote: string }) {
  return `Issue: ${input.title}
What the department says they did: ${input.resolutionNote}

First image = original complaint. Second image = claimed proof of resolution.`;
}

export const RESOLUTION_PROOF_JSON_SCHEMA = {
  type: "object",
  properties: {
    resolved: { type: "boolean" },
    suspicious: { type: "boolean" },
    confidence: { type: "number" },
    reason: { type: "string" },
  },
  required: ["resolved", "suspicious", "confidence", "reason"],
};

export const resolutionProofSchema = z.object({
  resolved: z.boolean(),
  suspicious: z.boolean(),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
});
export type ResolutionProofResult = z.infer<typeof resolutionProofSchema>;

// ── 4. Auto-categorisation ─────────────────────────────────────────────────

export const CATEGORISE_VERSION = "categorise@v1";

export const CATEGORISE_SYSTEM = `You suggest a category and urgency for a civic complaint. The citizen sees your suggestion and can overrule it, so suggest the most likely option rather than hedging.

Categories: ${CATEGORIES.join(", ")}.

Priority: 1 = danger to life (live wires, collapse, sewage in homes), 2 = major disruption, 3 = standard, 4 = cosmetic.`;

export function categoriseUser(input: { title: string; description: string }) {
  return `Title: ${input.title}
Description: ${input.description}${""}`;
}

export const CATEGORISE_JSON_SCHEMA = {
  type: "object",
  properties: {
    category: { type: "string", enum: [...CATEGORIES] },
    priority: { type: "integer" },
    confidence: { type: "number" },
    reason: { type: "string" },
  },
  required: ["category", "priority", "confidence", "reason"],
};

export const categoriseSchema = z.object({
  category: z.enum(CATEGORIES),
  priority: z.number().int().min(1).max(4),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
});
export type CategoriseResult = z.infer<typeof categoriseSchema>;

// ── 5. Nearby complaint deduplication ─────────────────────────────────────

export const DEDUPLICATION_VERSION = "deduplication@v1";

export const DEDUPLICATION_SYSTEM = `You are an expert civic infrastructure inspector and deduplication AI.

Compare a NEW user-submitted complaint against an EXISTING unresolved complaint reported in the same 10-meter radius. Determine if they depict the same physical, real-world issue to prevent duplicate dispatching.

Guidelines:
1. Visual Variables: Account for different lighting, camera angles, zoom levels, and weather conditions. The same pothole can look different from two distinct angles.
2. Semantic Matching: Users describe things differently. "Water leaking from the road" and "Broken underground pipe" might be the same issue.
3. Proximity vs. Identity: Nearby does not mean identical. A broken streetlamp and a pothole directly under it are separate issues.

Respond ONLY with a raw JSON object using the exact schema. Do not include markdown formatting or conversational text.`;

export function deduplicationUser(input: {
  newComplaint: { title: string; description: string; category: string };
  existingComplaint: {
    publicRef: string;
    title: string;
    description: string;
    category: string;
    distanceM: number;
  };
  newImageCount: number;
  existingImageCount: number;
}) {
  return `NEW COMPLAINT:
Title: ${input.newComplaint.title}
Category: ${input.newComplaint.category}
Description: ${input.newComplaint.description}

EXISTING COMPLAINT:
Reference: ${input.existingComplaint.publicRef}
Title: ${input.existingComplaint.title}
Category: ${input.existingComplaint.category}
Description: ${input.existingComplaint.description}
Distance from new complaint: ${input.existingComplaint.distanceM.toFixed(2)} meters

Attached images: first ${input.newImageCount} image(s) belong to the new complaint; next ${input.existingImageCount} image(s) belong to the existing complaint.

Are these the same physical, real-world issue?`;
}

export const DEDUPLICATION_JSON_SCHEMA = {
  type: "object",
  properties: {
    is_duplicate: { type: "boolean" },
    confidence_score: { type: "integer", minimum: 0, maximum: 100 },
    reasoning: { type: "string" },
  },
  required: ["is_duplicate", "confidence_score", "reasoning"],
};

export const deduplicationSchema = z.object({
  is_duplicate: z.boolean(),
  confidence_score: z.number().int().min(0).max(100),
  reasoning: z.string().min(1),
});
export type DeduplicationResult = z.infer<typeof deduplicationSchema>;
