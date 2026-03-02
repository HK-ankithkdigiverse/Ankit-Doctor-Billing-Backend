import mongoose from "mongoose";
import { MODEL } from "../../common";

export interface Product extends mongoose.Document {
  name: string;
  category: string;
  productType: string;
  medicalStoreId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  price: number;
  mrp: number;
  stock: number;
  isActive: boolean;
  isDeleted: boolean;
}

const productSchema = new mongoose.Schema<Product>({
  name: { type: String, required: true },
  category: { type: String, required: true },
  productType: { type: String, required: true },
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
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: MODEL.USER,
    required: true,
  },
  mrp: { type: Number, required: true },
  price: { type: Number, required: true },
  stock: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
});

export const Product = mongoose.model<Product>(
  MODEL.PRODUCT,
  productSchema
);
