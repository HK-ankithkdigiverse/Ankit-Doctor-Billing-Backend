import { STATUS_CODE } from "./statusCode";

const normalizeError = (error: unknown) => {
  if (!error) return null;
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }
  if (typeof error === "object") {
    return error;
  }
  return { message: String(error) };
};

export class ApiResponse<T = any> {
  status: number;
  message: string;
  data?: T | null;
  error?: unknown;

  constructor(status: number, message: string, data?: T | null, error?: unknown) {
    this.status = status;
    this.message = message;
    this.data = data;
    this.error = normalizeError(error);
  }

  static success<T = any>(message: string, data?: T) {
    return new ApiResponse<T>(STATUS_CODE.SUCCESS, message, data);
  }

  static created<T = any>(message: string, data?: T) {
    return new ApiResponse<T>(STATUS_CODE.CREATED, message, data);
  }

  static error(message: string, error?: unknown, status = STATUS_CODE.INTERNAL_ERROR) {
    return new ApiResponse(status, message, null, error);
  }
}
