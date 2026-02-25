import mongoose, { Document } from "mongoose";
import { MODEL, ROLE } from "../../common";

export interface IAuth extends Document {
  name: string;
  medicalName: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  state: string;
  city: string;
  pincode: string;
  gstNumber: string;
  panCardNumber: string;
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
    medicalName: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      trim: true,
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
    panCardNumber: {
      type: String,
      trim: true,
      uppercase: true,
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
