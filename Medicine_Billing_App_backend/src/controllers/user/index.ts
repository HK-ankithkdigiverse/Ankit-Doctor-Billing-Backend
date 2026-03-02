import User from "../../database/models/auth";
import { MedicalStoreModel } from "../../database/models/medicalStore";
import { Response } from "express";
import { StatusCode } from "../../common";
import { AuthRequest } from "../../middleware/auth";
import {
  applySearchFilter,
  countData,
  getFirstMatch,
  getPagination,
  responseMessage,
  sendError,
  sendNotFound,
  sendSuccess,
} from "../../helper";

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

// GET PROFILE (USER + ADMIN)
export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId)
      .select("-password")
      .populate("medicalStoreId", USER_STORE_POPULATE_FIELDS)
      .lean();

    if (!user) {
      return sendNotFound(res, responseMessage.getDataNotFound("User"));
    }

    return sendSuccess(res, responseMessage.loginSuccess, { user });
  } catch (error) {
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};

// UPDATE OWN PROFILE
export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user._id;
    const { name, email, signature } = req.body;

    const updatePayload: Record<string, unknown> = {};

    if (name !== undefined) updatePayload.name = name;
    if (email !== undefined) updatePayload.email = email;
    if (signature !== undefined) updatePayload.signature = signature;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updatePayload,
      { new: true }
    )
      .select("-password")
      .populate("medicalStoreId", USER_STORE_POPULATE_FIELDS)
      .lean();

    if (!updatedUser) {
      return sendNotFound(res, responseMessage.getDataNotFound("User"));
    }

    return sendSuccess(res, responseMessage.updateDataSuccess("Profile"), { user: updatedUser });
  } catch (error) {
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};

// ADMIN -> DELETE USER
export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id: userId } = req.params;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        isDeleted: true,
        deletedAt: new Date(),
      },
      { new: true }
    );

    if (!user) {
      return sendNotFound(res, responseMessage.getDataNotFound("User"));
    }

    return sendSuccess(res, responseMessage.deleteDataSuccess("User"));
  } catch (error) {
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};

// ADMIN ? GET ALL USERS
export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { pageNum, limitNum, skip, searchText } = getPagination(req.query, {
      page: 1,
      limit: 10,
    });

    const filter: any = { isDeleted: false };

    if (searchText) {
      applySearchFilter(filter, searchText, [
        "name",
        "email",
        "medicalStoreId",
        "role",
      ]);

      const loweredSearch = searchText.toLowerCase();
      if (loweredSearch === "true" || loweredSearch === "false") {
        filter.$or = [...(Array.isArray(filter.$or) ? filter.$or : []), { isActive: loweredSearch === "true" }];
      }
    }

    if (req.user && req.user._id) {
      filter._id = { $ne: req.user._id };
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password")
        //.populate("medicalStoreId", USER_STORE_POPULATE_FIELDS)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      countData(User, filter),
    ]);

    return sendSuccess(res, "Users fetched successfully", {
      users,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};

// ADMIN ? UPDATE ANY USER
export const adminUpdateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const payload = { ...req.body };

    if (payload.medicalStoreId !== undefined) {
      const store = await getFirstMatch(
        MedicalStoreModel,
        { _id: payload.medicalStoreId, isDeleted: false },
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
    }

    const user = await User.findByIdAndUpdate(
      id,
      payload,
      { new: true }
    )
      .select("-password")
      .populate("medicalStoreId", USER_STORE_POPULATE_FIELDS)
      .lean();

    if (!user) {
      return sendNotFound(res, responseMessage.getDataNotFound("User"));
    }

    return sendSuccess(res, responseMessage.updateDataSuccess("User"), { user });
  } catch (error) {
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};

