import mongoose, { Document } from "mongoose";
import { GST_TYPE, MODEL } from "../../common";

export interface IMedicalStore extends Document {
  name: string;
  phone: string;
  address: string;
  state: string;
  city: string;
  pincode: string;
  gstNumber: string;
  gstType: GST_TYPE;
  gstPercent: number;
  panCardNumber: string;
  isActive: boolean;
  isDeleted: boolean;
  createdBy?: mongoose.Types.ObjectId;
}

const medicalStoreSchema = new mongoose.Schema<IMedicalStore>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    state: {
      type: String,
      trim: true,
      default: "",
    },
    city: {
      type: String,
      trim: true,
      default: "",
    },
    pincode: {
      type: String,
      trim: true,
      default: "",
    },
    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },
    gstType: {
      type: String,
      enum: Object.values(GST_TYPE),
      default: GST_TYPE.CGST_SGST,
      required: true,
    },
    gstPercent: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
      required: true,
    },
    panCardNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: MODEL.USER,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

medicalStoreSchema.index(
  { name: 1, gstNumber: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

export const MedicalStoreModel = mongoose.model<IMedicalStore>(
  MODEL.MEDICAL_STORE,
  medicalStoreSchema
);

export const ensureMedicalStoreCollectionIndexes = async () => {
  await MedicalStoreModel.syncIndexes();
};
