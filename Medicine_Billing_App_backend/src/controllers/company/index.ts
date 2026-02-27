import { Response } from "express";
import { CompanyModel } from "../../database/models/company";
import {applySearchFilter,countData,createData,getFirstMatch,getPagination,responseMessage,sendCreated,sendError,sendNotFound,sendSuccess,sendUnauthorized,updateData,} from "../../helper";
import { ROLE, StatusCode } from "../../common";
import { AuthRequest } from "../../middleware/auth";
import { CompanyPayload } from "../../types/company";

const getLogoFilenameFromRequest = (req: AuthRequest): string | undefined => {
  const files = req.files as
    | Express.Multer.File[]
    | { [fieldname: string]: Express.Multer.File[] }
    | undefined;

  if (!files) {
    return undefined;
  }

  if (Array.isArray(files)) {
    return files[0]?.filename;
  }

  return files.logo?.[0]?.filename;
};

// ================= CREATE =================
export const createCompany = async (
  req:AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return sendUnauthorized(res, responseMessage.accessDenied);
    }

    const { name: rawName, companyName, gstNumber, address, phone, email, state } = req.body as CompanyPayload;
    const name = rawName || companyName;
    const logoFilename = getLogoFilenameFromRequest(req);


    const newCompany = await createData(CompanyModel, {
      userId: req.user._id,
      name,
      gstNumber,
      address,
      phone,
      email,
      state,
      logo: logoFilename,
      isDeleted: false,
    });

    return sendCreated(res, "Company created successfully", { company: newCompany });
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
  try {
    const { pageNum, limitNum, skip, searchText } = getPagination(req.query, {
      page: 1,
      limit: 10,
    });

    const filter: Record<string, unknown> = { isDeleted: false };

    if (req.user?.role !== ROLE.ADMIN) {
      filter.userId = req.user?._id;
    }


    applySearchFilter(filter, searchText, ["companyName","name","gstNumber","phone","email","state",]);

    const [companies, total] = await Promise.all([
      CompanyModel.find(filter)
        .populate("userId", "name email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      countData(CompanyModel, filter),
    ]);

    return sendSuccess(res, "Companies fetched successfully", {
      companies,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("GET COMPANIES ERROR", error);
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};

export const getSingleCompany = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendUnauthorized(res, responseMessage.accessDenied);
    }

    const { id } = req.params;
    const isAdmin = req.user.role === ROLE.ADMIN;

    const filter: Record<string, unknown> = { _id: id, isDeleted: false };

    if (!isAdmin) {
      filter.userId = req.user._id;
    }

    const company = await CompanyModel.findOne(filter).lean();

    if (!company) {
      return sendNotFound(res, responseMessage.getDataNotFound("Company"));
    }

    return sendSuccess(res, "Company fetched successfully", { company });

  } catch (error) {
    console.error("GET SINGLE COMPANY ERROR", error);
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};

// ================= UPDATE =================
export const updateCompany = async (req: AuthRequest, res: Response) => {
  try {
    const company = await CompanyModel.findById(req.params.id).select("_id userId isDeleted").lean();

    if (!company || company.isDeleted) {
      return sendNotFound(res, responseMessage.getDataNotFound("Company"));
    }

    if (
      req.user?.role !== ROLE.ADMIN &&
      company.userId.toString() !== req.user?._id.toString()
    ) {
      return sendError(res, responseMessage.accessDenied, null, StatusCode.FORBIDDEN);
    }

    // ❌ prevent logo update
    delete req.body.logo;

    const allowedFields = [
      "companyName",
      "name",
      "gstNumber",
      "email",
      "phone",
      "state",
      "address",
    ];

    const updatePayload: Record<string, unknown> = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === "companyName") {
          updatePayload.name = req.body[field];
        } else {
          updatePayload[field] = req.body[field];
        }
      }
    });

    const updatedCompany = await CompanyModel.findByIdAndUpdate(
      req.params.id,
      { $set: updatePayload },
      { new: true }
    ).lean();

    return sendSuccess(res, responseMessage.updateDataSuccess("Company"), { company: updatedCompany });
  } catch (error) {
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};


// ================= DELETE (SOFT DELETE) =================
export const deleteCompany = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendUnauthorized(res, responseMessage.accessDenied);
    }

    const { id } = req.params;
    const isAdmin = req.user.role === ROLE.ADMIN;

    const filter: Record<string, unknown> = { _id: id, isDeleted: false };

    if (!isAdmin) {
      filter.userId = req.user._id;
    }

    const company = await updateData(
      CompanyModel,
      filter,
      { isDeleted: true },
      { new: true }
    );

    if (!company) {
      return sendNotFound(res, responseMessage.getDataNotFound("Company"));
    }

    return sendSuccess(res, responseMessage.deleteDataSuccess("Company"));

  } catch (error) {
    console.error("DELETE COMPANY ERROR", error);
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};
