import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { ApiResponse, StatusCode } from "../common";
import { responseMessage } from "../helper";

export interface AuthRequest extends Request {
  user?: {
    _id: string;
    role: string;
  };
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const jwtSecret = process.env.JWT_TOKEN_SECRET;
  if (!jwtSecret) {
    return res
      .status(StatusCode.INTERNAL_ERROR)
      .json(ApiResponse.error("JWT secret is missing", null, StatusCode.INTERNAL_ERROR));
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(StatusCode.UNAUTHORIZED)
      .json(ApiResponse.error(responseMessage.accessDenied, null, StatusCode.UNAUTHORIZED));
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res
      .status(StatusCode.UNAUTHORIZED)
      .json(ApiResponse.error(responseMessage.invalidToken, null, StatusCode.UNAUTHORIZED));
  }

  try {
    const decoded = jwt.verify(
      token,
      jwtSecret
    ) as {
      _id: string;
      role: string;
    };

    req.user = {
      _id: decoded._id,
      role: decoded.role,
    };

    next();
  } catch {
    return res
      .status(StatusCode.UNAUTHORIZED)
      .json(ApiResponse.error(responseMessage.invalidToken, null, StatusCode.UNAUTHORIZED));
  }
};
