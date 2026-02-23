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

  static error(message: string, error?: any, status = STATUS_CODE.INTERNAL_ERROR) {
    return new ApiResponse(status, message, null, error);
  }
}

