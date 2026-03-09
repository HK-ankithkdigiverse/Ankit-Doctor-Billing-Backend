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
  findAllWithPopulateWithSorting,
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
    const {
      search,
      companyId,
      medicalStoreId: selectedMedicalStoreId,
      startDate,
      endDate,
      page,
      limit,
    } = req.query as Record<string, string | undefined>;

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
    const selectedBillCriteria: Record<string, unknown> = { isDeleted: false };

    if (!isAdmin) {
      medicalStoreCriteria._id = medicalStoreId;
      scopeCriteria.medicalStoreId = medicalStoreId;
      userCriteria.medicalStoreId = medicalStoreId;
      billAmountMatchCriteria.medicalStoreId = new Types.ObjectId(medicalStoreId);
      selectedBillCriteria.medicalStoreId = medicalStoreId;
    } else if (selectedMedicalStoreId) {
      if (!Types.ObjectId.isValid(selectedMedicalStoreId)) {
        return sendError(
          res,
          responseMessage.validationError("medical store id"),
          null,
          StatusCode.BAD_REQUEST
        );
      }
      selectedBillCriteria.medicalStoreId = selectedMedicalStoreId;
    }

    if (companyId) {
      if (!Types.ObjectId.isValid(companyId)) {
        return sendError(
          res,
          responseMessage.validationError("company id"),
          null,
          StatusCode.BAD_REQUEST
        );
      }
      selectedBillCriteria.companyId = companyId;
    }

    if (search) {
      selectedBillCriteria.billNo = { $regex: search, $options: "si" };
    }

    if (startDate || endDate) {
      const createdAtFilter: Record<string, Date> = {};
      if (startDate) {
        const parsedStartDate = new Date(startDate);
        if (Number.isNaN(parsedStartDate.getTime())) {
          return sendError(
            res,
            responseMessage.validationError("start date"),
            null,
            StatusCode.BAD_REQUEST
          );
        }
        createdAtFilter.$gte = parsedStartDate;
      }
      if (endDate) {
        const parsedEndDate = new Date(endDate);
        if (Number.isNaN(parsedEndDate.getTime())) {
          return sendError(
            res,
            responseMessage.validationError("end date"),
            null,
            StatusCode.BAD_REQUEST
          );
        }
        createdAtFilter.$lte = parsedEndDate;
      }
      if (
        createdAtFilter.$gte &&
        createdAtFilter.$lte &&
        createdAtFilter.$gte > createdAtFilter.$lte
      ) {
        return sendError(res, "Start date cannot be greater than end date.", null, StatusCode.BAD_REQUEST);
      }
      selectedBillCriteria.createdAt = createdAtFilter;
    }

    const parsedPage = Math.max(1, parseInt(page || "1", 10) || 1);
    const parsedLimit = Math.max(1, parseInt(limit || "10", 10) || 10);
    const selectedBillOptions = {
      sort: { createdAt: -1 },
      skip: (parsedPage - 1) * parsedLimit,
      limit: parsedLimit,
      lean: true,
    };

    const [
      totalMedicalStores,
      totalMedicines,
      totalCompanies,
      totalCategories,
      totalUsers,
      totalBills,
      totalBillAmountResult,
      filteredBills,
      totalFilteredBills,
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
      findAllWithPopulateWithSorting(
        BillModel,
        selectedBillCriteria,
        "billNo companyId grandTotal createdAt",
        selectedBillOptions,
        [{ path: "companyId", select: "name companyName" }]
      ),
      countData(BillModel, selectedBillCriteria),
    ]);

    const totalBillAmount = Number(totalBillAmountResult?.[0]?.totalBillAmount || 0);
    const selectedBillsState = {
      page: parsedPage,
      limit: parsedLimit,
      page_limit: Math.max(1, Math.ceil(totalFilteredBills / parsedLimit)),
    };

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
      billsBySelectedFilters: {
        bill_data: filteredBills.map((bill: any) => ({
          _id: bill._id,
          billNo: bill.billNo,
          company: bill.companyId?.name || bill.companyId?.companyName || "",
          totalAmount: Number(bill.grandTotal || 0),
          createdAt: bill.createdAt,
        })),
        totalData: totalFilteredBills,
        state: selectedBillsState,
      },
    });
  } catch (error) {
    return sendError(res, responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR);
  }
};
