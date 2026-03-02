import { ROLE } from "../common";

export type MedicineIdMode = "CREATE_NEW" | "ASSIGN_EXISTING";

export interface AdminCreateUserBody {
  name: string;
  medicalName: string;
  email: string;
  password: string;
  signature?: string;
  phone?: string;
  address: string;
  state: string;
  city: string;
  pincode: string;
  gstNumber: string;
  panCardNumber: string;
  role?: ROLE;
  isActive?: boolean;
  medicineIdMode: MedicineIdMode;
  medicineId?: string;
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
