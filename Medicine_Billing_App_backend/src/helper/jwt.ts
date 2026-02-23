import jwt, { JwtPayload } from "jsonwebtoken";

export interface AuthPayload {
  _id: string;
  role?: string;
}

const getJwtSecret = (): string => {
  const secret = process.env.JWT_TOKEN_SECRET;
  if (!secret) {
    throw new Error("JWT_TOKEN_SECRET is missing");
  }
  return secret;
};

export const generateToken = (payload: AuthPayload): string => {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: "1d",
  });
};

export const verifyToken = (token: string): AuthPayload & JwtPayload => {
  return jwt.verify(
    token,
    getJwtSecret()
  ) as AuthPayload & JwtPayload;
};
