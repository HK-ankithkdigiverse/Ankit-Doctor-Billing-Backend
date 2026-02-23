import { JwtPayload } from "jsonwebtoken";
import { Types } from "mongoose";

export interface AuthJwtPayload extends JwtPayload {
  _id: string | Types.ObjectId;
  role: string;
  company_id?: string | Types.ObjectId;
}
