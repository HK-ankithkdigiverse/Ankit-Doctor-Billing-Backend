import User from "../../database/models/auth";
import Otp from "../../database/models/otp";
import { MedicalStoreModel } from "../../database/models/medicalStore";
import { Request, Response } from "express";
import {
  createData,
  email_verification_mail,
  getFirstMatch,
  sendError,
  sendNotFound,
  sendSuccess,
  updateData,
} from "../../helper";
import { ApiResponse, ROLE, StatusCode } from "../../common";
import { responseMessage } from "../../helper/";
import { generateToken } from "../../helper/jwt";
import bcrypt from "bcryptjs";
import { AuthRequest } from "../../middleware/auth";
import {
  AdminCreateUserBody,
  ChangePasswordBody,
  ForgotPasswordBody,
  LoginBody,
  ResetPasswordBody,
  VerifyOtpBody,
} from "../../types/auth";

const USER_STORE_POPULATE_FIELDS = [
  "name",
  "phone",
  "address",
  "state",
  "city",
  "pincode",
  "gstNumber",
  "panCardNumber",
  "isActive",
].join(" ");

// ADMIN -> CREATE USER
export const adminCreateUser = async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      email,
      password,
      signature,
      role,
      isActive,
      medicalStoreId,
    } = req.body as AdminCreateUserBody;

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await getFirstMatch(User, { email: normalizedEmail });
    if (existingUser) {
      return res
        .status(StatusCode.BAD_REQUEST)
        .json(ApiResponse.error(responseMessage.dataAlreadyExist("User"), null, StatusCode.BAD_REQUEST));
    }

    const store = await getFirstMatch(
      MedicalStoreModel,
      { _id: medicalStoreId, isDeleted: false },
      "_id"
    );

    if (!store) {
      return sendError(
        res,
        responseMessage.getDataNotFound("Medical Store"),
        null,
        StatusCode.BAD_REQUEST
      );
    }

    const hashPassword = await bcrypt.hash(password, 12);

    const user: any = await createData(User, {
      name: name.trim(),
      email: normalizedEmail,
      password: hashPassword,
      medicalStoreId,
      signature: signature?.trim() || "",
      role: role || ROLE.USER,
      isActive: typeof isActive === "boolean" ? isActive : true,
    });

    const safeUser = await User.findById(user._id)
      .select("-password")
      .populate("medicalStoreId", USER_STORE_POPULATE_FIELDS)
      .lean();

    return res.status(StatusCode.CREATED).json(ApiResponse.created(responseMessage.signupSuccess, { user: safeUser }));
  } catch (error) {
    console.error("CREATE USER ERROR", error);
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};

/* ================= LOGIN ================= */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as LoginBody;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await getFirstMatch(User, { email: normalizedEmail });
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

    const normalizedMedicalStoreId = user.medicalStoreId
      ? String(user.medicalStoreId)
      : "";
    if (!normalizedMedicalStoreId) {
      return res
        .status(StatusCode.FORBIDDEN)
        .json(ApiResponse.error(responseMessage.medicalIdNotAssigned, null, StatusCode.FORBIDDEN));
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
    await createData(Otp, {
      email: normalizedEmail,
      otp,
      expireAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    const sent = await email_verification_mail(normalizedEmail, otp);
    if (!sent) {
      await Otp.deleteMany({ email: normalizedEmail });
      return res
        .status(StatusCode.INTERNAL_ERROR)
        .json(ApiResponse.error(responseMessage.otpSendFailed, null, StatusCode.INTERNAL_ERROR));
    }

    return sendSuccess(res, responseMessage.otpSent);
  } catch (error) {
    console.error("LOGIN ERROR", error);
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};

/* ================= VERIFY OTP ================= */
export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body as VerifyOtpBody;
    const normalizedEmail = email.toLowerCase().trim();

    const otpRecord = await getFirstMatch(Otp, { email: normalizedEmail, otp });
    if (!otpRecord || otpRecord.expireAt < new Date()) {
      return res
        .status(StatusCode.BAD_REQUEST)
        .json(ApiResponse.error(responseMessage.invalidToken, null, StatusCode.BAD_REQUEST));
    }

    await Otp.deleteMany({ email: normalizedEmail });

    const user = await getFirstMatch(User, { email: normalizedEmail });
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

    const normalizedMedicalStoreId = user.medicalStoreId
      ? String(user.medicalStoreId)
      : "";
    if (!normalizedMedicalStoreId) {
      return res
        .status(StatusCode.FORBIDDEN)
        .json(ApiResponse.error(responseMessage.medicalIdNotAssigned, null, StatusCode.FORBIDDEN));
    }

    const token = generateToken({
      _id: user._id.toString(),
      role: user.role,
      medicalStoreId: normalizedMedicalStoreId,
    });

    const userWithStore = await User.findById(user._id)
      .select("_id role medicalStoreId")
      .populate("medicalStoreId", USER_STORE_POPULATE_FIELDS)
      .lean();

    return sendSuccess(res, responseMessage.loginSuccess, {
      token,
      user: {
        _id: user._id,
        role: user.role,
        medicalStoreId: normalizedMedicalStoreId,
        medicalStore: userWithStore?.medicalStoreId || null,
      },
    });
  } catch (error) {
    console.error("VERIFY OTP ERROR", error);
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user._id;
    const { oldPassword, newPassword } = req.body as ChangePasswordBody;

    const user = await User.findById(userId).select("password");
    if (!user) {
      return sendNotFound(res, responseMessage.getDataNotFound("User"));
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

    return sendSuccess(res, responseMessage.updateDataSuccess("Password"));
  } catch (error) {
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body as ForgotPasswordBody;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await getFirstMatch(User, { email: normalizedEmail });
    if (!user) {
      return sendNotFound(res, responseMessage.getDataNotFound("User"));
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await Otp.deleteMany({ email: normalizedEmail });
    await createData(Otp, {
      email: normalizedEmail,
      otp,
      expireAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    const sent = await email_verification_mail(normalizedEmail, otp);
    if (!sent) {
      await Otp.deleteMany({ email: normalizedEmail });
      return res
        .status(StatusCode.INTERNAL_ERROR)
        .json(ApiResponse.error(responseMessage.otpSendFailed, null, StatusCode.INTERNAL_ERROR));
    }

    return sendSuccess(res, responseMessage.otpSent);
  } catch (error) {
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body as ResetPasswordBody;
    const normalizedEmail = email.toLowerCase().trim();

    const otpRecord = await getFirstMatch(Otp, { email: normalizedEmail, otp });
    if (!otpRecord || otpRecord.expireAt < new Date()) {
      return res
        .status(StatusCode.BAD_REQUEST)
        .json(ApiResponse.error(responseMessage.invalidToken, null, StatusCode.BAD_REQUEST));
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await updateData(
      User,
      { email: normalizedEmail },
      { password: hashedPassword }
    );

    await Otp.deleteMany({ email: normalizedEmail });

    return sendSuccess(res, responseMessage.updateDataSuccess("Password"));
  } catch (error) {
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};

/* ================= LOGOUT ================= */
export const logout = (_req: Request, res: Response) => {
  return sendSuccess(res, responseMessage.logout);
};

/* ================= GET ME ================= */
export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user._id)
      .select("-password")
      .populate("medicalStoreId", USER_STORE_POPULATE_FIELDS)
      .lean();

    if (!user) {
      return sendNotFound(res, responseMessage.getDataNotFound("User"));
    }

    return sendSuccess(res, "Profile fetched", { user });
  } catch (error) {
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};
