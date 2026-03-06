import { Response } from "express";
import { CategoryModel } from "../../database/models/category";
import { ROLE, StatusCode } from "../../common";
import {countData,createData,findAllWithPopulateWithSorting,findOneAndPopulate,getFirstMatch,isDataExists,reqInfo,responseMessage,sendError,sendNotFound,sendSuccess,sendUnauthorized,updateData,} from "../../helper";
import { AuthRequest } from "../../middleware/auth";

const getCategoryScopeFilter = (req: AuthRequest) => {
  const filter: Record<string, unknown> = { isDeleted: false };
  if (req.user?.role !== ROLE.ADMIN) {
    filter.medicalStoreId = req.user?.medicalStoreId;
  }
  return filter;
};

/* ================= CREATE CATEGORY ================= */
export const createCategory = async (req: AuthRequest, res: Response) => {
  reqInfo(req);
  try {
    if (!req.user) return sendUnauthorized(res, responseMessage.accessDenied);
  
    const { name, description } = req.body as { name: string; description?: string };
    const medicalStoreId = req.user.medicalStoreId;

    if (!medicalStoreId) return sendError(res, responseMessage.medicalIdNotAssigned, null, StatusCode.BAD_REQUEST);

    const normalizedName = String(name).trim().toLowerCase();
    const normalizedDescription = typeof description === "string" ? description.trim() : "";

    const existing = await isDataExists(CategoryModel, {
      name: normalizedName,
      isDeleted: false,
      medicalStoreId,
    });
    if (existing) {
      return sendError(res, responseMessage.categoryAlreadyExists, null, StatusCode.BAD_REQUEST);
    }

    const createdCategory = await createData(CategoryModel, {
      createdBy: req.user._id,
      medicalStoreId,
      name: normalizedName,
      description: normalizedDescription,
      isDeleted: false,
    });

    return sendSuccess(res, responseMessage.addDataSuccess("Category"), {
      category: {
        _id: createdCategory._id,
        name: createdCategory.name,
        description: createdCategory.description || "",
        isActive: createdCategory.isActive,
        isDeleted: createdCategory.isDeleted,
        createdBy: createdCategory.createdBy,
        medicalStoreId: createdCategory.medicalStoreId || "",
        createdAt: createdCategory.createdAt,
        updatedAt: createdCategory.updatedAt,
      },
    });
  } catch (error) {
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};

/* ================= GET ALL CATEGORIES ================= */
export const getCategories = async (req: AuthRequest, res: Response) => {
  reqInfo(req);
  try {
    const { page, limit, search, startDate, endDate } = req.query as Record<string, string | undefined>;
    const criteria: Record<string, unknown> = getCategoryScopeFilter(req);
    const options: Record<string, unknown> = { lean: true };

    if (search) {
      criteria.$or = [
        { name: { $regex: search, $options: "si" } },
        { description: { $regex: search, $options: "si" } },
      ];
    }

    if (startDate && endDate)criteria.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };

    options.sort = { createdAt: -1 };
    if (page && limit) {
      options.skip = (parseInt(page) - 1) * parseInt(limit);
      options.limit = parseInt(limit);
    }

    const populate = [{ path: "createdBy", select: "name email role medicalStoreId" }];
    const [categories, totalCount] = await Promise.all([
      findAllWithPopulateWithSorting(CategoryModel, criteria, {}, options, populate),
      countData(CategoryModel, criteria),
    ]);

    const stateObj = {
      page: parseInt(page || "") || 1,
      limit: parseInt(limit || "") || totalCount,
      page_limit: Math.ceil(totalCount / (parseInt(limit || "") || totalCount)) || 1,
    };

    return sendSuccess(res, "Categories fetched successfully", {
      category_data: categories.map((category: any) => ({
        _id: category._id,
        name: category.name,
        description: category.description || "",
        isActive: category.isActive,
        isDeleted: category.isDeleted,
        createdBy: category.createdBy,
        medicalStoreId: category.medicalStoreId || "",
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      })),
      totalData: totalCount,
      state: stateObj,
    });
  } catch (error) {
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};

/* ================= GET CATEGORY BY ID ================= */
export const getCategoryById = async (req: AuthRequest, res: Response) => {
  reqInfo(req);
  try {
    if (!req.user) {
      return sendUnauthorized(res, responseMessage.accessDenied);
    }

    const criteria: Record<string, unknown> = {
      _id: req.params.id,
      ...getCategoryScopeFilter(req),
    };

    const category = await findOneAndPopulate(
      CategoryModel,
      criteria,
      undefined,
      {},
      [{ path: "createdBy", select: "name email role medicalStoreId" }]
    );
    if (!category) {
      return sendNotFound(res, responseMessage.getDataNotFound("Category"));
    }

    return sendSuccess(res, "Category fetched successfully", {
      _id: category._id,
      name: category.name,
      description: category.description || "",
      isActive: category.isActive,
      isDeleted: category.isDeleted,
      createdBy: category.createdBy,
      medicalStoreId: category.medicalStoreId || "",
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    });
  } catch (error) {
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};

/* ================= UPDATE CATEGORY ================= */
export const updateCategory = async (req: AuthRequest, res: Response) => {
  reqInfo(req);
  try {
    if (!req.user) {
      return sendUnauthorized(res, responseMessage.accessDenied);
    }

    const { id } = req.params;
    const payload = { ...(req.body as Record<string, unknown>) };

    const criteria: Record<string, unknown> = {
      _id: id,
      ...getCategoryScopeFilter(req),
    };

    const category = await getFirstMatch(CategoryModel, criteria, "_id name medicalStoreId", {});
    if (!category) {
      return sendNotFound(res, responseMessage.getDataNotFound("Category"));
    }

    if (payload.name !== undefined) {
      const normalizedName = String(payload.name).trim().toLowerCase();
      const medicalStoreId = category.medicalStoreId ? String(category.medicalStoreId) : "";
      if (!medicalStoreId) {
        return sendError(res, responseMessage.medicalIdNotAssigned, null, StatusCode.BAD_REQUEST);
      }

      const duplicate = await getFirstMatch(
        CategoryModel,
        {
          _id: { $ne: id },
          name: normalizedName,
          isDeleted: false,
          medicalStoreId,
        },
        "_id",
        {}
      );

      if (duplicate) {
        return sendError(res, responseMessage.categoryNameAlreadyExists, null, StatusCode.BAD_REQUEST);
      }
      payload.name = normalizedName;
    }

    if (payload.description !== undefined) {
      payload.description = typeof payload.description === "string" ? payload.description.trim() : "";
    }

    const response = await updateData(CategoryModel, criteria, payload, {});
    if (!response) {
      return sendNotFound(res, responseMessage.getDataNotFound("Category"));
    }

    const populated = await findOneAndPopulate(
      CategoryModel,
      { _id: response._id, isDeleted: false },
      undefined,
      {},
      [{ path: "createdBy", select: "name email role medicalStoreId" }]
    );

    return sendSuccess(res, responseMessage.updateDataSuccess("Category"), {
      category: {
        _id: (populated || response)._id,
        name: (populated || response).name,
        description: (populated || response).description || "",
        isActive: (populated || response).isActive,
        isDeleted: (populated || response).isDeleted,
        createdBy: (populated || response).createdBy,
        medicalStoreId: (populated || response).medicalStoreId || "",
        createdAt: (populated || response).createdAt,
        updatedAt: (populated || response).updatedAt,
      },
    });
  } catch (error) {
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};

/* ================= DELETE CATEGORY ================= */
export const deleteCategory = async (req: AuthRequest, res: Response) => {
  reqInfo(req);
  try {
    if (!req.user) {
      return sendUnauthorized(res, responseMessage.accessDenied);
    }

    const criteria: Record<string, unknown> = {
      _id: req.params.id,
      ...getCategoryScopeFilter(req),
    };

    const category = await getFirstMatch(CategoryModel, criteria, "_id", {});
    if (!category) {
      return sendNotFound(res, responseMessage.getDataNotFound("Category"));
    }

    const response = await updateData(CategoryModel, criteria, { isDeleted: true }, { new: true });
    if (!response) {
      return sendNotFound(res, responseMessage.getDataNotFound("Category"));
    }

    return sendSuccess(res, responseMessage.deleteDataSuccess("Category"), { category: response });
  } catch (error) {
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};

export const getActiveCategoriesForDropdown = async (req: AuthRequest, res: Response) => {
  reqInfo(req);
  try {
    const criteria: Record<string, unknown> = {
      ...getCategoryScopeFilter(req),
      isActive: true,
    };

    const categories = (
      await CategoryModel.find(criteria).select("_id name").sort({ name: 1 }).lean()
    ).map((cat: any) => ({
      _id: cat._id,
      name: typeof cat.name === "string" ? cat.name : "",
    }));

    return sendSuccess(res, "Categories fetched successfully", { categories });
  } catch (error) {
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};
