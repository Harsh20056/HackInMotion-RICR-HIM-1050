import { BACKEND_PENDING_MESSAGE_EN } from "@/shared/mock/mockAiAdapter";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export const aiService = {
  /**
   * TEMPORARY — backend pending (Phase 2). The Samadhan AI civic assistant
   * requires a backend chat endpoint that hasn't been rebuilt yet, so this
   * reports an explicit unavailable state instead of pretending to work.
   */
  async streamChat({
    messages: _messages,
    onDelta: _onDelta,
    onDone: _onDone,
    onError,
  }: {
    messages: ChatMessage[];
    onDelta: (deltaText: string) => void;
    onDone: () => void;
    onError: (error: string) => void;
  }): Promise<void> {
    onError(BACKEND_PENDING_MESSAGE_EN);
  },

  /**
   * TEMPORARY — backend pending (Phase 2). Delegates to the standalone
   * analyzeFormDirect(), which reports a backend-pending status.
   */
  async analyzeFormDirect(
    file: File,
    userQuery?: string
  ): Promise<FormAnalysisResult> {
    return analyzeFormDirect(file, userQuery);
  }
};

export interface FormAnalysisResult {
  status: "success" | "rejected" | "low_confidence" | "unsupported_form" | "error";
  form_code?: string;
  form_name?: string;
  confidence?: number;
  chunks_used?: number;
  reason?: string;
  guidance?: {
    summary: string;
    scheme_benefit: string;
    eligibility: string[];
    required_documents: Array<{ name: string; details: string }>;
    filling_steps: Array<{ step: number; field: string; instruction: string; example: string | null }>;
    submission: {
      where: string;
      online_portal: string | null;
      deadline: string | null;
      fee: string;
    };
    important_notes: string[];
    custom_query_answer?: string | null;
    sources: Array<{
      chunk_title: string;
      chunk_type: string;
      similarity: number;
      form_name: string;
      version: string;
      source_url: string;
      last_verified: string;
    }>;
  };
}

export async function analyzeFormDirect(
  file: File,
  _userQuery?: string
): Promise<FormAnalysisResult> {
  // Validate file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("File size must be under 10MB");
  }

  const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Only PDF, JPEG, PNG, or WebP files are accepted");
  }

  // TEMPORARY — backend pending (Phase 2): the form-analyzer RAG backend
  // hasn't been rebuilt yet, so report an explicit unavailable state
  // instead of calling out to a network endpoint that doesn't exist.
  return {
    status: "error",
    reason: BACKEND_PENDING_MESSAGE_EN,
  };
}

/**
 * Renders the first page of a PDF file to a JPEG image using PDF.js.
 * NVIDIA NIM vision models accept images (JPEG/PNG/WebP) but NOT raw PDFs.
 * We rasterise at 2x scale (144 DPI) for sharp, readable form text.
 */
export async function pdfFirstPageToJpeg(
  file: File
): Promise<{ base64: string; mimeType: string }> {
  // Dynamic import keeps pdfjs out of the initial bundle
  const pdfjsLib = await import("pdfjs-dist");

  // Point the worker at the bundled worker script
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);

  // Scale 2x so form text stays legible for the VLM
  const viewport = page.getViewport({ scale: 2.0 });

  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d")!;

  await page.render({ canvas, canvasContext: ctx, viewport }).promise;

  // Export as JPEG (quality 0.92) — strips alpha, smaller payload
  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  const base64 = dataUrl.split(",")[1];
  return { base64, mimeType: "image/jpeg" };
}

