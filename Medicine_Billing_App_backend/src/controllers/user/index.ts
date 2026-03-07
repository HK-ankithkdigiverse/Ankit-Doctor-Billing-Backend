import User from "../../database/models/auth";
import { MedicalStoreModel } from "../../database/models/medicalStore";
import { Response } from "express";
import { StatusCode } from "../../common";
import { AuthRequest } from "../../middleware";
import {
  countData,
  findAllWithPopulateWithSorting,
  findOneAndPopulate,
  getFirstMatch,
  reqInfo,
  responseMessage,
  sendError,
  sendNotFound,
  sendSuccess,
  sendUnauthorized,
  updateData,
} from "../../helper";

const USER_STORE_POPULATE_FIELDS = [
  "name",
  "phone",
  "address",
  "state",
  "city",
  "pincode",
  "gstNumber",
  "gstType",
  "gstPercent",
  "panCardNumber",
  "isActive",
].join(" ");

// GET PROFILE (USER + ADMIN)
export const getProfile = async (req: AuthRequest, res: Response) => {
  reqInfo(req);
  try {
    if (!req.user) return sendUnauthorized(res, responseMessage.accessDenied);

    const user = await findOneAndPopulate(
      User,
      { _id: req.user._id, isDeleted: false },
      "-password",
      {},
      [{ path: "medicalStoreId", select: USER_STORE_POPULATE_FIELDS }]
    );

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
  reqInfo(req);
  try {
    if (!req.user) return sendUnauthorized(res, responseMessage.accessDenied);

    const { name, email, signature } = req.body as Record<string, unknown>;
    const updatePayload: Record<string, unknown> = {};
    if (name !== undefined) updatePayload.name = name;
    if (email !== undefined) updatePayload.email = email;
    if (signature !== undefined) updatePayload.signature = signature;

    const updatedUser = await updateData(
      User,
      { _id: req.user._id, isDeleted: false },
      updatePayload,
      {}
    );

    if (!updatedUser) return sendNotFound(res, responseMessage.getDataNotFound("User"));

    const populatedUser = await findOneAndPopulate(
      User,
      { _id: updatedUser._id, isDeleted: false },
      "-password",
      {},
      [{ path: "medicalStoreId", select: USER_STORE_POPULATE_FIELDS }]
    );

    return sendSuccess(res, responseMessage.updateDataSuccess("Profile"), { user: populatedUser });
  } catch (error) {
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};

// ADMIN -> DELETE USER
export const deleteUser = async (req: AuthRequest, res: Response) => {
  reqInfo(req);
  try {
    const { id: userId } = req.params;

    const user = await updateData(
      User,
      { _id: userId, isDeleted: false },
      { isDeleted: true, isActive: false },
      { new: true }
    );

    if (!user) {
      return sendNotFound(res, responseMessage.getDataNotFound("User"));
    }

    return sendSuccess(res, responseMessage.deleteDataSuccess("User"), { user });
  } catch (error) {
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};

// ADMIN -> GET ALL USERS
export const getAllUsers = async (req: AuthRequest, res: Response) => {
  reqInfo(req);
  try {
    const { page, limit, search, startDate, endDate } = req.query as Record<string, string | undefined>;
    const criteria: Record<string, unknown> = { isDeleted: false };
    const options: Record<string, unknown> = { lean: true };

    if (req.user && req.user._id) {
      criteria._id = { $ne: req.user._id };
    }

    if (search) {
      criteria.$or = [
        { name: { $regex: search, $options: "si" } },
        { email: { $regex: search, $options: "si" } },
        { role: { $regex: search, $options: "si" } },
      ];

      const lowered = search.toLowerCase();
      if (lowered === "true" || lowered === "false") {
        (criteria.$or as Record<string, unknown>[]).push({ isActive: lowered === "true" });
      }
    }

    if (startDate && endDate) {
      criteria.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    options.sort = { createdAt: -1 };
    if (page && limit) {
      options.skip = (parseInt(page) - 1) * parseInt(limit);
      options.limit = parseInt(limit);
    }

    const populate = [{ path: "medicalStoreId", select: USER_STORE_POPULATE_FIELDS }];
    const [users, totalCount] = await Promise.all([
      findAllWithPopulateWithSorting(User, criteria, "-password", options, populate),
      countData(User, criteria),
    ]);

    const stateObj = {
      page: parseInt(page || "") || 1,
      limit: parseInt(limit || "") || totalCount,
      page_limit: Math.ceil(totalCount / (parseInt(limit || "") || totalCount)) || 1,
    };

    return sendSuccess(res, "Users fetched successfully", {
      user_data: users,
      totalData: totalCount,
      state: stateObj,
    });
  } catch (error) {
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};

// ADMIN -> UPDATE ANY USER
export const adminUpdateUser = async (req: AuthRequest, res: Response) => {
  reqInfo(req);
  try {
    const { id } = req.params;
    const payload = { ...(req.body as Record<string, unknown>) };

    if (payload.medicalStoreId !== undefined) {
      const store = await getFirstMatch(
        MedicalStoreModel,
        { _id: payload.medicalStoreId, isDeleted: false },
        "_id",
        {}
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

    const user = await updateData(User, { _id: id, isDeleted: false }, payload, {});

    if (!user) {
      return sendNotFound(res, responseMessage.getDataNotFound("User"));
    }

    const populatedUser = await findOneAndPopulate(
      User,
      { _id: user._id, isDeleted: false },
      "-password",
      {},
      [{ path: "medicalStoreId", select: USER_STORE_POPULATE_FIELDS }]
    );

    return sendSuccess(res, responseMessage.updateDataSuccess("User"), { user: populatedUser });
  } catch (error) {
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};
