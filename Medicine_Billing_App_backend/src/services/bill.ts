import { Types } from "mongoose";
import { Product } from "../database/models/product";
import { CompanyModel } from "../database/models/company";
import { MedicalStoreModel } from "../database/models/medicalStore";
import User from "../database/models/auth";
import { GST_TYPE } from "../common";
import { responseMessage } from "../helper";
import { BillInputItem, BillLineItem } from "../types";

const BILL_PRODUCT_SELECT_FIELDS = "_id name category mrp price stock medicalStoreId createdBy";

export const toId = (value: unknown) => String(value);
const roundCurrency = (value: number) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

export const normalizeStoreGstType = (gstType: unknown): GST_TYPE =>
  String(gstType) === GST_TYPE.IGST ? GST_TYPE.IGST : GST_TYPE.CGST_SGST;

type QtyMapItem = Pick<BillInputItem, "productId" | "qty" | "freeQty">;

type BillProduct = {
  _id: Types.ObjectId;
  name: string;
  category?: string;
  mrp: number;
  price: number;
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

type BillTotals = {
  discountAmount: number;
  taxableAmount: number;
  gstPercent: number;
  totalTax: number;
  cgst: number;
  sgst: number;
  igst: number;
  grandTotal: number;
};

const buildScopeFilter = (medicalStoreId: string) => ({ medicalStoreId });

export const buildQtyMap = (items: QtyMapItem[]) => {
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

export const getProductMap = async (productIds: string[], medicalStoreId: string) => {
  const products = await Product.find({
    _id: { $in: productIds },
    isDeleted: false,
    ...buildScopeFilter(medicalStoreId),
  })
    .select(BILL_PRODUCT_SELECT_FIELDS)
    .lean<BillProduct[]>();

  return new Map(products.map((product) => [toId(product._id), product]));
};

export const getUserForBilling = async (userId: string) =>
  User.findOne({ _id: userId, isDeleted: false })
    .select("_id medicalStoreId")
    .lean<{ _id: Types.ObjectId; medicalStoreId?: Types.ObjectId } | null>();

export const getMedicalStoreForBilling = async (medicalStoreId: string) =>
  MedicalStoreModel.findOne({
    _id: medicalStoreId,
    isDeleted: false,
  })
    .select("_id gstType gstPercent")
    .lean<{ _id: Types.ObjectId; gstType?: string; gstPercent?: number } | null>();

export const getCompanyForBilling = async (companyId: string, medicalStoreId: string) =>
  CompanyModel.findOne({
    _id: companyId,
    isDeleted: false,
    ...buildScopeFilter(medicalStoreId),
  })
    .select("_id isActive")
    .lean<{ _id: Types.ObjectId; isActive?: boolean } | null>();

export const buildCreateStockOps = (requiredQtyMap: Map<string, number>): StockBulkOp[] =>
  [...requiredQtyMap.entries()].map(([productId, requiredQty]) => ({
    updateOne: {
      filter: { _id: new Types.ObjectId(productId) },
      update: { $inc: { stock: -requiredQty } },
    },
  }));

export const buildUpdateStockOps = (
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

export const getStockError = (
  qtyMap: Map<string, number>,
  productMap: Map<string, BillProduct>
) => {
  for (const [productId, requiredQty] of qtyMap.entries()) {
    const product = productMap.get(productId);
    if (!product) return responseMessage.productNotFound;
    if (Number(product.stock) < requiredQty) return responseMessage.insufficientStock;
  }
  return null;
};

export const getStockErrorForUpdate = (
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

export const calculateBillItems = (items: BillInputItem[], productMap: Map<string, BillProduct>) => {
  let subTotal = 0;
  const calculatedItems: BillLineItem[] = [];

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const product = productMap.get(toId(it.productId));
    if (!product) return null;

    const qty = Number(it.qty);
    const freeQty = Number(it.freeQty || 0);
    const rate = Number(product.price || 0);
    const total = roundCurrency(rate * qty);

    subTotal = roundCurrency(subTotal + total);

    calculatedItems.push({
      srNo: i + 1,
      productId: product._id,
      productName: product.name,
      category: product.category || "",
      qty,
      freeQty,
      mrp: product.mrp,
      rate,
      total,
    });
  }

  return { calculatedItems, subTotal };
};

export const calculateBillTotals = (
  subTotal: number,
  discount: number,
  gstPercent: number,
  gstType: GST_TYPE,
  message: string
): BillTotals | { error: string } => {
  const normalizedSubTotal = roundCurrency(Number(subTotal || 0));
  const discountAmount = roundCurrency(Number(discount || 0));
  const normalizedGstPercent = Number(gstPercent || 0);

  if (discountAmount > normalizedSubTotal) return { error: message };

  const taxableAmount = roundCurrency(normalizedSubTotal - discountAmount);
  const totalTax = roundCurrency((taxableAmount * normalizedGstPercent) / 100);

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (gstType === GST_TYPE.IGST) {
    igst = totalTax;
  } else {
    cgst = roundCurrency(totalTax / 2);
    sgst = roundCurrency(totalTax - cgst);
  }

  return {
    discountAmount,
    taxableAmount,
    gstPercent: normalizedGstPercent,
    totalTax,
    cgst,
    sgst,
    igst,
    grandTotal: roundCurrency(taxableAmount + totalTax),
  };
};

export const buildBillTotalsSummary = (bill: any) => {
  const gstType = normalizeStoreGstType(bill?.gstType);
  const subTotal = roundCurrency(Number(bill?.subTotal || 0));
  const discountAmount = roundCurrency(Number(bill?.discount || 0));
  const taxableAmount =
    bill?.taxableAmount !== undefined
      ? roundCurrency(Number(bill.taxableAmount))
      : roundCurrency(subTotal - discountAmount);
  const totalTax = roundCurrency(Number(bill?.totalTax || 0));
  const cgst =
    bill?.cgst !== undefined
      ? roundCurrency(Number(bill.cgst))
      : gstType === GST_TYPE.CGST_SGST
        ? roundCurrency(totalTax / 2)
        : 0;
  const sgst =
    bill?.sgst !== undefined
      ? roundCurrency(Number(bill.sgst))
      : gstType === GST_TYPE.CGST_SGST
        ? roundCurrency(totalTax - cgst)
        : 0;
  const igst =
    bill?.igst !== undefined
      ? roundCurrency(Number(bill.igst))
      : gstType === GST_TYPE.IGST
        ? totalTax
        : 0;

  return {
    subtotal: subTotal,
    discountAmount,
    taxableAmount,
    gstType,
    gstPercent: Number(bill?.gstPercent || 0),
    igst,
    cgst,
    sgst,
    finalPayableAmount: roundCurrency(Number(bill?.grandTotal || taxableAmount + totalTax)),
  };
};

export const getBillMedicalContext = (bill: any) => {
  const medicalStoreId = bill.medicalStoreId ? String(bill.medicalStoreId) : "";
  if (!medicalStoreId) {
    return null;
  }

  return { medicalStoreId };
};
