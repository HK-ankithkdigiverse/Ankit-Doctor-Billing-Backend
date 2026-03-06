import { Response } from "express";
import { Types } from "mongoose";
import { BillModel,Product,BillItemModel } from "../../database";
import { ROLE, StatusCode } from "../../common";
import {countData,createData,findAllWithPopulateWithSorting,findOneAndPopulate,insertMany,isDataExists,reqInfo,responseMessage,sendError,sendNotFound,sendSuccess,sendUnauthorized,updateData,} from "../../helper";
import { AuthRequest } from "../../middleware/auth";
import { CreateBillBody, UpdateBillBody } from "../../types";
import {buildBillTotalsSummary,buildCreateStockOps,buildQtyMap,buildUpdateStockOps,calculateBillItems,calculateBillTotals,getBillMedicalContext,getCompanyForBilling,getMedicalStoreForBilling,getProductMap,getStockError,getStockErrorForUpdate,getUserForBilling,normalizeStoreGstType,toId,} from "../../services/bill";

const BILL_USER_POPULATE_FIELDS = [
  "name",
  "email",
  "signature",
  "role",
  "medicalStoreId",
].join(" ");
const BILL_STORE_POPULATE_FIELDS = [
  "name",
  "phone",
  "address",
  "state",
  "city",
  "pincode",
  "gstNumber",
  "gstType",
  "panCardNumber",
  "isActive",
].join(" ");
const BILL_COMPANY_POPULATE_FIELDS =
  "name companyName gstNumber logo address phone email state";
const BILL_POPULATE_OPTIONS = [
  { path: "companyId", select: BILL_COMPANY_POPULATE_FIELDS },
  { path: "userId", select: BILL_USER_POPULATE_FIELDS },
  { path: "medicalStoreId", select: BILL_STORE_POPULATE_FIELDS },
];

export const createBill = async (req: AuthRequest, res: Response) => {
  reqInfo(req);
  let body = req.body as CreateBillBody;
  try {
    if (!req.user) return sendUnauthorized(res, responseMessage.accessDenied);
  

    const isAdmin = req.user.role === ROLE.ADMIN;
    if (!isAdmin) body.userId = req.user._id;
    
    const payloadUserId = body.userId;

    if (isAdmin && !payloadUserId) return sendError(res, responseMessage.validationError("user"), null, StatusCode.BAD_REQUEST);
    

    const { companyId, items, discount = 0, gstPercent = 0 } = body;
    const targetUserId = String(payloadUserId);
    const targetUser = await getUserForBilling(targetUserId);

    if (!targetUser) return sendError(res, responseMessage.getDataNotFound("User"), null, StatusCode.BAD_REQUEST);
    

    const targetMedicalStoreId = targetUser.medicalStoreId
      ? String(targetUser.medicalStoreId)
      : "";
    if (!targetMedicalStoreId) return sendError(res, responseMessage.medicalIdNotAssigned, null, StatusCode.BAD_REQUEST);
    

    const medicalStore = await getMedicalStoreForBilling(targetMedicalStoreId);
    if (!medicalStore) {
      return sendError(
        res,
        responseMessage.getDataNotFound("Medical Store"),
        null,
        StatusCode.BAD_REQUEST
      );
    }
    const gstType = normalizeStoreGstType(medicalStore.gstType);

    const companyForBilling = await getCompanyForBilling(companyId, targetMedicalStoreId);
    if (!companyForBilling) {
      return sendError(
        res,
        responseMessage.companyNotAvailableForSelectedUser,
        null,
        StatusCode.BAD_REQUEST
      );
    }
    if (companyForBilling.isActive === false) return sendError(res, responseMessage.companyInactive, null, StatusCode.BAD_REQUEST);
    
    const productIds = [...new Set(items.map((item) => toId(item.productId)))];
    const productMap = await getProductMap(productIds, targetMedicalStoreId);

    const requiredQtyMap = buildQtyMap(items);
    const stockError = getStockError(requiredQtyMap, productMap);
    if (stockError) return sendError(res, stockError, null, StatusCode.BAD_REQUEST);

    const calculation = calculateBillItems(items, productMap);
    if (!calculation) return sendError(res, responseMessage.productNotFound, null, StatusCode.BAD_REQUEST);
    const { calculatedItems, subTotal } = calculation;

    const totals = calculateBillTotals(
      subTotal,
      discount,
      gstPercent,
      gstType,
      responseMessage.discountCannotExceedBillAmount
    );
    if ("error" in totals) return sendError(res, totals.error, null, StatusCode.BAD_REQUEST);

    let billNo = "";
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const candidate = `BILL-${Date.now()}-${attempt}`;
      const existingBill = await isDataExists(BillModel, { billNo: candidate });
      if (!existingBill) {
        billNo = candidate;
        break;
      }
    }
    if (!billNo) {
      return sendError(res, responseMessage.dataAlreadyExist("Bill"), null, StatusCode.BAD_REQUEST);
    }

    const bill: any = await createData(BillModel, {
      billNo,
      medicalStoreId: targetMedicalStoreId,
      companyId,
      userId: targetUserId,
      gstType,
      gstPercent: totals.gstPercent,
      subTotal,
      taxableAmount: totals.taxableAmount,
      cgst: totals.cgst,
      sgst: totals.sgst,
      igst: totals.igst,
      totalTax: totals.totalTax,
      discount: totals.discountAmount,
      grandTotal: totals.grandTotal,
    });

    await insertMany(
      BillItemModel,
      calculatedItems.map((item) => ({ ...item, billId: bill._id }))
    );

    const stockOps = buildCreateStockOps(requiredQtyMap);

    if (stockOps.length) await Product.bulkWrite(stockOps);
    

    const populatedBill = await findOneAndPopulate(
      BillModel,
      { _id: bill._id, isDeleted: false },
      undefined,
      undefined,
      BILL_POPULATE_OPTIONS
    );
    const createdItems = await BillItemModel.find({ billId: bill._id }).lean();

    return sendSuccess(res, responseMessage.invoiceCreated, {
      bill: populatedBill,
      items: createdItems,
      totals: buildBillTotalsSummary(populatedBill || bill),
    });
  } catch (err: any) {
    console.error("CREATE BILL ERROR", { message: err?.message, err });
    return sendError(res, err.message || responseMessage.internalServerError, err, StatusCode.INTERNAL_ERROR);
  }
};

export const getAllBills = async (req: AuthRequest, res: Response) => {
  reqInfo(req);
  try {
    if (!req.user) {
      return sendUnauthorized(res, responseMessage.accessDenied);
    }

    const { page, limit, search, startDate, endDate } = req.query as Record<string, string | undefined>;
    const criteria: Record<string, unknown> = { isDeleted: false };
    const options: Record<string, unknown> = { lean: true };

    if (req.user.role !== ROLE.ADMIN) criteria.medicalStoreId = req.user.medicalStoreId;
    

    if (search) criteria.$or = [{ billNo: { $regex: search, $options: "si" } }];
  

    if (startDate && endDate)criteria.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
  

    options.sort = { createdAt: -1 };
    if (page && limit) {
      options.skip = (parseInt(page) - 1) * parseInt(limit);
      options.limit = parseInt(limit);
    }

    const [billRows, totalCount] = await Promise.all([
      findAllWithPopulateWithSorting(BillModel, criteria, {}, options, BILL_POPULATE_OPTIONS),
      countData(BillModel, criteria),
    ]);

    const stateObj = {
      page: parseInt(page || "") || 1,
      limit: parseInt(limit || "") || totalCount,
      page_limit: Math.ceil(totalCount / (parseInt(limit || "") || totalCount)) || 1,
    };

    return sendSuccess(res, "Bills fetched successfully", {
      bill_data: billRows.map((bill: any) => ({
        ...bill,
        totals: buildBillTotalsSummary(bill),
      })),
      totalData: totalCount,
      state: stateObj,
    });
  } catch (err) {
    return sendError(res, responseMessage.internalServerError, err, StatusCode.INTERNAL_ERROR);
  }
};

export const getBillById = async (req: AuthRequest, res: Response) => {
  reqInfo(req);
  try {
    if (!req.user) return sendUnauthorized(res, responseMessage.accessDenied);
    
    const criteria: any = {
      _id: req.params.id,
      isDeleted: false,
    };

    if (req.user.role !== ROLE.ADMIN) criteria.medicalStoreId = req.user.medicalStoreId;
  
    const response: any = await findOneAndPopulate(
      BillModel,
      criteria,
      undefined,
      undefined,
      BILL_POPULATE_OPTIONS
    );

    if (!response) return sendNotFound(res, responseMessage.invoiceNotFound);
    const items = await BillItemModel.find({ billId: response._id }).lean();

    return sendSuccess(res, "Bill fetched successfully", {
      bill: response,
      items,
      totals: buildBillTotalsSummary(response),
    });
  } catch {
    return sendError(res, responseMessage.internalServerError, null, StatusCode.INTERNAL_ERROR);
  }
};

export const deleteBill = async (req: AuthRequest, res: Response) => {
  reqInfo(req);
  try {
    if (!req.user) return sendUnauthorized(res, responseMessage.accessDenied);
  

    const criteria: Record<string, unknown> = {
      _id: req.params.id,
      isDeleted: false,
    };
    if (req.user.role !== ROLE.ADMIN)criteria.medicalStoreId = req.user.medicalStoreId;

    const response = await updateData(BillModel, criteria, { isDeleted: true }, { new: true });
    if (!response) return sendNotFound(res, responseMessage.invoiceNotFound);

    return sendSuccess(res, responseMessage.deleteDataSuccess("Bill"), { bill: response });
  } catch (err) {
    return sendError(res, responseMessage.internalServerError, err, StatusCode.INTERNAL_ERROR);
  }
};

export const updateBill = async (req: AuthRequest, res: Response) => {
  reqInfo(req);
  try {
    if (!req.user) return sendUnauthorized(res, responseMessage.accessDenied);

    const criteria: Record<string, unknown> = {
      _id: req.params.id,
      isDeleted: false,
    };
    if (req.user.role !== ROLE.ADMIN)criteria.medicalStoreId = req.user.medicalStoreId;

    const bill: any = await BillModel.findOne(criteria);

    if (!bill) return sendNotFound(res, responseMessage.invoiceNotFound);

    const {
      companyId,
      items,
      discount,
      gstPercent,
      userId: payloadUserId,
    } = req.body as UpdateBillBody;

    if (payloadUserId !== undefined) {
      if (req.user?.role !== ROLE.ADMIN) return sendError(res, responseMessage.accessDenied, null, StatusCode.FORBIDDEN);
      
      const updatedBillUser = await getUserForBilling(payloadUserId);
      if (!updatedBillUser) return sendError(res, responseMessage.getDataNotFound("User"), null, StatusCode.BAD_REQUEST);
      
      const updatedBillMedicalStoreId = updatedBillUser.medicalStoreId
        ? String(updatedBillUser.medicalStoreId)
        : "";
      if (!updatedBillMedicalStoreId) return sendError(res, responseMessage.medicalIdNotAssigned, null, StatusCode.BAD_REQUEST);
    

      bill.userId = payloadUserId;
      bill.medicalStoreId = updatedBillMedicalStoreId;
    }

    const billContext = getBillMedicalContext(bill);
    if (!billContext)return sendError(res, responseMessage.medicalIdNotAssigned, null, StatusCode.BAD_REQUEST);
  
    const medicalStore = await getMedicalStoreForBilling(billContext.medicalStoreId);
    if (!medicalStore) {
      return sendError(
        res,
        responseMessage.getDataNotFound("Medical Store"),
        null,
        StatusCode.BAD_REQUEST
      );
    }
    const billGstType = normalizeStoreGstType(medicalStore.gstType);
    bill.gstType = billGstType;

    if (companyId) {
      const companyForBilling = await getCompanyForBilling(companyId, billContext.medicalStoreId);
      if (!companyForBilling) return sendError(res, responseMessage.companyNotAvailableForSelectedUser, null, StatusCode.BAD_REQUEST);
      
      if (companyForBilling.isActive === false) return sendError(res, responseMessage.companyInactive, null, StatusCode.BAD_REQUEST);
      bill.companyId = companyId;
    }

    if (Array.isArray(items) && items.length > 0) {
      const previousItems = await BillItemModel.find({ billId: bill._id }).lean<
        Array<{ productId: Types.ObjectId; qty: number; freeQty?: number }>
      >();

      const oldQtyMap = buildQtyMap(
        previousItems.map((item) => ({
          productId: toId(item.productId),
          qty: Number(item.qty || 0),
          freeQty: Number(item.freeQty || 0),
        }))
      );
      const newQtyMap = buildQtyMap(items);

      const allProductIds = [...new Set([...oldQtyMap.keys(), ...newQtyMap.keys()])];
      const productMap = await getProductMap(
        allProductIds,
        billContext.medicalStoreId
      );

      const updateStockError = getStockErrorForUpdate(allProductIds, oldQtyMap, newQtyMap, productMap);
      if (updateStockError) return sendError(res, updateStockError, null, StatusCode.BAD_REQUEST);

      const calculation = calculateBillItems(items, productMap);
      if (!calculation) return sendError(res, responseMessage.productNotFound, null, StatusCode.BAD_REQUEST);
      const { calculatedItems, subTotal } = calculation;

      await BillItemModel.deleteMany({ billId: bill._id });
      await insertMany(
        BillItemModel,
        calculatedItems.map((item) => ({ ...item, billId: bill._id }))
      );

      const stockOps = buildUpdateStockOps(allProductIds, oldQtyMap, newQtyMap);

      if (stockOps.length) await Product.bulkWrite(stockOps);
      

      bill.subTotal = subTotal;
    }

    const totals = calculateBillTotals(
      Number(bill.subTotal || 0),
      Number(discount ?? bill.discount ?? 0),
      Number(gstPercent ?? bill.gstPercent ?? 0),
      billGstType,
      responseMessage.discountCannotExceedBillAmount
    );
    if ("error" in totals) return sendError(res, totals.error, null, StatusCode.BAD_REQUEST);

    bill.gstPercent = totals.gstPercent;
    bill.taxableAmount = totals.taxableAmount;
    bill.cgst = totals.cgst;
    bill.sgst = totals.sgst;
    bill.igst = totals.igst;
    bill.totalTax = totals.totalTax;
    bill.discount = totals.discountAmount;
    bill.grandTotal = totals.grandTotal;

    await bill.save();

    const populatedBill = await findOneAndPopulate(
      BillModel,
      { _id: bill._id, isDeleted: false },
      undefined,
      undefined,
      BILL_POPULATE_OPTIONS
    );
    const updatedItems = await BillItemModel.find({ billId: bill._id }).lean();

    return sendSuccess(res, responseMessage.updateDataSuccess("Bill"), {
      bill: populatedBill,
      items: updatedItems,
      totals: buildBillTotalsSummary(populatedBill || bill),
    });
  } catch {
    return sendError(res, responseMessage.internalServerError, null, StatusCode.INTERNAL_ERROR);
  }
};
