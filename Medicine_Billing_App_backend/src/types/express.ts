import { AuthJwtPayload } from "./jwt";

declare global {
  namespace Express {
    interface Request {
      user?: AuthJwtPayload;
    }
  }
}

export {};
