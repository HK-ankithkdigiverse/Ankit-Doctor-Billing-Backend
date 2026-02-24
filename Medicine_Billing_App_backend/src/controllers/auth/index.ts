import User from "../../database/models/auth";
import Otp from "../../database/models/otp";
import { Request, Response } from "express";
import { email_verification_mail } from "../../helper";
import { ApiResponse, StatusCode } from "../../common";
import { responseMessage } from "../../helper/";
import { generateToken } from "../../helper/jwt";
import bcrypt from "bcryptjs";
import {AuthRequest} from "../../middleware/auth"
import { ROLE } from "../../common";

interface AdminCreateUserBody {
  name: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
  role?: ROLE;
  isActive?: boolean;
}

interface LoginBody {
  email: string;
  password: string;
}

interface VerifyOtpBody {
  email: string;
  otp: string;
}

interface ChangePasswordBody {
  oldPassword: string;
  newPassword: string;
}

interface ForgotPasswordBody {
  email: string;
}

interface ResetPasswordBody {
  email: string;
  otp: string;
  newPassword: string;
}



// ADMIN → CREATE USER
export const adminCreateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password, phone, address, role, isActive } = req.body as AdminCreateUserBody;

    // Validate required fields
    if (!name || !email || !password) {
      return res
        .status(StatusCode.BAD_REQUEST)
        .json(
          ApiResponse.error(
            responseMessage.validationError("name, email and password"),
            null,
            StatusCode.BAD_REQUEST
          )
        );
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res
        .status(StatusCode.BAD_REQUEST)
        .json(ApiResponse.error(responseMessage.dataAlreadyExist("User"), null, StatusCode.BAD_REQUEST));
    }

    const hashPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email: normalizedEmail,
      password: hashPassword,
      phone,
      address,
      role: role || ROLE.USER,
      isActive: typeof isActive === "boolean" ? isActive : true,
    });

    // Return user without password
    const safeUser = await User.findById(user._id).select("-password");

    return res
      .status(StatusCode.CREATED)
      .json(ApiResponse.created(responseMessage.signupSuccess, { user: safeUser }));
  } catch (error) {
    console.error("CREATE USER ERROR", error);
    return res
      .status(StatusCode.INTERNAL_ERROR)
      .json(ApiResponse.error(responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR));
  }
};

/* ================= LOGIN ================= */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as LoginBody;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(StatusCode.BAD_REQUEST).json({
        ...ApiResponse.error(
          responseMessage.invalidUserPasswordEmail,
          null,
          StatusCode.BAD_REQUEST
        ),
      });
    }

    if (user.isActive === false) {
      return res
        .status(StatusCode.FORBIDDEN)
        .json(ApiResponse.error(responseMessage.accountInactive, null, StatusCode.FORBIDDEN));
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(StatusCode.BAD_REQUEST).json({
        ...ApiResponse.error(
          responseMessage.invalidUserPasswordEmail,
          null,
          StatusCode.BAD_REQUEST
        ),
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await Otp.deleteMany({ email: normalizedEmail });
    await Otp.create({
      email: normalizedEmail,
      otp,
      expireAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    email_verification_mail(user.email, otp)
      .catch((err) => console.error("Email failed", err));

    return res.status(StatusCode.OK).json(ApiResponse.success(responseMessage.loginSuccess));
  } catch (error) {
    console.error("LOGIN ERROR", error);
    return res
      .status(StatusCode.INTERNAL_ERROR)
      .json(ApiResponse.error(responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR));
  }
};

/* ================= VERIFY OTP ================= */
export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body as VerifyOtpBody;
    const normalizedEmail = email.toLowerCase().trim();

    const otpRecord = await Otp.findOne({ email: normalizedEmail, otp });
    if (!otpRecord || otpRecord.expireAt < new Date()) {
      return res
        .status(StatusCode.BAD_REQUEST)
        .json(ApiResponse.error(responseMessage.invalidToken, null, StatusCode.BAD_REQUEST));
    }

    await Otp.deleteMany({ email: normalizedEmail });

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res
        .status(StatusCode.BAD_REQUEST)
        .json(ApiResponse.error(responseMessage.getDataNotFound("User"), null, StatusCode.BAD_REQUEST));
    }

    if (user.isActive === false) {
      return res
        .status(StatusCode.FORBIDDEN)
        .json(ApiResponse.error(responseMessage.accountInactive, null, StatusCode.FORBIDDEN));
    }

    // 🔥 FIXED TOKEN STRUCTURE
    const token = generateToken({
      _id: user._id.toString(),
      role: user.role,
    });

    return res.status(StatusCode.OK).json(
      ApiResponse.success(responseMessage.loginSuccess, {
        token,
        user: {
          _id: user._id,
          role: user.role,
        },
      })
    );
  } catch (error) {
    console.error("VERIFY OTP ERROR", error);
    return res
      .status(StatusCode.INTERNAL_ERROR)
      .json(ApiResponse.error(responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR));
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user._id;
    const { oldPassword, newPassword } = req.body as ChangePasswordBody;

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(StatusCode.NOT_FOUND)
        .json(ApiResponse.error(responseMessage.getDataNotFound("User"), null, StatusCode.NOT_FOUND));
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res
        .status(StatusCode.BAD_REQUEST)
        .json(ApiResponse.error(responseMessage.invalidUserPasswordEmail, null, StatusCode.BAD_REQUEST));
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    user.password = hashedPassword;
    await user.save();

    return res.status(StatusCode.OK).json(ApiResponse.success(responseMessage.updateDataSuccess("Password")));
  } catch (error) {
    return res
      .status(StatusCode.INTERNAL_ERROR)
      .json(ApiResponse.error(responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR));
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body as ForgotPasswordBody;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res
        .status(StatusCode.NOT_FOUND)
        .json(ApiResponse.error(responseMessage.getDataNotFound("User"), null, StatusCode.NOT_FOUND));
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await Otp.deleteMany({ email: normalizedEmail });
    await Otp.create({
      email: normalizedEmail,
      otp,
      expireAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    email_verification_mail(normalizedEmail, otp);

    return res.status(StatusCode.OK).json(ApiResponse.success(responseMessage.loginSuccess));
  } catch (error) {
    return res
      .status(StatusCode.INTERNAL_ERROR)
      .json(ApiResponse.error(responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR));
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body as ResetPasswordBody;
    const normalizedEmail = email.toLowerCase().trim();

    const otpRecord = await Otp.findOne({ email: normalizedEmail, otp });
    if (!otpRecord || otpRecord.expireAt < new Date()) {
      return res
        .status(StatusCode.BAD_REQUEST)
        .json(ApiResponse.error(responseMessage.invalidToken, null, StatusCode.BAD_REQUEST));
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await User.findOneAndUpdate(
      { email: normalizedEmail },
      { password: hashedPassword }
    );

    await Otp.deleteMany({ email: normalizedEmail });

    return res.status(StatusCode.OK).json(ApiResponse.success(responseMessage.updateDataSuccess("Password")));
  } catch (error) {
    return res
      .status(StatusCode.INTERNAL_ERROR)
      .json(ApiResponse.error(responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR));
  }
};

/* ================= LOGOUT ================= */
export const logout = (_req: Request, res: Response) => {
  return res.status(StatusCode.OK).json(ApiResponse.success(responseMessage.logout));
};

/* ================= GET ME ================= */
export const getMe = (req: AuthRequest, res: Response) => {
  return res
    .status(StatusCode.OK)
    .json(ApiResponse.success("Profile fetched", { _id: req.user._id, role: req.user.role }));
};

