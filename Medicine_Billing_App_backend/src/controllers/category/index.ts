import { Response } from "express";
import { CategoryModel } from "../../database/models/category";
import {applySearchFilter,countData,createData,getFirstMatch,getPagination,responseMessage,sendError,sendNotFound,sendSuccess,sendUnauthorized,} from "../../helper";
import { StatusCode } from "../../common";
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
  createdAt: category.createdAt,
updatedAt: category.updatedAt,
});

const getCategoryFilter = (req: AuthRequest) => {
  const filter: any = { isDeleted: false };

  if (req.user?.role !== "ADMIN") {
    filter.createdBy = req.user?._id;
  }

  return filter;
};

/* ================= CREATE CATEGORY ================= */
export const createCategory = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendUnauthorized(res, "Unauthorized");
    }

    const { name, description } = req.body;

    const normalizedName = normalizeCategoryName(name);
    const normalizedDescription = normalizeCategoryDescription(description);

    const existing = await getFirstMatch(CategoryModel, {
      createdBy: req.user._id,
      name: normalizedName,
      isDeleted: false,
    });

    if (existing) {
      return sendError(res, responseMessage.categoryAlreadyExists, null, StatusCode.BAD_REQUEST);
    }

    const createdCategory: any = await createData(CategoryModel, {
      createdBy: req.user._id,
      name: normalizedName,
      description: normalizedDescription,
      isDeleted: false,
    });

    await createdCategory.populate("createdBy", "name email role");

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

    const filter: any = getCategoryFilter(req);
    applySearchFilter(filter, searchText, ["name", "description"]);

    const [categories, total] = await Promise.all([
      CategoryModel.find(filter)
        .populate("createdBy", "name email role")
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

    const filter: any = { _id: id, isDeleted: false };
    if (req.user?.role !== "ADMIN") {
      filter.createdBy = req.user?._id;
    }

    const category = await CategoryModel.findOne(filter)
      .populate("createdBy", "name email role")
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

    const filter: any = { _id: id, isDeleted: false };
    if (req.user?.role !== "ADMIN") {
      filter.createdBy = req.user?._id;
    }

    const category = await CategoryModel.findOne(filter);

    if (!category) {
      return sendNotFound(res, responseMessage.getDataNotFound("Category"));
    }

    if (name !== undefined) {
      const normalizedName = normalizeCategoryName(name);
      const duplicate = await getFirstMatch(CategoryModel, {
        _id: { $ne: id },
        createdBy: category.createdBy,
        name: normalizedName,
        isDeleted: false,
      });

      if (duplicate) {
        return sendError(res, responseMessage.categoryNameAlreadyExists, null, StatusCode.BAD_REQUEST);
      }

      category.name = normalizedName;
    }

    if (description !== undefined) {
      category.description = normalizeCategoryDescription(description);
    }

    await category.save();
    await category.populate("createdBy", "name email role");

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

    const filter: any = { _id: id, isDeleted: false };
    if (req.user?.role !== "ADMIN") {
      filter.createdBy = req.user?._id;
    }

    const category = await CategoryModel.findOneAndUpdate(
      filter,
      { $set: { isDeleted: true } },
      { new: true }
    );
    if (!category) {
      return sendNotFound(res, responseMessage.getDataNotFound("Category"));
    }

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
    const filter: any = getCategoryFilter(req);
    filter.isActive = true;

    const categories = (await CategoryModel.find(filter).select("_id name").sort({ name: 1 }).lean())
      .map((cat: any) => ({
        _id: cat._id,
        name: safeText(cat.name),
      }));

    return sendSuccess(res, "Categories fetched successfully", { categories });
  } catch (error) {
    console.error("GET CATEGORY DROPDOWN ERROR", error);
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};