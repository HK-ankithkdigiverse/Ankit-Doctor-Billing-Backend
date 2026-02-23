import { Request, Response, NextFunction } from "express";
import { ApiResponse, StatusCode } from "../common";
import { responseMessage } from "../helper";

export const allowRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res
        .status(StatusCode.FORBIDDEN)
        .json(ApiResponse.error(responseMessage.accessDenied, null, StatusCode.FORBIDDEN));
    }
    next();
  };
};
