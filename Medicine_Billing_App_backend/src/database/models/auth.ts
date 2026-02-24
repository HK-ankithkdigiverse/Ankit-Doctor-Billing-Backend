import mongoose, { Document } from "mongoose";
import { MODEL, ROLE } from "../../common";

export interface IAuth extends Document {
  name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  role: ROLE;
  isActive: boolean;
  isDeleted: boolean;
}

const userSchema = new mongoose.Schema<IAuth>(
  {
    name: {
      type: String,
      required: true, // ✅ FIX
      trim: true,
    },
    email: {
      type: String,
      required: true, // ✅ FIX
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true, // ✅ FIX
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
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
