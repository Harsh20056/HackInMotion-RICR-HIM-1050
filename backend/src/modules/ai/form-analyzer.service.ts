import { logger } from "../../shared/lib/logger.js";
import { complete, visionEnabled } from "./providers/index.js";
import {
  FORM_ANALYZER_SYSTEM,
  FORM_ANALYZER_JSON_SCHEMA,
  FORM_ANALYZER_VERSION,
  formAnalyzerUser,
  formAnalyzerSchema,
  FormAnalyzerResult,
  SUPPORTED_FORMS,
} from "./prompts/index.js";

/**
 * Government Form Analyzer service.
 *
 * Accepts a base64-encoded image (or the first page of a PDF already rasterised
 * by the frontend) and uses Gemini Vision in a single pass to:
 *   1. Classify whether the image is a supported Indian government form.
 *   2. If yes, generate comprehensive filling guidance from the embedded KB.
 *
 * Returns a FormAnalyzerResult that matches the frontend's FormAnalysisResult type.
 * Vision is Gemini-only — Groq has no multimodal capability, so if only Groq is
 * configured this returns a clear "vision unavailable" error rather than silently
 * degrading.
 */
export const formAnalyzerService = {
  async analyze(opts: {
    base64: string;
    mimeType: string;
    userQuery?: string;
    language?: string;
  }): Promise<FormAnalyzerResult> {
    if (!visionEnabled()) {
      logger.warn("Form analyzer called but no vision provider is configured");
      return {
        status: "rejected",
        confidence: 0,
        reason:
          "Form analysis requires Gemini Vision, which is not configured on this server. " +
          "Please set a valid GEMINI_API_KEY in the backend environment.",
      };
    }

    const { base64, mimeType, userQuery, language } = opts;

    try {
      const { data } = await complete(
        {
          kind: "form_analyzer",
          promptVersion: FORM_ANALYZER_VERSION,
          system: FORM_ANALYZER_SYSTEM,
          user: formAnalyzerUser({ userQuery, language }),
          // Inline base64 image — Gemini SDK accepts { inlineData: { mimeType, data } }
          // We pass it via the images array using the data: URI convention so the
          // gemini provider's fetchImagePart() can handle it generically.
          images: [{ url: `data:${mimeType};base64,${base64}` }],
          jsonSchema: FORM_ANALYZER_JSON_SCHEMA,
        },
        formAnalyzerSchema
      );

      // Attach the canonical form name from our registry if the model returned
      // a known form code but skipped the name field.
      if (data.status === "success" && data.form_code && !data.form_name) {
        data.form_name = SUPPORTED_FORMS[data.form_code] ?? data.form_code;
      }

      return data;
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      logger.warn({ err: errMsg }, "Form analyzer call failed");

      const isHighDemand = errMsg.includes("503") || errMsg.includes("high demand") || errMsg.includes("UNAVAILABLE");
      const isRateLimit = errMsg.includes("429") || errMsg.includes("quota");

      let reason = "The AI service encountered an issue while processing this form. Please try again in a few seconds.";
      if (isHighDemand) {
        reason = "The AI vision model is temporarily experiencing high traffic. Please retry in a few moments.";
      } else if (isRateLimit) {
        reason = "API rate limit reached. Please wait a moment and try again.";
      }

      return {
        status: "error",
        confidence: 0,
        reason,
      };
    }
  },
};
