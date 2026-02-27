import User from "../../database/models/auth";
import { Response } from "express";
import { StatusCode } from "../../common";
import {AuthRequest} from "../../middleware/auth"
import { applySearchFilter, countData, getPagination, responseMessage, sendError, sendNotFound, sendSuccess } from "../../helper";

// GET PROFILE (USER + ADMIN)
export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select("-password").lean();

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
    const {name,medicalName,email,signature,phone,address,state,city,pincode,gstNumber,panCardNumber,} = req.body;

    const updatePayload: Record<string, unknown> = {};

    if (name !== undefined) updatePayload.name = name;
    if (medicalName !== undefined) updatePayload.medicalName = medicalName;
    if (email !== undefined) updatePayload.email = email;
    if (signature !== undefined) updatePayload.signature = signature;
    if (phone !== undefined) updatePayload.phone = phone;
    if (address !== undefined) updatePayload.address = address;
    if (state !== undefined) updatePayload.state = state;
    if (city !== undefined) updatePayload.city = city;
    if (pincode !== undefined) updatePayload.pincode = pincode;
    if (gstNumber !== undefined) updatePayload.gstNumber = String(gstNumber).toUpperCase();
    if (panCardNumber !== undefined) updatePayload.panCardNumber = String(panCardNumber).toUpperCase();

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updatePayload,
      { new: true }
    ).select("-password").lean();

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
        "medicalName",
        "email",
        "phone",
        "address",
        "state",
        "city",
        "pincode",
        "gstNumber",
        "panCardNumber",
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

    if (payload.gstNumber !== undefined) {
      payload.gstNumber = String(payload.gstNumber).toUpperCase();
    }

    if (payload.panCardNumber !== undefined) {
      payload.panCardNumber = String(payload.panCardNumber).toUpperCase();
    }

    const user = await User.findByIdAndUpdate(
      id,
      payload,
      { new: true }
    ).select("-password").lean();

    if (!user) {
      return sendNotFound(res, responseMessage.getDataNotFound("User"));
    }

    return sendSuccess(res, responseMessage.updateDataSuccess("User"), { user });
  } catch (error) {
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};