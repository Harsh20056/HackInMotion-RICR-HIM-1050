import { AccessTokenClaims } from "../shared/lib/jwt.js";

declare global {
  namespace Express {
    interface Request {
      auth?: AccessTokenClaims;
      audit: {
        actorId: string | null;
        ipHash: string | null;
      };
    }
  }
}

export {};
