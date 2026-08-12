import { RequestHandler } from "express";
import { AuthError, ForbiddenError } from "../errors/AppError.js";
import { AccessTokenClaims } from "../lib/jwt.js";

/** Restricts a route to the given roles. Must run after `authenticate`. */
export function requireRole(...roles: AccessTokenClaims["role"][]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) return next(new AuthError());
    if (!roles.includes(req.auth.role)) return next(new ForbiddenError(`Requires role: ${roles.join(", ")}`));
    next();
  };
}

/**
 * Restricts a department-scoped route: super_admin may access any
 * department, dept_admin only their own (matched against req.params[paramName]).
 */
export function requireDepartmentAccess(paramName = "departmentId"): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) return next(new AuthError());
    if (req.auth.role === "super_admin") return next();
    if (req.auth.role === "dept_admin" && req.auth.departmentId === req.params[paramName]) return next();
    next(new ForbiddenError("Not authorized for this department"));
  };
}
