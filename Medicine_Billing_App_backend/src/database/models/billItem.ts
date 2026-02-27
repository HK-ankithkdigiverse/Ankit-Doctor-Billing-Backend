import mongoose from "mongoose";
import { MODEL } from "../../common";

const billItemSchema = new mongoose.Schema(
  {
    billId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: MODEL.BILL,
      required: true,
    },

    srNo: { type: Number, required: true },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: MODEL.PRODUCT,
      required: true,
    },

    productName: { type: String, required: true },
    category: { type: String, required: true },

    qty: { type: Number, required: true },
    freeQty: { type: Number, default: 0 },

    mrp: { type: Number, required: true },
    rate: { type: Number, required: true },

    taxPercent: { type: Number, default: 0 },
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },

    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
  },
  { timestamps: true }
);

export const BillItemModel = mongoose.model(MODEL.BILL_ITEM, billItemSchema);