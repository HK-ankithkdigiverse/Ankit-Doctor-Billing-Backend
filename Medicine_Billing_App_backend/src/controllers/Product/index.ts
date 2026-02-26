import { Response } from "express";
import { Product } from "../../database/models/product";
import {
  countData,
  createData,
  findOneAndPopulate,
  responseMessage,
} from "../../helper";
import { ApiResponse, StatusCode } from "../../common";
import { AuthRequest } from "../../middleware/auth";
import mongoose from "mongoose";

/* ================= CREATE PRODUCT ================= */
export const createProduct = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res
        .status(StatusCode.UNAUTHORIZED)
        .json(ApiResponse.error(responseMessage.accessDenied, null, StatusCode.UNAUTHORIZED));
    }

    const { companyId } = req.body;

    if (!companyId) {
      return res
        .status(StatusCode.BAD_REQUEST)
        .json(ApiResponse.error(responseMessage.validationError("company"), null, StatusCode.BAD_REQUEST));
    }

    const product = await createData(Product, {
      ...req.body,
      companyId,
      createdBy: req.user._id, // ✅ FIXED
      isDeleted: false,
    });

    return res
      .status(StatusCode.CREATED)
      .json(ApiResponse.created(responseMessage.addDataSuccess("Product"), { product }));
  } catch (error) {
    return res
      .status(StatusCode.INTERNAL_ERROR)
      .json(ApiResponse.error(responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR));
  }
};

/* ================= GET SINGLE PRODUCT ================= */
export const getProductById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(StatusCode.BAD_REQUEST).json({
        message: "Invalid product id",
      });
    }

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
      return res.status(StatusCode.NOT_FOUND).json({
        message: responseMessage.getDataNotFound("Product"),
      });
    }

    return res.status(StatusCode.OK).json(ApiResponse.success("Product fetched successfully", { product }));
  } catch (error) {
    return res
      .status(StatusCode.INTERNAL_ERROR)
      .json(ApiResponse.error(responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR));
  }
};


export const getProducts = async (req: AuthRequest, res: Response) => {
  try {
    const {
      category,
      productType,
      companyId,
      search,
      page = 1,
      limit = 10,
    } = req.query;

    const filter: any = { isDeleted: false };

    // 🔹 Filters
    if (category) filter.category = category;
    if (productType) filter.productType = productType;

    if (companyId) {
      filter.companyId = new mongoose.Types.ObjectId(companyId as string);
    }

    // 🔍 SEARCH (name, category, productType)
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { productType: { $regex: search, $options: "i" } },
      ];
    }

    // 🔐 USER restriction
    if (req.user?.role !== "ADMIN") {
      filter.createdBy = req.user._id;
    }

    // 📄 Pagination
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("companyId", "name companyName")
        .populate("createdBy", "name email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      countData(Product, filter),
    ]);

    return res.status(StatusCode.OK).json({
      products,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    return res.status(StatusCode.INTERNAL_ERROR).json({
      message: responseMessage.internalServerError,
    });
  }
};


/* ================= UPDATE PRODUCT ================= */
export const updateProduct = async (req: AuthRequest, res: Response) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product || product.isDeleted) {
      return res.status(StatusCode.NOT_FOUND).json({
        message: responseMessage.getDataNotFound("Product"),
      });
    }

    // 🔒 Permission check
    if (
      req.user?.role !== "ADMIN" &&
      product.createdBy.toString() !== req.user?._id.toString()
    ) {
      return res.status(StatusCode.FORBIDDEN).json({
        message: "Not authorized",
      });
    }

    // ❌ USER cannot change company
    if (req.user?.role !== "ADMIN") {
      delete req.body.companyId;
      delete req.body.createdBy;
    }

    Object.assign(product, req.body);
    await product.save();

    return res.status(StatusCode.OK).json({
      message: responseMessage.updateDataSuccess("Product"),
      product,
    });
  } catch (error) {
    return res.status(StatusCode.INTERNAL_ERROR).json({
      message: responseMessage.internalServerError,
    });
  }
};

/* ================= SOFT DELETE PRODUCT ================= */
export const deleteProduct = async (req: AuthRequest, res: Response) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product || product.isDeleted) {
      return res.status(StatusCode.NOT_FOUND).json({
        message: responseMessage.getDataNotFound("Product"),
      });
    }

    // 🔒 Permission check
    if (
      req.user?.role !== "ADMIN" &&
      product.createdBy.toString() !== req.user?._id.toString()
    ) {
      return res.status(StatusCode.FORBIDDEN).json({
        message: "Not authorized",
      });
    }

    product.isDeleted = true;
    await product.save();

    return res.status(StatusCode.OK).json({
      message: responseMessage.deleteDataSuccess("Product"),
    });
  } catch (error) {
    return res.status(StatusCode.INTERNAL_ERROR).json({
      message: responseMessage.internalServerError,
    });
  }
};

