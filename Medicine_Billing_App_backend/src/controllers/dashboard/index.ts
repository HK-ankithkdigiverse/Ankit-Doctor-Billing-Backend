import { Response } from "express";
import { Types } from "mongoose";
import User from "../../database/models/auth";
import { BillModel } from "../../database/models/bill";
import { CategoryModel } from "../../database/models/category";
import { CompanyModel } from "../../database/models/company";
import { MedicalStoreModel } from "../../database/models/medicalStore";
import { Product } from "../../database/models/product";
import { ROLE, StatusCode } from "../../common";
import {
  countData,
  reqInfo,
  responseMessage,
  sendError,
  sendSuccess,
  sendUnauthorized,
} from "../../helper";
import { AuthRequest } from "../../middleware/auth";

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  reqInfo(req);
  try {
    if (!req.user) {
      return sendUnauthorized(res, responseMessage.accessDenied);
    }

    const isAdmin = req.user.role === ROLE.ADMIN;
    const medicalStoreId = req.user.medicalStoreId ? String(req.user.medicalStoreId) : "";

    if (!isAdmin && !medicalStoreId) {
      return sendError(
        res,
        responseMessage.medicalIdNotAssigned,
        null,
        StatusCode.BAD_REQUEST
      );
    }

    const medicalStoreCriteria: Record<string, unknown> = { isDeleted: false };
    const scopeCriteria: Record<string, unknown> = { isDeleted: false };
    const userCriteria: Record<string, unknown> = { isDeleted: false };
    const billAmountMatchCriteria: Record<string, unknown> = { isDeleted: false };

    if (!isAdmin) {
      medicalStoreCriteria._id = medicalStoreId;
      scopeCriteria.medicalStoreId = medicalStoreId;
      userCriteria.medicalStoreId = medicalStoreId;
      billAmountMatchCriteria.medicalStoreId = new Types.ObjectId(medicalStoreId);
    }

    const [
      totalMedicalStores,
      totalMedicines,
      totalCompanies,
      totalCategories,
      totalUsers,
      totalBills,
      totalBillAmountResult,
    ] = await Promise.all([
      countData(MedicalStoreModel, medicalStoreCriteria),
      countData(Product, scopeCriteria),
      countData(CompanyModel, scopeCriteria),
      countData(CategoryModel, scopeCriteria),
      countData(User, userCriteria),
      countData(BillModel, scopeCriteria),
      BillModel.aggregate([
        { $match: billAmountMatchCriteria },
        { $group: { _id: null, totalBillAmount: { $sum: "$grandTotal" } } },
      ]),
    ]);

    const totalBillAmount = Number(totalBillAmountResult?.[0]?.totalBillAmount || 0);

    return sendSuccess(res, "Dashboard stats fetched successfully", {
      dashboard: {
        totalMedicalStores,
        totalMedicines,
        totalCompanies,
        totalCategories,
        totalUsers,
        totalBills,
        totalBillAmount,
      },
    });
  } catch (error) {
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};
