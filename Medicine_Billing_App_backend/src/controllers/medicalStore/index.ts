import { Response } from "express";
import User from "../../database/models/auth";
import { MedicalStoreModel } from "../../database/models/medicalStore";
import { ROLE, StatusCode } from "../../common";
import {
  applySearchFilter,
  countData,
  createData,
  getFirstMatch,
  getPagination,
  responseMessage,
  sendCreated,
  sendError,
  sendNotFound,
  sendSuccess,
  sendUnauthorized,
} from "../../helper";
import { AuthRequest } from "../../middleware/auth";

const normalizeValue = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const normalizeStorePayload = (payload: Record<string, unknown>) => {
  const nextPayload: Record<string, unknown> = {};

  if (payload.name !== undefined) {
    nextPayload.name = normalizeValue(payload.name);
  }
  if (payload.phone !== undefined) {
    nextPayload.phone = normalizeValue(payload.phone);
  }
  if (payload.address !== undefined) {
    nextPayload.address = normalizeValue(payload.address);
  }
  if (payload.state !== undefined) {
    nextPayload.state = normalizeValue(payload.state);
  }
  if (payload.city !== undefined) {
    nextPayload.city = normalizeValue(payload.city);
  }
  if (payload.pincode !== undefined) {
    nextPayload.pincode = normalizeValue(payload.pincode);
  }
  if (payload.gstNumber !== undefined) {
    nextPayload.gstNumber = normalizeValue(payload.gstNumber).toUpperCase();
  }
  if (payload.panCardNumber !== undefined) {
    nextPayload.panCardNumber = normalizeValue(payload.panCardNumber).toUpperCase();
  }
  if (payload.isActive !== undefined) {
    nextPayload.isActive = Boolean(payload.isActive);
  }

  return nextPayload;
};

const getStoreScopeFilter = (req: AuthRequest) => {
  const filter: Record<string, unknown> = { isDeleted: false };
  if (req.user?.role !== ROLE.ADMIN) {
    filter._id = req.user?.medicalStoreId;
  }
  return filter;
};

export const createMedicalStore = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendUnauthorized(res, responseMessage.accessDenied);
    }

    const payload = normalizeStorePayload(req.body);

    const duplicate = await getFirstMatch(
      MedicalStoreModel,
      {
        name: payload.name,
        gstNumber: payload.gstNumber,
        isDeleted: false,
      },
      "_id"
    );

    if (duplicate) {
      return sendError(
        res,
        responseMessage.dataAlreadyExist("Medical Store"),
        null,
        StatusCode.BAD_REQUEST
      );
    }

    const medicalStore = await createData(MedicalStoreModel, {
      ...payload,
      createdBy: req.user._id,
      isDeleted: false,
      isActive: payload.isActive ?? true,
    });

    return sendCreated(res, responseMessage.addDataSuccess("Medical Store"), {
      medicalStore,
    });
  } catch (error) {
    return sendError(
      res,
      responseMessage.internalServerError,
      error,
      StatusCode.INTERNAL_ERROR
    );
  }
};

export const getMedicalStores = async (req: AuthRequest, res: Response) => {
  try {
    const { pageNum, limitNum, skip, searchText } = getPagination(req.query, {
      page: 1,
      limit: 10,
    });

    const filter: Record<string, unknown> = getStoreScopeFilter(req);

    applySearchFilter(filter, searchText, [
      "name",
      "phone",
      "address",
      "state",
      "city",
      "pincode",
      "gstNumber",
      "panCardNumber",
    ]);

    const [medicalStores, total] = await Promise.all([
      MedicalStoreModel.find(filter)
        .populate("createdBy", "name email role medicalStoreId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      countData(MedicalStoreModel, filter),
    ]);

    return sendSuccess(res, "Medical stores fetched successfully", {
      medicalStores,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    return sendError(
      res,
      responseMessage.internalServerError,
      error,
      StatusCode.INTERNAL_ERROR
    );
  }
};

export const getMedicalStoreById = async (req: AuthRequest, res: Response) => {
  try {
    const filter: Record<string, unknown> = {
      _id: req.params.id,
      ...getStoreScopeFilter(req),
    };

    const medicalStore = await MedicalStoreModel.findOne(filter)
      .populate("createdBy", "name email role medicalStoreId")
      .lean();

    if (!medicalStore) {
      return sendNotFound(res, responseMessage.getDataNotFound("Medical Store"));
    }

    return sendSuccess(res, "Medical store fetched successfully", { medicalStore });
  } catch (error) {
    return sendError(
      res,
      responseMessage.internalServerError,
      error,
      StatusCode.INTERNAL_ERROR
    );
  }
};

export const updateMedicalStore = async (req: AuthRequest, res: Response) => {
  try {
    const payload = normalizeStorePayload(req.body);
    const medicalStore = await MedicalStoreModel.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    if (!medicalStore) {
      return sendNotFound(res, responseMessage.getDataNotFound("Medical Store"));
    }

    const nextName = payload.name ?? medicalStore.name;
    const nextGstNumber = payload.gstNumber ?? medicalStore.gstNumber;

    const duplicate = await getFirstMatch(
      MedicalStoreModel,
      {
        _id: { $ne: req.params.id },
        name: nextName,
        gstNumber: nextGstNumber,
        isDeleted: false,
      },
      "_id"
    );

    if (duplicate) {
      return sendError(
        res,
        responseMessage.dataAlreadyExist("Medical Store"),
        null,
        StatusCode.BAD_REQUEST
      );
    }

    medicalStore.set(payload);
    await medicalStore.save();

    return sendSuccess(res, responseMessage.updateDataSuccess("Medical Store"), {
      medicalStore,
    });
  } catch (error) {
    return sendError(
      res,
      responseMessage.internalServerError,
      error,
      StatusCode.INTERNAL_ERROR
    );
  }
};

export const deleteMedicalStore = async (req: AuthRequest, res: Response) => {
  try {
    const medicalStore = await MedicalStoreModel.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    if (!medicalStore) {
      return sendNotFound(res, responseMessage.getDataNotFound("Medical Store"));
    }

    const assignedUser = await getFirstMatch(
      User,
      { medicalStoreId: req.params.id, isDeleted: false },
      "_id"
    );

    if (assignedUser) {
      return sendError(
        res,
        "Medical Store is assigned to active users. Reassign users before deleting.",
        null,
        StatusCode.BAD_REQUEST
      );
    }

    medicalStore.isDeleted = true;
    medicalStore.isActive = false;
    await medicalStore.save();

    return sendSuccess(res, responseMessage.deleteDataSuccess("Medical Store"));
  } catch (error) {
    return sendError(
      res,
      responseMessage.internalServerError,
      error,
      StatusCode.INTERNAL_ERROR
    );
  }
};
