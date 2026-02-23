import { Response } from "express";
import mongoose from "mongoose";
import { CategoryModel } from "../../database/models/category";
import { responseMessage } from "../../helper";
import { StatusCode } from "../../common";
import { AuthRequest } from "../../middleware/auth";

const normalizeCategoryName = (name: string) => name.trim().toLowerCase();
const getSingleParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

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

const getAccessibleCategories = async (req: AuthRequest) => {
  const filter = getCategoryFilter(req);

  if (req.user?.role === "ADMIN") {
    return CategoryModel.find(filter).populate("createdBy", "name email role");
  }

  return CategoryModel.find(filter).populate("createdBy", "name email role");
};

/* ================= CREATE CATEGORY ================= */
export const createCategory = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(StatusCode.UNAUTHORIZED).json({ message: "Unauthorized" });
    }

    const { name, description } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res
        .status(StatusCode.BAD_REQUEST)
        .json({ message: "Category name is required" });
    }

    const normalizedName = normalizeCategoryName(name);
    const normalizedDescription = normalizeCategoryDescription(description);

    const existing = await CategoryModel.findOne({
      createdBy: req.user._id,
      name: normalizedName,
      isDeleted: false,
    }).populate("createdBy", "name email role");

    if (existing) {
      return res
        .status(StatusCode.BAD_REQUEST)
        .json({ message: "Category already exists" });
    }

    const createdCategory = await CategoryModel.create({
      createdBy: req.user._id,
      name: normalizedName,
      description: normalizedDescription,
      isDeleted: false,
    });

    await createdCategory.populate("createdBy", "name email role");

    return res.status(StatusCode.CREATED).json({
      message: responseMessage.addDataSuccess("Category"),
      category: mapCategoryItem(createdCategory),
    });
  } catch (error) {
    console.error("CREATE CATEGORY ERROR:", error);
    return res.status(StatusCode.INTERNAL_ERROR).json({
      message: responseMessage.internalServerError,
    });
  }
};

/* ================= GET ALL CATEGORIES ================= */
export const getCategories = async (req: AuthRequest, res: Response) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const searchText = typeof search === "string" ? search.trim().toLowerCase() : "";
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 10);

    const filter: any = getCategoryFilter(req);

    if (searchText) {
      filter.$or = [
        { name: { $regex: searchText, $options: "i" } },
        { description: { $regex: searchText, $options: "i" } },
      ];
    }

    const [categories, total] = await Promise.all([
      CategoryModel.find(filter)
        .populate("createdBy", "name email role")
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      CategoryModel.countDocuments(filter),
    ]);

    return res.status(StatusCode.OK).json({
      categories: categories.map(mapCategoryItem),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("GET CATEGORIES ERROR:", error);
    return res.status(StatusCode.INTERNAL_ERROR).json({
      message: responseMessage.internalServerError,
    });
  }
};

/* ================= GET CATEGORY BY ID ================= */
export const getCategoryById = async (req: AuthRequest, res: Response) => {
  try {
    const id = getSingleParam(req.params.id);

    if (!id) {
      return res.status(StatusCode.BAD_REQUEST).json({
        message: "Category id is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(StatusCode.BAD_REQUEST).json({
        message: "Invalid category id",
      });
    }

    const filter: any = { _id: id, isDeleted: false };
    if (req.user?.role !== "ADMIN") {
      filter.createdBy = req.user?._id;
    }

    const category = await CategoryModel.findOne(filter).populate(
      "createdBy",
      "name email role"
    );

    if (!category) {
      return res.status(StatusCode.NOT_FOUND).json({
        message: responseMessage.getDataNotFound("Category"),
      });
    }

    return res.status(StatusCode.OK).json(mapCategoryItem(category));
  } catch (error) {
    console.error("GET CATEGORY BY ID ERROR:", error);
    return res.status(StatusCode.INTERNAL_ERROR).json({
      message: responseMessage.internalServerError,
    });
  }
};

/* ================= UPDATE CATEGORY ================= */
export const updateCategory = async (req: AuthRequest, res: Response) => {
  try {
    const id = getSingleParam(req.params.id);
    const { name, description } = req.body;

    if (!id) {
      return res.status(StatusCode.BAD_REQUEST).json({
        message: "Category id is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(StatusCode.BAD_REQUEST).json({
        message: "Invalid category id",
      });
    }

    const filter: any = { _id: id, isDeleted: false };
    if (req.user?.role !== "ADMIN") {
      filter.createdBy = req.user?._id;
    }

    const category = await CategoryModel.findOne(filter).populate(
      "createdBy",
      "name email role"
    );

    if (!category) {
      return res.status(StatusCode.NOT_FOUND).json({
        message: responseMessage.getDataNotFound("Category"),
      });
    }

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res
          .status(StatusCode.BAD_REQUEST)
          .json({ message: "Category name is required" });
      }

      const normalizedName = normalizeCategoryName(name);
      const duplicate = await CategoryModel.findOne({
        _id: { $ne: id },
        createdBy: category.createdBy,
        name: normalizedName,
        isDeleted: false,
      });

      if (duplicate) {
        return res.status(StatusCode.BAD_REQUEST).json({
          message: "Category name already exists",
        });
      }

      category.name = normalizedName;
    }

    if (description !== undefined) {
      category.description = normalizeCategoryDescription(description);
    }

    await category.save();
    await category.populate("createdBy", "name email role");

    return res.status(StatusCode.OK).json({
      message: responseMessage.updateDataSuccess("Category"),
      category: mapCategoryItem(category),
    });
  } catch (error) {
    console.error("UPDATE CATEGORY ERROR:", error);
    return res.status(StatusCode.INTERNAL_ERROR).json({
      message: responseMessage.internalServerError,
    });
  }
};

/* ================= DELETE CATEGORY ================= */
export const deleteCategory = async (req: AuthRequest, res: Response) => {
  try {
    const id = getSingleParam(req.params.id);

    if (!id) {
      return res.status(StatusCode.BAD_REQUEST).json({
        message: "Category id is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(StatusCode.BAD_REQUEST).json({
        message: "Invalid category id",
      });
    }

    const filter: any = { _id: id, isDeleted: false };
    if (req.user?.role !== "ADMIN") {
      filter.createdBy = req.user?._id;
    }

    const category = await CategoryModel.findOne(filter);
    if (!category) {
      return res.status(StatusCode.NOT_FOUND).json({
        message: responseMessage.getDataNotFound("Category"),
      });
    }

    category.isDeleted = true;
    await category.save();

    return res.status(StatusCode.OK).json({
      message: responseMessage.deleteDataSuccess("Category"),
    });
  } catch (error) {
    console.error("DELETE CATEGORY ERROR:", error);
    return res.status(StatusCode.INTERNAL_ERROR).json({
      message: responseMessage.internalServerError,
    });
  }
};

/* ================= GET ALL ACTIVE CATEGORIES (for dropdowns) ================= */
export const getActiveCategoriesForDropdown = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const filter: any = getCategoryFilter(req);
    filter.isActive = true;

    const categories = (await CategoryModel.find(filter).sort({ name: 1 }))
      .map((cat: any) => ({
        _id: cat._id,
        name: safeText(cat.name),
      }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name));

    return res.status(StatusCode.OK).json(categories);
  } catch (error) {
    console.error("GET CATEGORY DROPDOWN ERROR:", error);
    return res.status(StatusCode.INTERNAL_ERROR).json({
      message: responseMessage.internalServerError,
    });
  }
};
