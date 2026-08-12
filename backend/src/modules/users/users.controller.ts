import { Router } from "express";
import { issuesService } from "../issues/issues.service.js";
import { authenticate } from "../../shared/middleware/authenticate.js";

export const usersRouter = Router();

usersRouter.get("/me/supports", authenticate, async (req, res, next) => {
  try {
    res.json(await issuesService.listSupportedByUser(req.auth!.sub));
  } catch (err) {
    next(err);
  }
});
