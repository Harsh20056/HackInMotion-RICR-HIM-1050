import { RequestHandler } from "express";
import { verifyAccessToken } from "../lib/jwt.js";
import { AuthError } from "../errors/AppError.js";

/** Verifies the Bearer access token and attaches its claims to req.auth. */
export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new AuthError("Missing bearer token"));
  }

  try {
    req.auth = verifyAccessToken(header.slice("Bearer ".length));
    req.audit.actorId = req.auth.sub;
    next();
  } catch {
    next(new AuthError("Invalid or expired token"));
  }
};

/** Attaches auth claims if present, but does not reject the request without one. */
export const optionalAuthenticate: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      req.auth = verifyAccessToken(header.slice("Bearer ".length));
      req.audit.actorId = req.auth.sub;
    } catch {
      // Ignore invalid tokens on optional routes.
    }
  }
  next();
};
