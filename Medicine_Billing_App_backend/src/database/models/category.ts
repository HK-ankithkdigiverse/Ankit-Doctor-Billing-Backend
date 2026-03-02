import mongoose from "mongoose";
import { MODEL } from "../../common";

export interface ICategory extends mongoose.Document {
  createdBy: mongoose.Types.ObjectId;
  medicalStoreId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const categorySchema = new mongoose.Schema<ICategory>(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: MODEL.USER,
      required: true,
      index: true,
    },
    medicalStoreId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: MODEL.MEDICAL_STORE,
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, default: "", trim: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

categorySchema.index(
  { medicalStoreId: 1, name: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

export const CategoryModel = mongoose.model<ICategory>(MODEL.CATEGORY, categorySchema);

export const ensureCategoryCollectionIndexes = async () => {
  await CategoryModel.syncIndexes();
};
