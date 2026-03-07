import { Response } from "express";
import path from "path";
import { CompanyModel } from "../../database";
import { ROLE, StatusCode } from "../../common";
import { countData, createData, findAllWithPopulateWithSorting, getFirstMatch, isDataExists, reqInfo, responseMessage, sendError, sendNotFound, sendSuccess, sendUnauthorized, updateData } from "../../helper";
import { AuthRequest } from "../../middleware";

const normalizeLogoPath = (logo: unknown): string | undefined => {
  if (logo === undefined) {
    return undefined;
  }
  if (typeof logo !== "string") {
    return undefined;
  }

  const trimmedLogo = logo.trim();
  if (!trimmedLogo) {
    return "";
  }

  const cleanLogo = trimmedLogo.split("?")[0].split("#")[0];
  if (!cleanLogo) {
    return "";
  }
  if (cleanLogo.startsWith("uploads/")) {
    return cleanLogo;
  }
  if (cleanLogo.startsWith("/uploads/")) {
    return cleanLogo.slice(1);
  }

  const uploadsMarker = "/uploads/";
  const uploadsMarkerIndex = cleanLogo.lastIndexOf(uploadsMarker);
  if (uploadsMarkerIndex >= 0) {
    return cleanLogo.slice(uploadsMarkerIndex + 1);
  }

  return `uploads/${path.basename(cleanLogo)}`;
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
    const hasLogoInPayload = Object.prototype.hasOwnProperty.call(req.body || {}, "logo");
    const logoPath = normalizeLogoPath(req.body?.logo);
    if (hasLogoInPayload && logoPath === undefined) {
      return sendError(res, responseMessage.validationError("logo"), null, StatusCode.BAD_REQUEST);
    }
    const rawName =
      typeof payload.name === "string"
        ? payload.name
        : typeof payload.companyName === "string"
          ? payload.companyName
          : "";
    const normalizedName = rawName.trim();
    const normalizedGstNumber =
      typeof payload.gstNumber === "string" ? payload.gstNumber.trim().toUpperCase() : "";
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

    if (!normalizedName) {
      return sendError(res, responseMessage.validationError("name"), null, StatusCode.BAD_REQUEST);
    }
    if (!normalizedGstNumber) {
      return sendError(res, responseMessage.validationError("gstNumber"), null, StatusCode.BAD_REQUEST);
    }

    const duplicate = await isDataExists(CompanyModel, {
      medicalStoreId,
      isDeleted: false,
      name: normalizedName,
    });
    if (duplicate) {
      return sendError(
        res,
        responseMessage.dataAlreadyExist("Company"),
        null,
        StatusCode.BAD_REQUEST
      );
    }

    const companyPayload: Record<string, unknown> = {
      ...payload,
      name: normalizedName,
      gstNumber: normalizedGstNumber,
    };
    delete companyPayload.companyName;
    delete companyPayload.logo;
    if (logoPath) {
      companyPayload.logo = logoPath;
    }
    const response = await createData(CompanyModel, {
      ...companyPayload,
      userId: req.user._id,
      medicalStoreId,
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
    const hasLogoInPayload = Object.prototype.hasOwnProperty.call(req.body || {}, "logo");
    const logoPath = normalizeLogoPath(req.body?.logo);
    if (hasLogoInPayload && logoPath === undefined) {
      return sendError(res, responseMessage.validationError("logo"), null, StatusCode.BAD_REQUEST);
    }

    delete updatePayload.medicalStoreId;
    if (hasLogoInPayload) {
      updatePayload.logo = logoPath || "";
    } else {
      delete updatePayload.logo;
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

