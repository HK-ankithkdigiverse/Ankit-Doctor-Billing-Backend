import { Response } from "express";
import { Product } from "../../database/models/product";
import {applySearchFilter,countData,createData,findOneAndPopulate,getPagination,responseMessage,sendError,sendNotFound,sendSuccess,sendUnauthorized,} from "../../helper";
import { ApiResponse, StatusCode } from "../../common";
import { AuthRequest } from "../../middleware/auth";
import mongoose from "mongoose";

/* ================= CREATE PRODUCT ================= */
export const createProduct = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendUnauthorized(res, responseMessage.accessDenied);
    }

    const { companyId } = req.body;

    const product = await createData(Product, {
      ...req.body,
      companyId,
      createdBy: req.user._id, // ✅ FIXED
      isDeleted: false,
    });

    return res.status(StatusCode.CREATED).json(ApiResponse.created(responseMessage.addDataSuccess("Product"), { product }));
  } catch (error) {
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};

/* ================= GET SINGLE PRODUCT ================= */
export const getProductById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const filter: any = {
      _id: id,
      isDeleted: false,
    };

    // 🔐 USER restriction
    if (req.user?.role !== "ADMIN") {
      filter.createdBy = req.user?._id;
    }

    const product = await findOneAndPopulate(
      Product,
      filter,
      undefined,
      undefined,
      [
        { path: "companyId", select: "name companyName" },
        { path: "createdBy", select: "name email role" },
      ]
    );

    if (!product) {
      return sendNotFound(res, responseMessage.getDataNotFound("Product"));
    }

    return sendSuccess(res, "Product fetched successfully", { product });
  } catch (error) {
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};


export const getProducts = async (req: AuthRequest, res: Response) => {
  try {
    const {
      category,
      productType,
      companyId,
      search,
      page,
      limit,
    } = req.query;
    const { pageNum, limitNum, skip, searchText } = getPagination(
      { page, limit, search },
      { page: 1, limit: 10 },
    );

    const filter: any = { isDeleted: false };

    // 🔹 Filters
    if (category) filter.category = category;
    if (productType) filter.productType = productType;

    if (companyId) {
      filter.companyId = new mongoose.Types.ObjectId(companyId as string);
    }

    // 🔍 SEARCH (name, category, productType)
    applySearchFilter(filter, searchText, ["name", "category", "productType"]);

    // 🔐 USER restriction
    if (req.user?.role !== "ADMIN") {
      filter.createdBy = req.user._id;
    }

    // 📄 Pagination
    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("companyId", "name companyName")
        .populate("createdBy", "name email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      countData(Product, filter),
    ]);

    return sendSuccess(res, "Products fetched successfully", {
      products,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};


/* ================= UPDATE PRODUCT ================= */
export const updateProduct = async (req: AuthRequest, res: Response) => {
  try {
    const product = await Product.findById(req.params.id).select("_id createdBy isDeleted").lean();

    if (!product || product.isDeleted) {
      return sendNotFound(res, responseMessage.getDataNotFound("Product"));
    }
    if (
      req.user?.role !== "ADMIN" &&
      product.createdBy.toString() !== req.user?._id.toString()
    ) {
      return sendError(res, responseMessage.notAuthorized, null, StatusCode.FORBIDDEN);
    }

    const payload = { ...req.body };
    if (req.user?.role !== "ADMIN") {
      delete payload.companyId;
      delete payload.createdBy;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: payload },
      { new: true }
    ).lean();

    return sendSuccess(res, responseMessage.updateDataSuccess("Product"), { product: updatedProduct });
  } catch (error) {
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};

/* ================= SOFT DELETE PRODUCT ================= */
export const deleteProduct = async (req: AuthRequest, res: Response) => {
  try {
    const product = await Product.findById(req.params.id).select("_id createdBy isDeleted").lean();

    if (!product || product.isDeleted) {
      return sendNotFound(res, responseMessage.getDataNotFound("Product"));
    }

    // 🔒 Permission check
    if (
      req.user?.role !== "ADMIN" &&
      product.createdBy.toString() !== req.user?._id.toString()
    ) {
      return sendError(res, responseMessage.notAuthorized, null, StatusCode.FORBIDDEN);
    }

    await Product.findByIdAndUpdate(req.params.id, { $set: { isDeleted: true } });

    return sendSuccess(res, responseMessage.deleteDataSuccess("Product"));
  } catch (error) {
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};