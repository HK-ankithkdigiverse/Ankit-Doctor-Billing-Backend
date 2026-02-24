import User from "../../database/models/auth";
import { Request, Response } from "express";
import { ApiResponse, StatusCode } from "../../common";
import {AuthRequest} from "../../middleware/auth"
import { responseMessage } from "../../helper";
/* ===================== USER ===================== */

// GET PROFILE (USER + ADMIN)
export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res
        .status(StatusCode.NOT_FOUND)
        .json(ApiResponse.error(responseMessage.getDataNotFound("User"), null, StatusCode.NOT_FOUND));
    }

    return res.status(StatusCode.OK).json(ApiResponse.success(responseMessage.loginSuccess, { user }));
  } catch (error) {
    return res
      .status(StatusCode.INTERNAL_ERROR)
      .json(ApiResponse.error(responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR));
  }
};

// UPDATE OWN PROFILE
export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user._id;
    const { name, email, phone, address } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { name, email, phone, address },
      { new: true }
    ).select("-password");

    if (!updatedUser) {
      return res
        .status(StatusCode.NOT_FOUND)
        .json(ApiResponse.error(responseMessage.getDataNotFound("User"), null, StatusCode.NOT_FOUND));
    }

    return res
      .status(StatusCode.OK)
      .json(ApiResponse.success(responseMessage.updateDataSuccess("Profile"), { user: updatedUser }));
  } catch (error) {
    return res
      .status(StatusCode.INTERNAL_ERROR)
      .json(ApiResponse.error(responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR));
  }
};

// DELETE OWN ACCOUNT
export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user._id;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        isDeleted: true,
        deletedAt: new Date(),
      },
      { new: true }
    );

    if (!user) {
      return res
        .status(StatusCode.NOT_FOUND)
        .json(ApiResponse.error(responseMessage.getDataNotFound("User"), null, StatusCode.NOT_FOUND));
    }

    return res.status(StatusCode.OK).json(ApiResponse.success(responseMessage.deleteDataSuccess("Account")));
  } catch (error) {
    return res
      .status(StatusCode.INTERNAL_ERROR)
      .json(ApiResponse.error(responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR));
  }
};


/* ===================== ADMIN ===================== */

// ADMIN → GET ALL USERS
export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
    } = req.query;

    const filter: any = { isDeleted: false };

    // 🔍 Search by name or email
    if (search) {
      filter.$or = [
        { name: { $regex: search as string, $options: "i" } },
        { email: { $regex: search as string, $options: "i" } },
      ];
    }

    // Exclude the requesting admin from the list
    if (req.user && req.user._id) {
      filter._id = { $ne: req.user._id };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),

      User.countDocuments(filter),
    ]);

    return res
      .status(StatusCode.OK)
      .json(
        ApiResponse.success("Users fetched successfully", {
          users,
          pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / Number(limit)),
          },
        })
      );
  } catch (error) {
    return res
      .status(StatusCode.INTERNAL_ERROR)
      .json(ApiResponse.error(responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR));
  }
};


// ADMIN → UPDATE ANY USER
export const adminUpdateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
    ).select("-password");

    if (!user) {
      return res
        .status(StatusCode.NOT_FOUND)
        .json(ApiResponse.error(responseMessage.getDataNotFound("User"), null, StatusCode.NOT_FOUND));
    }

    return res
      .status(StatusCode.OK)
      .json(ApiResponse.success(responseMessage.updateDataSuccess("User"), { user }));
  } catch (error) {
    return res
      .status(StatusCode.INTERNAL_ERROR)
      .json(ApiResponse.error(responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR));
  }
};
