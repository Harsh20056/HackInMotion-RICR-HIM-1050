import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_ACCESS_SECRET: z.string().min(1, "JWT_ACCESS_SECRET is required"),
  JWT_REFRESH_SECRET: z.string().min(1, "JWT_REFRESH_SECRET is required"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("30d"),
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(""),
  CLOUDINARY_API_KEY: z.string().optional().default(""),
  CLOUDINARY_API_SECRET: z.string().optional().default(""),
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CORS_ORIGIN: z.string().default("http://localhost:8080"),
  // Email delivery. Absent key => email notifications are marked failed
  // with a stated reason rather than silently dropped.
  RESEND_API_KEY: z.string().optional().default(""),
  NOTIFICATION_FROM_EMAIL: z.string().default("Samadhan <onboarding@resend.dev>"),
  // Seeded/dev users live on @samadhan.gov.in, a domain we don't own — Resend
  // will reject sends to it. In non-production, set this to a real address
  // you've verified with Resend and every outbound email redirects there.
  DEV_EMAIL_OVERRIDE: z.string().optional().default(""),
  // Escape hatch for running the API without background workers.
  DISABLE_JOBS: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration");
}

export const env = parsed.data;
