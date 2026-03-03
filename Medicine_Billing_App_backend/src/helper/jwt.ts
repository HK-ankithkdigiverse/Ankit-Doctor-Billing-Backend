import jwt, { JwtPayload } from "jsonwebtoken";

export interface AuthPayload {
  _id: string;
  role?: string;
  medicalStoreId?: string;
}

export const generateToken = (payload: AuthPayload): string => {
  return jwt.sign(payload, process.env.JWT_TOKEN_SECRET as string, {
    expiresIn: "10s",
  });
};

export const verifyToken = (token: string): AuthPayload & JwtPayload => {
  return jwt.verify(
    token,
    process.env.JWT_TOKEN_SECRET as string
  ) as AuthPayload & JwtPayload;
};
