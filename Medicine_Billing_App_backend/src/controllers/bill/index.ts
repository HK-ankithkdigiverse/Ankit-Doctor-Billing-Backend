import { Response } from "express";
import { Types } from "mongoose";
import { BillModel } from "../../database/models/bill";
import { BillItemModel } from "../../database/models/billItem";
import { Product } from "../../database/models/product";
import { CompanyModel } from "../../database/models/company";
import User from "../../database/models/auth";
import { ROLE, StatusCode } from "../../common";
import {
  applySearchFilter,
  countData,
  createData,
  findOneAndPopulate,
  getFirstMatch,
  getPagination,
  insertMany,
  responseMessage,
  sendError,
  sendNotFound,
  sendSuccess,
  sendUnauthorized,
} from "../../helper";
import { AuthRequest } from "../../middleware/auth";
import { BillInputItem, BillLineItem, CreateBillBody, UpdateBillBody } from "../../types";

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
const BILL_PRODUCT_SELECT_FIELDS = "_id name category mrp stock medicalStoreId createdBy";

const toId = (value: unknown) => String(value);

type QtyMapItem = Pick<BillInputItem, "productId" | "qty" | "freeQty">;
type BillProduct = {
  _id: Types.ObjectId;
  name: string;
  category?: string;
  mrp: number;
  stock: number;
  medicalStoreId?: Types.ObjectId;
  createdBy: Types.ObjectId;
};
type StockBulkOp = {
  updateOne: {
    filter: { _id: Types.ObjectId };
    update: { $inc: { stock: number } };
  };
};

const buildQtyMap = (items: QtyMapItem[]) => {
  const qtyMap = new Map<string, number>();

  for (const item of items) {
    const productId = toId(item.productId);
    const qty = Number(item.qty || 0);
    const freeQty = Number(item.freeQty || 0);
    const total = qty + freeQty;
    qtyMap.set(productId, (qtyMap.get(productId) || 0) + total);
  }

  return qtyMap;
};

const buildScopeFilter = (medicalStoreId: string) => ({ medicalStoreId });

const getProductMap = async (
  productIds: string[],
  medicalStoreId: string
) => {
  const products = await Product.find({
    _id: { $in: productIds },
    isDeleted: false,
    ...buildScopeFilter(medicalStoreId),
  })
    .select(BILL_PRODUCT_SELECT_FIELDS)
    .lean<BillProduct[]>();

  return new Map(products.map((product) => [toId(product._id), product]));
};

const getUserForBilling = async (userId: string) =>
  User.findOne({ _id: userId, isDeleted: false })
    .select("_id medicalStoreId")
    .lean<{ _id: Types.ObjectId; medicalStoreId?: Types.ObjectId } | null>();

const ensureCompanyAccess = async (
  companyId: string,
  medicalStoreId: string
) =>
  getFirstMatch(
    CompanyModel,
    {
      _id: companyId,
      isDeleted: false,
      ...buildScopeFilter(medicalStoreId),
    },
    "_id"
  );

const buildCreateStockOps = (requiredQtyMap: Map<string, number>): StockBulkOp[] =>
  [...requiredQtyMap.entries()].map(([productId, requiredQty]) => ({
    updateOne: {
      filter: { _id: new Types.ObjectId(productId) },
      update: { $inc: { stock: -requiredQty } },
    },
  }));

const buildUpdateStockOps = (
  allProductIds: string[],
  oldQtyMap: Map<string, number>,
  newQtyMap: Map<string, number>
): StockBulkOp[] =>
  allProductIds
    .map((productId) => {
      const incBy = (oldQtyMap.get(productId) || 0) - (newQtyMap.get(productId) || 0);
      if (incBy === 0) return null;
      return {
        updateOne: {
          filter: { _id: new Types.ObjectId(productId) },
          update: { $inc: { stock: incBy } },
        },
      };
    })
    .filter(Boolean) as StockBulkOp[];

const getStockError = (qtyMap: Map<string, number>, productMap: Map<string, BillProduct>) => {
  for (const [productId, requiredQty] of qtyMap.entries()) {
    const product = productMap.get(productId);
    if (!product) return responseMessage.productNotFound;
    if (Number(product.stock) < requiredQty) return responseMessage.insufficientStock;
  }
  return null;
};

const getStockErrorForUpdate = (
  allProductIds: string[],
  oldQtyMap: Map<string, number>,
  newQtyMap: Map<string, number>,
  productMap: Map<string, BillProduct>
) => {
  for (const productId of allProductIds) {
    const product = productMap.get(productId);
    if (!product) return responseMessage.productNotFound;
    const oldQty = oldQtyMap.get(productId) || 0;
    const newQty = newQtyMap.get(productId) || 0;
    if (Number(product.stock) + oldQty - newQty < 0) return responseMessage.insufficientStock;
  }
  return null;
};

const calculateBillItems = (items: BillInputItem[], productMap: Map<string, BillProduct>) => {
  let subTotal = 0;
  let totalTax = 0;
  const calculatedItems: BillLineItem[] = [];

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const product = productMap.get(toId(it.productId));
    if (!product) return null;

    const qty = Number(it.qty);
    const freeQty = Number(it.freeQty || 0);
    const rate = Number(it.rate);
    const taxPercent = Number(it.taxPercent || 0);
    const discountPercent = Number(it.discount || 0);

    const amount = rate * qty;
    const taxable = amount - (amount * discountPercent) / 100;
    const cgst = (taxable * taxPercent) / 200;
    const sgst = (taxable * taxPercent) / 200;
    const igst = cgst + sgst;
    const total = taxable + igst;

    subTotal += taxable;
    totalTax += igst;

    calculatedItems.push({
      srNo: i + 1,
      productId: product._id,
      productName: product.name,
      category: product.category || "",
      qty,
      freeQty,
      mrp: product.mrp,
      rate,
      taxPercent,
      cgst,
      sgst,
      igst,
      discount: discountPercent,
      total,
    });
  }

  return { calculatedItems, subTotal, totalTax };
};

const getDiscountedTotal = (
  subTotal: number,
  totalTax: number,
  discount: number,
  message: string
) => {
  const discountAmount = Number(discount || 0);
  const totalBeforeDiscount = subTotal + totalTax;
  if (discountAmount > totalBeforeDiscount) return { error: message };
  return { discountAmount, totalBeforeDiscount, grandTotal: totalBeforeDiscount - discountAmount };
};

const canAccessBill = (bill: any, req: AuthRequest) => {
  if (req.user?.role === ROLE.ADMIN) {
    return true;
  }

  if (!req.user) {
    return false;
  }

  return (
    Boolean(bill.medicalStoreId) &&
    String(bill.medicalStoreId) === String(req.user.medicalStoreId)
  );
};

const getBillMedicalContext = (bill: any) => {
  const medicalStoreId = bill.medicalStoreId ? String(bill.medicalStoreId) : "";
  if (!medicalStoreId) {
    return null;
  }

  return { medicalStoreId };
};

export const createBill = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?._id) {
      return sendUnauthorized(res, responseMessage.accessDenied);
    }

    const { companyId, items, discount = 0, userId: payloadUserId } = req.body as CreateBillBody;
    const isAdmin = req.user.role === ROLE.ADMIN;

    if (isAdmin && !payloadUserId) {
      return sendError(res, responseMessage.validationError("user"), null, StatusCode.BAD_REQUEST);
    }

    const targetUserId = isAdmin ? payloadUserId! : req.user._id;
    const targetUser = await getUserForBilling(targetUserId);

    if (!targetUser) {
      return sendError(res, responseMessage.getDataNotFound("User"), null, StatusCode.BAD_REQUEST);
    }

    const targetMedicalStoreId = targetUser.medicalStoreId
      ? String(targetUser.medicalStoreId)
      : "";
    if (!targetMedicalStoreId) {
      return sendError(res, responseMessage.medicalIdNotAssigned, null, StatusCode.BAD_REQUEST);
    }

    if (!(await ensureCompanyAccess(companyId, targetMedicalStoreId))) {
      return sendError(
        res,
        responseMessage.companyNotAvailableForSelectedUser,
        null,
        StatusCode.BAD_REQUEST
      );
    }

    const productIds = [...new Set(items.map((item) => toId(item.productId)))];
    const productMap = await getProductMap(productIds, targetMedicalStoreId);

    const requiredQtyMap = buildQtyMap(items);
    const stockError = getStockError(requiredQtyMap, productMap);
    if (stockError) return sendError(res, stockError, null, StatusCode.BAD_REQUEST);

    const calculation = calculateBillItems(items, productMap);
    if (!calculation) return sendError(res, responseMessage.productNotFound, null, StatusCode.BAD_REQUEST);
    const { calculatedItems, subTotal, totalTax } = calculation;

    const totals = getDiscountedTotal(subTotal, totalTax, discount, responseMessage.validationError("discount"));
    if ("error" in totals) return sendError(res, totals.error, null, StatusCode.BAD_REQUEST);
    const { discountAmount, grandTotal } = totals;

    const bill: any = await createData(BillModel, {
      billNo: `BILL-${Date.now()}`,
      medicalStoreId: targetMedicalStoreId,
      companyId,
      userId: targetUserId,
      subTotal,
      totalTax,
      discount: discountAmount,
      grandTotal,
    });

    await insertMany(
      BillItemModel,
      calculatedItems.map((item) => ({ ...item, billId: bill._id }))
    );

    const stockOps = buildCreateStockOps(requiredQtyMap);

    if (stockOps.length) {
      await Product.bulkWrite(stockOps);
    }

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
    });
  } catch (err: any) {
    console.error("CREATE BILL ERROR", { message: err?.message, err });
    return sendError(res, err.message || responseMessage.internalServerError, err, StatusCode.INTERNAL_ERROR);
  }
};

export const getAllBills = async (req: AuthRequest, res: Response) => {
  try {
    const { role, medicalStoreId } = req.user!;
    const { pageNum, limitNum, skip, searchText } = getPagination(req.query, {
      page: 1,
      limit: 10,
    });

    const filter: any = { isDeleted: false };

    if (role !== ROLE.ADMIN) {
      filter.medicalStoreId = medicalStoreId;
    }

    applySearchFilter(filter, searchText, ["billNo"]);

    const [bills, total] = await Promise.all([
      BillModel.find(filter)
        .populate("companyId", BILL_COMPANY_POPULATE_FIELDS)
        .populate("userId", BILL_USER_POPULATE_FIELDS)
        .populate("medicalStoreId", BILL_STORE_POPULATE_FIELDS)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      countData(BillModel, filter),
    ]);

    return sendSuccess(res, "Bills fetched successfully", {
      data: bills,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    return sendError(res, responseMessage.internalServerError, err, StatusCode.INTERNAL_ERROR);
  }
};

export const getBillById = async (req: AuthRequest, res: Response) => {
  try {
    const filter: any = {
      _id: req.params.id,
      isDeleted: false,
    };

    if (req.user?.role !== ROLE.ADMIN) {
      filter.medicalStoreId = req.user?.medicalStoreId;
    }

    const bill: any = await findOneAndPopulate(
      BillModel,
      filter,
      undefined,
      undefined,
      BILL_POPULATE_OPTIONS
    );

    if (!bill) {
      return sendNotFound(res, responseMessage.invoiceNotFound);
    }

    const items = await BillItemModel.find({ billId: bill._id }).lean();

    return sendSuccess(res, "Bill fetched successfully", { bill, items });
  } catch {
    return sendError(res, responseMessage.internalServerError, null, StatusCode.INTERNAL_ERROR);
  }
};

export const deleteBill = async (req: AuthRequest, res: Response) => {
  try {
    const bill: any = await BillModel.findById(req.params.id).select("_id userId medicalStoreId isDeleted");
    if (!bill || bill.isDeleted) return sendNotFound(res, responseMessage.invoiceNotFound);

    if (!canAccessBill(bill, req)) {
      return sendError(res, responseMessage.accessDenied, null, StatusCode.FORBIDDEN);
    }

    bill.isDeleted = true;
    await bill.save();

    return sendSuccess(res, responseMessage.deleteDataSuccess("Bill"));
  } catch (err) {
    return sendError(res, responseMessage.internalServerError, err, StatusCode.INTERNAL_ERROR);
  }
};

export const updateBill = async (req: AuthRequest, res: Response) => {
  try {
    const bill: any = await BillModel.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    if (!bill) return sendNotFound(res, responseMessage.invoiceNotFound);

    if (!canAccessBill(bill, req)) {
      return sendError(res, responseMessage.accessDenied, null, StatusCode.FORBIDDEN);
    }

    const { companyId, items, discount, userId: payloadUserId } = req.body as UpdateBillBody;

    if (payloadUserId !== undefined) {
      if (req.user?.role !== ROLE.ADMIN) {
        return sendError(res, responseMessage.accessDenied, null, StatusCode.FORBIDDEN);
      }

      const updatedBillUser = await getUserForBilling(payloadUserId);
      if (!updatedBillUser) {
        return sendError(res, responseMessage.getDataNotFound("User"), null, StatusCode.BAD_REQUEST);
      }

      const updatedBillMedicalStoreId = updatedBillUser.medicalStoreId
        ? String(updatedBillUser.medicalStoreId)
        : "";
      if (!updatedBillMedicalStoreId) {
        return sendError(res, responseMessage.medicalIdNotAssigned, null, StatusCode.BAD_REQUEST);
      }

      bill.userId = payloadUserId;
      bill.medicalStoreId = updatedBillMedicalStoreId;
    }

    const billContext = getBillMedicalContext(bill);
    if (!billContext) {
      return sendError(res, responseMessage.medicalIdNotAssigned, null, StatusCode.BAD_REQUEST);
    }

    if (companyId) {
      if (!(await ensureCompanyAccess(companyId, billContext.medicalStoreId))) {
        return sendError(res, responseMessage.companyNotAvailableForSelectedUser, null, StatusCode.BAD_REQUEST);
      }
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
      const { calculatedItems, subTotal, totalTax } = calculation;

      await BillItemModel.deleteMany({ billId: bill._id });
      await insertMany(
        BillItemModel,
        calculatedItems.map((item) => ({ ...item, billId: bill._id }))
      );

      const stockOps = buildUpdateStockOps(allProductIds, oldQtyMap, newQtyMap);

      if (stockOps.length) {
        await Product.bulkWrite(stockOps);
      }

      bill.subTotal = subTotal;
      bill.totalTax = totalTax;
    }

    const totals = getDiscountedTotal(
      Number(bill.subTotal || 0),
      Number(bill.totalTax || 0),
      Number(discount ?? bill.discount ?? 0),
      responseMessage.discountCannotExceedBillAmount
    );
    if ("error" in totals) return sendError(res, totals.error, null, StatusCode.BAD_REQUEST);

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
    });
  } catch {
    return sendError(res, responseMessage.internalServerError, null, StatusCode.INTERNAL_ERROR);
  }
};
