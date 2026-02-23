import mongoose from "mongoose";
import { MODEL } from "../../common";

const billSchema = new mongoose.Schema(
  {
    billNo: { type: String, required: true, unique: true },

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

    subTotal: { type: Number, required: true },
    totalTax: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const BillModel = mongoose.model(MODEL.BILL, billSchema);
