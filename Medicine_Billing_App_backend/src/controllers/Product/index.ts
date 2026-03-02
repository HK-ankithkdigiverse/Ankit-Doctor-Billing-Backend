import { Response } from "express";
import { Product } from "../../database/models/product";
import { CompanyModel } from "../../database/models/company";
import {
  ApiResponse,
  ROLE,
  StatusCode,
} from "../../common";
import {
  applySearchFilter,
  countData,
  createData,
  findOneAndPopulate,
  getPagination,
  responseMessage,
  sendError,
  sendNotFound,
  sendSuccess,
  sendUnauthorized,
} from "../../helper";
import { AuthRequest } from "../../middleware/auth";
import mongoose from "mongoose";

const getProductScopeFilter = (req: AuthRequest) => {
  if (!req.user || req.user.role === ROLE.ADMIN) {
    return {};
  }

  return {
    medicalStoreId: req.user.medicalStoreId,
  };
};

const canAccessProduct = (product: any, req: AuthRequest) => {
  if (req.user?.role === ROLE.ADMIN) {
    return true;
  }

  if (!req.user) {
    return false;
  }

  return (
    Boolean(product.medicalStoreId) &&
    String(product.medicalStoreId) === String(req.user.medicalStoreId)
  );
};

/* ================= CREATE PRODUCT ================= */
export const createProduct = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendUnauthorized(res, responseMessage.accessDenied);
    }

    const { companyId } = req.body;

    const company = await CompanyModel.findOne({
      _id: companyId,
      isDeleted: false,
      medicalStoreId: req.user.medicalStoreId,
    })
      .select("_id")
      .lean();

    if (!company) {
      return sendError(
        res,
        responseMessage.companyNotAvailableForSelectedUser,
        null,
        StatusCode.BAD_REQUEST
      );
    }

    const product = await createData(Product, {
      ...req.body,
      companyId,
      medicalStoreId: req.user.medicalStoreId,
      createdBy: req.user._id,
      isDeleted: false,
    });

    return res.status(StatusCode.CREATED).json(
      ApiResponse.created(responseMessage.addDataSuccess("Product"), { product })
    );
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
      ...getProductScopeFilter(req),
    };

    const product = await findOneAndPopulate(
      Product,
      filter,
      undefined,
      undefined,
      [
        { path: "companyId", select: "name companyName" },
        { path: "createdBy", select: "name email role medicalStoreId" },
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
      { page: 1, limit: 10 }
    );

    const filter: any = {
      isDeleted: false,
      ...getProductScopeFilter(req),
    };

    if (category) filter.category = category;
    if (productType) filter.productType = productType;

    if (companyId) {
      filter.companyId = new mongoose.Types.ObjectId(companyId as string);
    }

    applySearchFilter(filter, searchText, ["name", "category", "productType"]);

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("companyId", "name companyName")
        .populate("createdBy", "name email role medicalStoreId")
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
    const product = await Product.findById(req.params.id)
      .select("_id createdBy medicalStoreId isDeleted")
      .lean();

    if (!product || product.isDeleted) {
      return sendNotFound(res, responseMessage.getDataNotFound("Product"));
    }
    if (!canAccessProduct(product, req)) {
      return sendError(res, responseMessage.notAuthorized, null, StatusCode.FORBIDDEN);
    }

    const payload = { ...req.body };
    delete payload.medicalStoreId;

    if (req.user?.role !== ROLE.ADMIN) {
      delete payload.companyId;
      delete payload.createdBy;
    }

    const targetMedicalStoreId = product.medicalStoreId
      ? String(product.medicalStoreId)
      : "";
    if (!targetMedicalStoreId) {
      return sendError(res, responseMessage.medicalIdNotAssigned, null, StatusCode.BAD_REQUEST);
    }

    if (payload.companyId !== undefined) {
      const company = await CompanyModel.findOne({
        _id: payload.companyId,
        isDeleted: false,
        medicalStoreId: targetMedicalStoreId,
      })
        .select("_id")
        .lean();

      if (!company) {
        return sendError(
          res,
          responseMessage.companyNotAvailableForSelectedUser,
          null,
          StatusCode.BAD_REQUEST
        );
      }
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
    const product = await Product.findById(req.params.id)
      .select("_id createdBy medicalStoreId isDeleted")
      .lean();

    if (!product || product.isDeleted) {
      return sendNotFound(res, responseMessage.getDataNotFound("Product"));
    }

    if (!canAccessProduct(product, req)) {
      return sendError(res, responseMessage.notAuthorized, null, StatusCode.FORBIDDEN);
    }

    await Product.findByIdAndUpdate(req.params.id, { $set: { isDeleted: true } });

    return sendSuccess(res, responseMessage.deleteDataSuccess("Product"));
  } catch (error) {
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};
