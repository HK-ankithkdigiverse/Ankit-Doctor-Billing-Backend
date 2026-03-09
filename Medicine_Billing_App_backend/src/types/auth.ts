import { ROLE } from "../common";

export interface AdminCreateUserBody {
  name: string;
  email: string;
  phoneNumber?: string;
  password: string;
  signature?: string;
  role?: ROLE;
  isActive?: boolean;
  // admin users do not need a medical store assigned, so this field is optional
  medicalStoreId?: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface VerifyOtpBody {
  email: string;
  otp: string;
}

export interface ChangePasswordBody {
  oldPassword: string;
  newPassword: string;
}

export interface ForgotPasswordBody {
  email: string;
}

export interface ResetPasswordBody {
  email: string;
  otp: string;
  newPassword: string;
}
