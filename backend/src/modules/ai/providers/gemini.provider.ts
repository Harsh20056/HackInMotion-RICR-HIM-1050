import { GoogleGenAI } from "@google/genai";
import { env } from "../../../config/env.js";
import { AiProvider, CompletionRequest } from "./types.js";

/**
 * Primary provider. A Gemini Flash model handles vision and text and accepts a
 * response schema, so structured output is enforced by the API rather than by
 * hoping the model complies.
 *
 * The exact id comes from GEMINI_MODEL. gemini-2.5-flash, which this project
 * originally targeted, is closed to new API keys, so the default tracks a
 * current Flash release instead.
 */

const MODEL = env.GEMINI_MODEL;

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!client) client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  return client;
}

/** Cloudinary/remote URL -> inline base64, which is what the SDK wants. */
async function fetchImagePart(url: string, signal: AbortSignal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`image fetch ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const mimeType = res.headers.get("content-type") ?? "image/jpeg";
  return { inlineData: { mimeType, data: buf.toString("base64") } };
}

export const geminiProvider: AiProvider = {
  name: "gemini",
  get model() {
    return MODEL;
  },

  isConfigured() {
    return env.GEMINI_API_KEY.length > 0;
  },

  supportsVision() {
    return true;
  },

  async complete(req: CompletionRequest, signal: AbortSignal) {
    const parts: unknown[] = [{ text: req.user }];
    for (const img of req.images ?? []) {
      parts.push(await fetchImagePart(img.url, signal));
    }

    const res = await getClient().models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts }] as never,
      config: {
        systemInstruction: req.system,
        responseMimeType: "application/json",
        responseSchema: req.jsonSchema as never,
        temperature: 0.1,
        abortSignal: signal,
      } as never,
    });

    const usage = (res as { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } })
      .usageMetadata;

    return {
      raw: res.text,
      promptTokens: usage?.promptTokenCount,
      outputTokens: usage?.candidatesTokenCount,
    };
  },
};
