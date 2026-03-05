import { Response } from "express";
import { Product } from "../../database/models/product";
import { CompanyModel } from "../../database/models/company";
import { ROLE, StatusCode } from "../../common";
import {countData,createData,findAllWithPopulateWithSorting,findOneAndPopulate,getFirstMatch,reqInfo,responseMessage,sendError,sendNotFound,sendSuccess,sendUnauthorized,updateData} from "../../helper";
import { AuthRequest } from "../../middleware/auth";

const getProductScopeFilter = (req: AuthRequest) => {
  if (!req.user || req.user.role === ROLE.ADMIN) {
    return {};
  }

  return {
    medicalStoreId: req.user.medicalStoreId,
  };
};

/* ================= CREATE PRODUCT ================= */
export const createProduct = async (req: AuthRequest, res: Response) => {
  reqInfo(req);
  try {
    if (!req.user) return sendUnauthorized(res, responseMessage.accessDenied);
    

    const payload = req.body as Record<string, unknown>;
    const companyId = payload.companyId;
    const medicalStoreId = req.user.medicalStoreId;

    if (!medicalStoreId) return sendError(res, responseMessage.medicalIdNotAssigned, null, StatusCode.BAD_REQUEST);

    const company = await CompanyModel.findOne({
      _id: companyId,
      isDeleted: false,
      medicalStoreId,
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
      ...payload,
      companyId,
      medicalStoreId,
      createdBy: req.user._id,
      isDeleted: false,
    });

    return sendSuccess(res, responseMessage.addDataSuccess("Product"), { product });
  } catch (error) {
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};

/* ================= GET SINGLE PRODUCT ================= */
export const getProductById = async (req: AuthRequest, res: Response) => {
  reqInfo(req);
  try {
    if (!req.user) return sendUnauthorized(res, responseMessage.accessDenied);

    const { id } = req.params;
    const criteria: Record<string, unknown> = {
      _id: id,
      isDeleted: false,
      ...getProductScopeFilter(req),
    };

    const product = await findOneAndPopulate(Product, criteria, undefined, {}, [
      { path: "companyId", select: "name companyName" },
      { path: "createdBy", select: "name email role medicalStoreId" },
    ]);

    if (!product) return sendNotFound(res, responseMessage.getDataNotFound("Product"));

    return sendSuccess(res, "Product fetched successfully", { product });
  } catch (error) {
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};

export const getProducts = async (req: AuthRequest, res: Response) => {
  reqInfo(req);
  try {
    const { category, productType, companyId, search, page, limit, startDate, endDate } =
      req.query as Record<string, string | undefined>;
    const criteria: Record<string, unknown> = {
      isDeleted: false,
      ...getProductScopeFilter(req),
    };
    const options: Record<string, unknown> = { lean: true };

    if (category) criteria.category = category;
    if (productType) criteria.productType = productType;
    if (companyId) criteria.companyId = companyId;

    if (search) {
      criteria.$or = [
        { name: { $regex: search, $options: "si" } },
        { category: { $regex: search, $options: "si" } },
        { productType: { $regex: search, $options: "si" } },
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

    const populate = [
      { path: "companyId", select: "name companyName" },
      { path: "createdBy", select: "name email role medicalStoreId" },
    ];
    const [products, totalCount] = await Promise.all([
      findAllWithPopulateWithSorting(Product, criteria, {}, options, populate),
      countData(Product, criteria),
    ]);

    const stateObj = {
      page: parseInt(page || "") || 1,
      limit: parseInt(limit || "") || totalCount,
      page_limit: Math.ceil(totalCount / (parseInt(limit || "") || totalCount)) || 1,
    };

    return sendSuccess(res, "Products fetched successfully", {
      product_data: products,
      totalData: totalCount,
      state: stateObj,
    });
  } catch (error) {
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};

/* ================= UPDATE PRODUCT ================= */
export const updateProduct = async (req: AuthRequest, res: Response) => {
  reqInfo(req);
  try {
    if (!req.user) return sendUnauthorized(res, responseMessage.accessDenied);

    const criteria: Record<string, unknown> = {
      _id: req.params.id,
      isDeleted: false,
      ...getProductScopeFilter(req),
    };
    const product = await getFirstMatch(Product, criteria, "_id medicalStoreId", {});

    if (!product) return sendNotFound(res, responseMessage.getDataNotFound("Product"));

    const payload = { ...(req.body as Record<string, unknown>) };
    delete payload.medicalStoreId;

    if (req.user.role !== ROLE.ADMIN) {
      delete payload.companyId;
      delete payload.createdBy;
    }

    const targetMedicalStoreId = product.medicalStoreId ? String(product.medicalStoreId) : "";
    if (!targetMedicalStoreId) return sendError(res, responseMessage.medicalIdNotAssigned, null, StatusCode.BAD_REQUEST);

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

    const updatedProduct = await updateData(Product, criteria, payload, {});
    if (!updatedProduct) {
      return sendNotFound(res, responseMessage.getDataNotFound("Product"));
    }

    return sendSuccess(res, responseMessage.updateDataSuccess("Product"), {
      product: updatedProduct,
    });
  } catch (error) {
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};

/* ================= SOFT DELETE PRODUCT ================= */
export const deleteProduct = async (req: AuthRequest, res: Response) => {
  reqInfo(req);
  try {
    if (!req.user) return sendUnauthorized(res, responseMessage.accessDenied);

    const criteria: Record<string, unknown> = {
      _id: req.params.id,
      isDeleted: false,
      ...getProductScopeFilter(req),
    };

    const product = await getFirstMatch(Product, criteria, "_id", {});
    if (!product) {
      return sendNotFound(res, responseMessage.getDataNotFound("Product"));
    }

    const response = await updateData(Product, criteria, { isDeleted: true }, { new: true });
    if (!response) {
      return sendNotFound(res, responseMessage.getDataNotFound("Product"));
    }

    return sendSuccess(res, responseMessage.deleteDataSuccess("Product"), { product: response });
  } catch (error) {
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};
