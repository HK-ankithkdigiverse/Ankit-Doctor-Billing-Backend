import { Response } from "express";
import { CompanyModel } from "../../database";
import { ROLE, StatusCode } from "../../common";
import { countData, createData, findAllWithPopulateWithSorting, getFirstMatch, reqInfo, responseMessage, sendError, sendNotFound, sendSuccess, sendUnauthorized, updateData } from "../../helper";
import { AuthRequest } from "../../middleware";

const getUploadedLogoPath = (req: AuthRequest) => {
  const files = (req as AuthRequest & { files?: Express.Multer.File[] }).files;
  if (Array.isArray(files) && files.length > 0) {
    return `uploads/${files[0].filename}`;
  }
  return undefined;
};


// ================= CREATE =================
export const createCompany = async (
  req: AuthRequest,
  res: Response
) => {
  reqInfo(req);
  try {
    if (!req.user) {
      return sendUnauthorized(res, responseMessage.accessDenied);
    }

    const payload = req.body as Record<string, unknown>;
    const logoPath = getUploadedLogoPath(req);
    const medicalStoreId =
      req.user.role === ROLE.ADMIN
        ? payload.medicalStoreId || req.user.medicalStoreId
        : req.user.medicalStoreId;

    if (!medicalStoreId) {
      return sendError(
        res,
        responseMessage.medicalIdNotAssigned,
        null,
        StatusCode.BAD_REQUEST
      );
    }

    const duplicateCriteria: Record<string, unknown> = {
      medicalStoreId,
      isDeleted: false,
      $or: [],
    };
    const orList = duplicateCriteria.$or as Record<string, unknown>[];
    if (payload.name) {
      orList.push({ name: payload.name });
    }
    if (payload.gstNumber) {
      orList.push({ gstNumber: payload.gstNumber });
    }
    if (orList.length === 0) {
      delete duplicateCriteria.$or;
    }

    const duplicate = await getFirstMatch(CompanyModel, duplicateCriteria, "_id", {});
    if (duplicate) {
      return sendError(
        res,
        responseMessage.dataAlreadyExist("Company"),
        null,
        StatusCode.BAD_REQUEST
      );
    }

    const response = await createData(CompanyModel, {
      ...payload,
      userId: req.user._id,
      medicalStoreId,
      ...(logoPath ? { logo: logoPath } : {}),
      isDeleted: false,
      isActive: payload.isActive ?? true,
    });

    if (!response) return sendNotFound(res, responseMessage.getDataNotFound("Company"));
    
    return sendSuccess(res, responseMessage.addDataSuccess("Company"), { company: response });
  } catch (error) {
    console.error("CREATE COMPANY ERROR", error);
    const message = error instanceof Error ? error.message : responseMessage.internalServerError;
    return sendError(res, message, error, StatusCode.INTERNAL_ERROR);
  }
};

export const getAllCompanies = async (
  req: AuthRequest,
  res: Response
) => {
  reqInfo(req);
  try {
    const { page, limit, search, startDate, endDate } = req.query as Record<string, string | undefined>;
    const criteria: Record<string, unknown> = { isDeleted: false };
    const options: Record<string, unknown> = { lean: true };

    if (req.user?.role !== ROLE.ADMIN) criteria.medicalStoreId = req.user?.medicalStoreId;

    if (search) {
      criteria.$or = [
        { name: { $regex: search, $options: "si" } },
        { gstNumber: { $regex: search, $options: "si" } },
        { phone: { $regex: search, $options: "si" } },
        { email: { $regex: search, $options: "si" } },
        { state: { $regex: search, $options: "si" } },
        { address: { $regex: search, $options: "si" } },
      ];
    }

    if (startDate && endDate) {
      criteria.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    options.sort = { createdAt: -1 };
    if (page && limit) {
      options.skip = (parseInt(page) - 1) * parseInt(limit);
      options.limit = parseInt(limit);
    }
    let populate = [
      {
        path: "userId",
        select: "name email role medicalStoreId",
      },
    ];
    const [company, totalCount] = await Promise.all([
      findAllWithPopulateWithSorting(CompanyModel, criteria, {}, options, populate),
      countData(CompanyModel, criteria),
    ]);

    const stateObj = {
      page: parseInt(page || "") || 1,
      limit: parseInt(limit || "") || totalCount,
      page_limit: Math.ceil(totalCount / (parseInt(limit || "") || totalCount)) || 1,
    };

    return sendSuccess(res, "Companies fetched successfully", {
      company_data: company,
      totalData: totalCount,
      state: stateObj,
    });
  } catch (error) {
    console.error("GET COMPANIES ERROR", error);
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};

export const getSingleCompany = async (req: AuthRequest, res: Response) => {
  reqInfo(req);
  try {
    if (!req.user) {
      return sendUnauthorized(res, responseMessage.accessDenied);
    }

    const { id } = req.params;
    const criteria: Record<string, unknown> = { _id: id, isDeleted: false };
    if (req.user?.role !== ROLE.ADMIN) {
      criteria.medicalStoreId = req.user?.medicalStoreId;
    }

    const response = await getFirstMatch(CompanyModel, criteria, {}, {});
    if (!response) {
      return sendNotFound(res, responseMessage.getDataNotFound("Company"));
    }

    return sendSuccess(res, "Company fetched successfully", response);
  } catch (error) {
    console.error("GET SINGLE COMPANY ERROR", error);
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};

// ================= UPDATE =================
export const updateCompany = async (req: AuthRequest, res: Response) => {
  reqInfo(req);
  try {
    if (!req.user) {
      return sendUnauthorized(res, responseMessage.accessDenied);
    }

    const updatePayload: Record<string, unknown> = {};
    Object.keys(req.body || {}).forEach((key) => {
      if (req.body[key] !== undefined) {
        updatePayload[key] = req.body[key];
      }
    });
    const logoPath = getUploadedLogoPath(req);

    delete updatePayload.logo;
    delete updatePayload.medicalStoreId;
    if (logoPath) {
      updatePayload.logo = logoPath;
    }

    if (updatePayload.companyName !== undefined && updatePayload.name === undefined) {
      updatePayload.name = updatePayload.companyName;
    }
    delete updatePayload.companyName;

    const criteria: Record<string, unknown> = {
      _id: req.params.id,
      isDeleted: false,
    };
    if (req.user.role !== ROLE.ADMIN) {
      criteria.medicalStoreId = req.user.medicalStoreId;
    }

    const response = await updateData(CompanyModel, criteria, updatePayload, {});
    if (!response) {
      return sendNotFound(res, responseMessage.getDataNotFound("Company"));
    }

    return sendSuccess(res, responseMessage.updateDataSuccess("Company"), { company: response });
  } catch (error) {
    console.log(error)
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};

// ================= DELETE (SOFT DELETE) =================
export const deleteCompany = async (req: AuthRequest, res: Response) => {
  reqInfo(req);
  try {
    if (!req.user) {
      return sendUnauthorized(res, responseMessage.accessDenied);
    }

    const { id } = req.params;
    const criteria: Record<string, unknown> = {
      _id: id,
      isDeleted: false,
    };
    if (req.user.role !== ROLE.ADMIN) {
      criteria.medicalStoreId = req.user.medicalStoreId;
    }

    const response = await updateData(
      CompanyModel,
      criteria,
      { isDeleted: true },
      { new: true }
    );

    if (!response) {
      return sendNotFound(res, responseMessage.getDataNotFound("Company"));
    }

    return sendSuccess(res, responseMessage.deleteDataSuccess("Company"), { company: response });
  } catch (error) {
    console.error("DELETE COMPANY ERROR", error);
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};
