import { Schema, model, Document, Types } from "mongoose";
import { MODEL } from "../../common";

export interface ICompany extends Document {
  userId: Types.ObjectId;
  medicalStoreId: Types.ObjectId;
  name: string;
  gstNumber: string;
  address?: string;
  phone?: string;
  email?: string;
  state?: string;
  logo?: string;
  isActive: boolean;
  isDeleted: boolean;
}

const companySchema = new Schema<ICompany>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: MODEL.USER,
      required: true,
    },
    medicalStoreId: {
      type: Schema.Types.ObjectId,
      ref: MODEL.MEDICAL_STORE,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    gstNumber: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    state: {
      type: String,
      trim: true,
    },
    logo: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

companySchema.index(
  { medicalStoreId: 1, name: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);
companySchema.index(
  { medicalStoreId: 1, gstNumber: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

export const CompanyModel = model<ICompany>(MODEL.COMPANY, companySchema);

export const ensureCompanyCollectionIndexes = async () => {
  await CompanyModel.syncIndexes();
};
