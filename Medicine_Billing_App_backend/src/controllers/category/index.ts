import { Response } from "express";
import { CategoryModel } from "../../database/models/category";
import {
  ROLE,
  StatusCode,
} from "../../common";
import {
  applySearchFilter,
  countData,
  createData,
  getFirstMatch,
  getPagination,
  responseMessage,
  sendError,
  sendNotFound,
  sendSuccess,
  sendUnauthorized,
} from "../../helper";
import { AuthRequest } from "../../middleware/auth";

const normalizeCategoryName = (name: string) => name.trim().toLowerCase();

const normalizeCategoryDescription = (description: unknown) =>
  typeof description === "string" ? description.trim() : "";

const safeText = (value: unknown) => (typeof value === "string" ? value : "");

const mapCategoryItem = (category: any) => ({
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

const getCategoryScopeFilter = (req: AuthRequest) => {
  const filter: any = { isDeleted: false };

  if (req.user?.role !== ROLE.ADMIN) {
    filter.medicalStoreId = req.user?.medicalStoreId;
  }

  return filter;
};

const canAccessCategory = (category: any, req: AuthRequest) => {
  if (req.user?.role === ROLE.ADMIN) {
    return true;
  }

  if (!req.user) {
    return false;
  }

  return (
    Boolean(category.medicalStoreId) &&
    String(category.medicalStoreId) === String(req.user.medicalStoreId)
  );
};

const buildDuplicateCategoryFilter = (
  id: string,
  name: string,
  medicalStoreId: string
) => ({
  _id: { $ne: id },
  name,
  isDeleted: false,
  medicalStoreId,
});

/* ================= CREATE CATEGORY ================= */
export const createCategory = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendUnauthorized(res, "Unauthorized");
    }

    const { name, description } = req.body;
    const medicalStoreId = req.user.medicalStoreId;

    const normalizedName = normalizeCategoryName(name);
    const normalizedDescription = normalizeCategoryDescription(description);

    const existing = await getFirstMatch(CategoryModel, {
      name: normalizedName,
      isDeleted: false,
      medicalStoreId,
    });

    if (existing) {
      return sendError(res, responseMessage.categoryAlreadyExists, null, StatusCode.BAD_REQUEST);
    }

    const createdCategory: any = await createData(CategoryModel, {
      createdBy: req.user._id,
      medicalStoreId,
      name: normalizedName,
      description: normalizedDescription,
      isDeleted: false,
    });

    await createdCategory.populate("createdBy", "name email role medicalStoreId");

    return sendSuccess(res, responseMessage.addDataSuccess("Category"), {
      category: mapCategoryItem(createdCategory),
    });
  } catch (error) {
    console.error("CREATE CATEGORY ERROR", error);
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};

/* ================= GET ALL CATEGORIES ================= */
export const getCategories = async (req: AuthRequest, res: Response) => {
  try {
    const { pageNum, limitNum, skip, searchText } = getPagination(req.query, {
      page: 1,
      limit: 10,
    });

    const filter: any = getCategoryScopeFilter(req);
    applySearchFilter(filter, searchText, ["name", "description"]);

    const [categories, total] = await Promise.all([
      CategoryModel.find(filter)
        .populate("createdBy", "name email role medicalStoreId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      countData(CategoryModel, filter),
    ]);

    return sendSuccess(res, "Categories fetched successfully", {
      categories: categories.map(mapCategoryItem),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("GET CATEGORIES ERROR", error);
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};

/* ================= GET CATEGORY BY ID ================= */
export const getCategoryById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const filter: any = {
      _id: id,
      ...getCategoryScopeFilter(req),
    };

    const category = await CategoryModel.findOne(filter)
      .populate("createdBy", "name email role medicalStoreId")
      .lean();

    if (!category) {
      return sendNotFound(res, responseMessage.getDataNotFound("Category"));
    }

    return sendSuccess(res, "Category fetched successfully", mapCategoryItem(category));
  } catch (error) {
    console.error("GET CATEGORY BY ID ERROR", error);
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};

/* ================= UPDATE CATEGORY ================= */
export const updateCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const category = await CategoryModel.findOne({ _id: id, isDeleted: false });

    if (!category) {
      return sendNotFound(res, responseMessage.getDataNotFound("Category"));
    }

    if (!canAccessCategory(category, req)) {
      return sendError(res, responseMessage.notAuthorized, null, StatusCode.FORBIDDEN);
    }

    if (name !== undefined) {
      const normalizedName = normalizeCategoryName(name);
      const medicalStoreId = category.medicalStoreId
        ? String(category.medicalStoreId)
        : "";
      if (!medicalStoreId) {
        return sendError(res, responseMessage.medicalIdNotAssigned, null, StatusCode.BAD_REQUEST);
      }

      const duplicateFilter: any = buildDuplicateCategoryFilter(
        id,
        normalizedName,
        medicalStoreId
      );

      const duplicate = await getFirstMatch(CategoryModel, duplicateFilter);

      if (duplicate) {
        return sendError(res, responseMessage.categoryNameAlreadyExists, null, StatusCode.BAD_REQUEST);
      }

      category.name = normalizedName;
    }

    if (description !== undefined) {
      category.description = normalizeCategoryDescription(description);
    }

    await category.save();
    await category.populate("createdBy", "name email role medicalStoreId");

    return sendSuccess(res, responseMessage.updateDataSuccess("Category"), {
      category: mapCategoryItem(category),
    });
  } catch (error) {
    console.error("UPDATE CATEGORY ERROR", error);
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};

/* ================= DELETE CATEGORY ================= */
export const deleteCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const category = await CategoryModel.findOne({ _id: id, isDeleted: false })
      .select("_id createdBy medicalStoreId")
      .lean();

    if (!category) {
      return sendNotFound(res, responseMessage.getDataNotFound("Category"));
    }

    if (!canAccessCategory(category, req)) {
      return sendError(res, responseMessage.notAuthorized, null, StatusCode.FORBIDDEN);
    }

    await CategoryModel.findByIdAndUpdate(id, { $set: { isDeleted: true } });

    return sendSuccess(res, responseMessage.deleteDataSuccess("Category"));
  } catch (error) {
    console.error("DELETE CATEGORY ERROR", error);
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};

export const getActiveCategoriesForDropdown = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const filter: any = getCategoryScopeFilter(req);
    filter.isActive = true;

    const categories = (
      await CategoryModel.find(filter).select("_id name").sort({ name: 1 }).lean()
    ).map((cat: any) => ({
      _id: cat._id,
      name: safeText(cat.name),
    }));

    return sendSuccess(res, "Categories fetched successfully", { categories });
  } catch (error) {
    console.error("GET CATEGORY DROPDOWN ERROR", error);
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};
