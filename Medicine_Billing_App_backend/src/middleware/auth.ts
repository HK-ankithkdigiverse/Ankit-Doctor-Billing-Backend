import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { ApiResponse, StatusCode, ROLE } from "../common";
import { responseMessage } from "../helper";
import User from "../database/models/auth";

export interface AuthRequest extends Request {
  user?: {
    _id: string;
    role: string;
    // admins may not have a store
    medicalStoreId?: string;
  };
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(StatusCode.UNAUTHORIZED)
      .json(ApiResponse.error(responseMessage.accessDenied, null, StatusCode.UNAUTHORIZED));
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_TOKEN_SECRET as string
    ) as {
      _id: string;
      role?: string;
      medicalStoreId?: string;
    };

    const currentUser = await User.findById(decoded._id)
      .select("_id role medicalStoreId isActive isDeleted")
      .lean();

    if (!currentUser || currentUser.isDeleted) {
      return res
        .status(StatusCode.UNAUTHORIZED)
        .json(ApiResponse.error(responseMessage.invalidToken, null, StatusCode.UNAUTHORIZED));
    }

    if (currentUser.isActive === false) {
      return res
        .status(StatusCode.FORBIDDEN)
        .json(ApiResponse.error(responseMessage.accountInactive, null, StatusCode.FORBIDDEN));
    }

    const effectiveMedicalStoreId = currentUser.medicalStoreId
      ? String(currentUser.medicalStoreId)
      : "";

    if (currentUser.role !== ROLE.ADMIN && !effectiveMedicalStoreId) {
      return res
        .status(StatusCode.FORBIDDEN)
        .json(ApiResponse.error(responseMessage.medicalIdNotAssigned, null, StatusCode.FORBIDDEN));
    }

    req.user = {
      _id: currentUser._id.toString(),
      role: currentUser.role,
      medicalStoreId: effectiveMedicalStoreId || undefined,
    };

    return next();
  } catch {
    return res
      .status(StatusCode.UNAUTHORIZED)
      .json(ApiResponse.error(responseMessage.invalidToken, null, StatusCode.UNAUTHORIZED));
  }
};
