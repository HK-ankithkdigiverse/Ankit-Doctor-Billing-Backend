import { Response } from "express";
import User from "../../database/models/auth";
import { MedicalStoreModel } from "../../database/models";
import { ROLE, StatusCode } from "../../common";
import {countData,createData,findAllWithPopulateWithSorting,getFirstMatch,reqInfo,responseMessage,sendCreated,sendError,sendNotFound,sendSuccess,sendUnauthorized,updateData,} from "../../helper";
import { AuthRequest } from "../../middleware";

export const createMedicalStore = async (req: AuthRequest, res: Response) => {
  reqInfo(req);
  try {
    if (!req.user) return sendUnauthorized(res, responseMessage.accessDenied);

    const payload = req.body as Record<string, unknown>;

    const duplicate = await getFirstMatch(
      MedicalStoreModel,
      {
        name: payload.name,
        gstNumber: payload.gstNumber,
      },
      "_id",
      {}
    );

    if (duplicate) return sendError(res,responseMessage.dataAlreadyExist("Medical Store"),null,StatusCode.BAD_REQUEST);
    
    const medicalStore = await createData(MedicalStoreModel, {
      ...payload,
      createdBy: req.user._id,
      isActive: payload.isActive ?? true,
    });

    return sendCreated(res, responseMessage.addDataSuccess("Medical Store"), {medicalStore,});
  } catch (error) {
    return sendError(res,responseMessage.internalServerError,error,StatusCode.INTERNAL_ERROR);
  }
};

export const getMedicalStores = async (req: AuthRequest, res: Response) => {
  reqInfo(req);
  try {
    const { page, limit, search, startDate, endDate } = req.query as Record<string, string | undefined>;
    const criteria: Record<string, unknown> = { isDeleted: false };
    const options: Record<string, unknown> = { lean: true };

    if (req.user?.role !== ROLE.ADMIN) {
      criteria._id = req.user?.medicalStoreId;
    }

    if (search) {
      criteria.$or = [
        { name: { $regex: search, $options: "si" } },
        { phone: { $regex: search, $options: "si" } },
        { address: { $regex: search, $options: "si" } },
        { state: { $regex: search, $options: "si" } },
        { city: { $regex: search, $options: "si" } },
        { pincode: { $regex: search, $options: "si" } },
        { gstNumber: { $regex: search, $options: "si" } },
        { gstType: { $regex: search, $options: "si" } },
        { panCardNumber: { $regex: search, $options: "si" } },
      ];
    }

    if (startDate && endDate) criteria.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };

    options.sort = { createdAt: -1 };
    if (page && limit) {
      options.skip = (parseInt(page) - 1) * parseInt(limit);
      options.limit = parseInt(limit);
    }

    const populate = [{ path: "createdBy", select: "name email role medicalStoreId" }];
    const [medicalStores, totalCount] = await Promise.all([
      findAllWithPopulateWithSorting(MedicalStoreModel, criteria, {}, options, populate),
      countData(MedicalStoreModel, criteria),
    ]);

    const stateObj = {
      page: parseInt(page || "") || 1,
      limit: parseInt(limit || "") || totalCount,
      page_limit: Math.ceil(totalCount / (parseInt(limit || "") || totalCount)) || 1,
    };

    return sendSuccess(res, "Medical stores fetched successfully", {
      medicalStore_data: medicalStores,
      totalData: totalCount,
      state: stateObj,
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
  reqInfo(req);
  try {
    const criteria: Record<string, unknown> = { _id: req.params.id, isDeleted: false };
    if (req.user?.role !== ROLE.ADMIN) {
      criteria._id = req.user?.medicalStoreId;
    }

    const response = await getFirstMatch(MedicalStoreModel, criteria, {}, {});

    if (!response) return sendNotFound(res, responseMessage.getDataNotFound("Medical Store"));
    return sendSuccess(res, "Medical store fetched successfully", response);
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
  reqInfo(req);
  try {
    const payload = req.body as Record<string, unknown>;
    const criteria: Record<string, unknown> = {
      _id: req.params.id,
      isDeleted: false,
    };
    if (req.user?.role !== ROLE.ADMIN) criteria._id = req.user?.medicalStoreId;
  
    const medicalStore = await getFirstMatch(MedicalStoreModel, criteria, {}, {});

    if (!medicalStore) return sendNotFound(res, responseMessage.getDataNotFound("Medical Store"));

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
      "_id",
      {}
    );

    if (duplicate) {
      return sendError(
        res,
        responseMessage.dataAlreadyExist("Medical Store"),
        null,
        StatusCode.BAD_REQUEST
      );
    }

    const response = await updateData(MedicalStoreModel, criteria, payload, {});

    return sendSuccess(res, responseMessage.updateDataSuccess("Medical Store"), {
      medicalStore: response,
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
  reqInfo(req);
  try {
    const criteria: Record<string, unknown> = {
      _id: req.params.id,
      isDeleted: false,
    };
    if (req.user?.role !== ROLE.ADMIN)criteria._id = req.user?.medicalStoreId;

    const medicalStore = await getFirstMatch(MedicalStoreModel, criteria, {}, {});

    if (!medicalStore) return sendNotFound(res, responseMessage.getDataNotFound("Medical Store"));
  
    const assignedUser = await getFirstMatch(
      User,
      { medicalStoreId: req.params.id, isDeleted: false },
      "_id",
      {}
    );

    if (assignedUser) {
      return sendError(
        res,
        "Medical Store is assigned to active users. Reassign users before deleting.",
        null,
        StatusCode.BAD_REQUEST
      );
    }

    const response = await updateData(
      MedicalStoreModel,
      criteria,
      { isDeleted: true, isActive: false },
      { new: true }
    );

    return sendSuccess(res, responseMessage.deleteDataSuccess("Medical Store"), {
      medicalStore: response,
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
