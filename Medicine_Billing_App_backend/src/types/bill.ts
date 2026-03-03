import { Types } from "mongoose";

export interface BillInputItem {
  productId: string;
  qty: number;
  freeQty?: number;
}

export interface BillLineItem {
  billId?: Types.ObjectId;
  srNo: number;
  productId: Types.ObjectId;
  productName: string;
  category: string;
  qty: number;
  freeQty: number;
  mrp: number;
  rate: number;
  total: number;
}

export interface CreateBillBody {
  companyId: string;
  items: BillInputItem[];
  gstPercent?: number;
  discount?: number;
  userId?: string;
}

export interface UpdateBillBody {
  companyId?: string;
  items?: BillInputItem[];
  gstPercent?: number;
  discount?: number;
  userId?: string;
}
