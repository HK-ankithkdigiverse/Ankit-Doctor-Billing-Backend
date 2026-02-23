import mongoose, { Document } from "mongoose";
import { MODEL } from "../../common";

export interface IOtp extends Document {
  email: string;
  otp: string;
  expireAt: Date;
}

const otpSchema = new mongoose.Schema<IOtp>(
  {
    email: { type: String, required: true },
    otp: { type: String, required: true },
    expireAt: { type: Date, required: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export default mongoose.model<IOtp>(MODEL.OTP, otpSchema);