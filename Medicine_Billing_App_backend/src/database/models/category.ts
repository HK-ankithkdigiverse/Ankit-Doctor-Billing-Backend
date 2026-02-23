import mongoose from "mongoose";
import { MODEL } from "../../common";

export interface ICategory extends mongoose.Document {
  createdBy: mongoose.Types.ObjectId;
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
    name: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, default: "", trim: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Prevent duplicate active category names per user.
categorySchema.index(
  { createdBy: 1, name: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

export const CategoryModel = mongoose.model<ICategory>(MODEL.CATEGORY, categorySchema);

export const ensureCategoryCollectionIndexes = async () => {
  try {
    const indexes = await CategoryModel.collection.indexes();
    const hasLegacyNameIndex = indexes.some((index) => index.name === "name_1");
    const hasLegacyCreatedByUnique = indexes.some(
      (index) => index.name === "createdBy_1" && index.unique
    );

    if (hasLegacyNameIndex) {
      await CategoryModel.collection.dropIndex("name_1");
      console.log("Dropped legacy category index: name_1");
    }

    if (hasLegacyCreatedByUnique) {
      await CategoryModel.collection.dropIndex("createdBy_1");
      console.log("Dropped legacy category index: createdBy_1 (unique)");
    }
  } catch (error: any) {
    if (error?.codeName !== "IndexNotFound") {
      console.error("CATEGORY INDEX CLEANUP ERROR:", error);
    }
  }
};
