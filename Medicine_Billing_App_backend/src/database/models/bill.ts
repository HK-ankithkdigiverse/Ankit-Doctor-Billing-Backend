import mongoose from "mongoose";
import { GST_TYPE, MODEL } from "../../common";

const billSchema = new mongoose.Schema(
  {
    billNo: { type: String, required: true, unique: true },
    medicalStoreId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: MODEL.MEDICAL_STORE,
      required: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: MODEL.COMPANY,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: MODEL.USER,
      required: true,
    },
    gstType: {
      type: String,
      enum: Object.values(GST_TYPE),
      default: GST_TYPE.CGST_SGST,
      required: true,
    },
    gstPercent: { type: Number, default: 0 },
    subTotal: { type: Number, required: true },
    taxableAmount: { type: Number, required: true },
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
    totalTax: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const BillModel = mongoose.model(MODEL.BILL, billSchema);
