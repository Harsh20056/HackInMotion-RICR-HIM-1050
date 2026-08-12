import { RequestHandler } from "express";
import { ZodSchema } from "zod";

type ValidateTarget = "body" | "query" | "params";

/** Parses+replaces req[target] with the Zod-validated value, or calls next(err). */
export function validate(schema: ZodSchema, target: ValidateTarget = "body"): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      return next(result.error);
    }
    req[target] = result.data;
    next();
  };
}
