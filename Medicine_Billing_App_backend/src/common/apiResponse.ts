import { STATUS_CODE } from "./statusCode";

export class ApiResponse<T = any> {
  status: number;
  message: string;
  data?: T | null;
  error?: any;

  constructor(status: number, message: string, data?: T | null, error?: any) {
    this.status = status;
    this.message = message;
    this.data = data;
    this.error = error;
  }

  static success<T = any>(message: string, data?: T) {
    return new ApiResponse<T>(STATUS_CODE.SUCCESS, message, data);
  }

  static created<T = any>(message: string, data?: T) {
    return new ApiResponse<T>(STATUS_CODE.CREATED, message, data);
  }

  private static normalizeError(error?: any) {
    if (!error) return null;
    if (error instanceof Error) {
      const normalized: any = {
        name: error.name,
        message: error.message,
      };
      if (process.env.NODE_ENV !== "production" && error.stack) {
        normalized.stack = error.stack;
      }
      return normalized;
    }
    if (typeof error === "string") {
      return { message: error };
    }
    return error;
  }

  static error(message: string, error?: any, status = STATUS_CODE.INTERNAL_ERROR) {
    const normalizedError = this.normalizeError(error);
    const shouldPromoteErrorMessage =
      message === "Something went wrong. Please try again later!" &&
      normalizedError?.message;
    const finalMessage = shouldPromoteErrorMessage ? normalizedError.message : message;

    return new ApiResponse(status, finalMessage, null, normalizedError);
  }
}
