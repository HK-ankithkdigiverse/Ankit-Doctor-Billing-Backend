import Joi from "joi";
import { ROLE } from "../common";
import {
  emailSchema,
  nameSchema,
  objectIdSchema,
  phoneSchema,
} from "./common";

export const loginSchema = Joi.object({
  email: emailSchema.required(),
  password: Joi.string().min(6).required(),
});

export const verifyOtpSchema = Joi.object({
  email: emailSchema.required(),
  otp: Joi.string().trim().pattern(/^[0-9]{6}$/).required(),
});

export const forgotPasswordSchema = Joi.object({
  email: emailSchema.required(),
});

export const resetPasswordSchema = Joi.object({
  email: emailSchema.required(),
  otp: Joi.string().trim().pattern(/^[0-9]{6}$/).required(),
  newPassword: Joi.string().min(6).max(64).required(),
});

export const changePasswordSchema = Joi.object({
  oldPassword: Joi.string().min(6).required(),
  newPassword: Joi.string().min(6).max(64).required(),
});

export const createUserSchema = Joi.object({
  name: nameSchema.required(),
  email: emailSchema.required(),
  phoneNumber: phoneSchema.allow("").optional(),
  password: Joi.string().min(6).max(64).required(),
  signature: Joi.string().trim().allow("").optional(),
  role: Joi.string()
    .valid(...Object.values(ROLE))
    .optional(),
  isActive: Joi.boolean().optional(),
  // medicalStoreId is required for non-admin roles but not for ADMIN
  medicalStoreId: Joi.alternatives().conditional("role", {
    is: ROLE.ADMIN,
    then: objectIdSchema.optional().allow(null),
    otherwise: objectIdSchema.required(),
  }),
});

export const updateProfileSchema = Joi.object({
  name: nameSchema.optional(),
  email: emailSchema.optional(),
  phoneNumber: phoneSchema.allow("").optional(),
  signature: Joi.string().trim().allow("").optional(),
}).min(1);

export const updateUserSchema = Joi.object({
  name: nameSchema.optional(),
  email: emailSchema.optional(),
  phoneNumber: phoneSchema.allow("").optional(),
  signature: Joi.string().trim().allow("").optional(),
  role: Joi.string()
    .valid(...Object.values(ROLE))
    .optional(),
  isActive: Joi.boolean().optional(),
  medicalStoreId: objectIdSchema.optional(),
}).min(1);

export const idParamSchema = Joi.object({
  id: objectIdSchema.required(),
});
