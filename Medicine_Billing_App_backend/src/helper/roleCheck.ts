import {Request, Response, NextFunction } from "express";
import { ApiResponse, StatusCode } from "../common";
import { responseMessage } from "./response";

export const roleCheck = (allowedRoles: string[]) => {
  return (req: any, res: Response, next: NextFunction) => {
    try {
      // Check if user exists
      if (!req.user) {
        return res
          .status(StatusCode.UNAUTHORIZED)
          .json(
            ApiResponse.error(
              responseMessage.accessDenied,
              null,
              StatusCode.UNAUTHORIZED
            )
          );
      }

      // Check if role allowed
      if (!allowedRoles.includes(req.user.role)) {
        return res
          .status(StatusCode.FORBIDDEN)
          .json(
            ApiResponse.error(
              responseMessage.accessDenied,
              null,
              StatusCode.FORBIDDEN
            )
          );
      }

      next();
    } catch (error) {
      return res.status(StatusCode.INTERNAL_ERROR).json({
        ...ApiResponse.error(responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR),
      });
    }
  };
};
