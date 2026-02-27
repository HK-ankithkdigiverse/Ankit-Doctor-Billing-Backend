import { Response } from "express";
import { ApiResponse, StatusCode } from "../common";

export const sendSuccess = <T = unknown>(
  res: Response,
  message: string,
  data?: T,
) => {
  return res.status(StatusCode.OK).json(ApiResponse.success(message, data));
};

export const sendCreated = <T = unknown>(
  res: Response,
  message: string,
  data?: T,
) => {
  return res.status(StatusCode.CREATED).json(ApiResponse.created(message, data));
};

export const sendError = (
  res: Response,
  message: string,
  error?: unknown,
  status: number = StatusCode.INTERNAL_ERROR,
) => {
  return res.status(status).json(ApiResponse.error(message, error, status));
};

export const sendNotFound = (res: Response, message: string) => {
  return sendError(res, message, null, StatusCode.NOT_FOUND);
};

export const sendUnauthorized = (res: Response, message: string) => {
  return sendError(res, message, null, StatusCode.UNAUTHORIZED);
};
