import mongoose, { Document } from "mongoose";
import { MODEL, ROLE } from "../../common";

export interface IAuth extends Document {
  name: string;
  email: string;
  phoneNumber?: string;
  password: string;
  medicalStoreId?: mongoose.Types.ObjectId;
  signature: string;
  role: ROLE;
  isActive: boolean;
  isDeleted: boolean;
}

const userSchema = new mongoose.Schema<IAuth>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
      default: "",
    },
    password: {
      type: String,
      required: true,
    },
    medicalStoreId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: MODEL.MEDICAL_STORE,
      index: true,
      default: null,
    },
    signature: {
      type: String,
      trim: true,
      default: "",
    },
    role: {
      type: String,
      enum: Object.values(ROLE),
      default: ROLE.USER,
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
  {
    timestamps: true,
    versionKey: false,
  }
);

export default mongoose.model<IAuth>(MODEL.USER, userSchema);
