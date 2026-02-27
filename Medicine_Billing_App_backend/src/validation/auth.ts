import Joi from "joi";
import { ROLE } from "../common";
import {
  addressSchema,
  citySchema,
  emailSchema,
  gstNumberSchema,
  longNameSchema,
  nameSchema,
  objectIdSchema,
  panCardSchema,
  phoneSchema,
  pincodeSchema,
  shortStateSchema,
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
  medicalName: longNameSchema.required(),
  email: emailSchema.required(),
  password: Joi.string().min(6).max(64).required(),
  signature: Joi.string().trim().allow("").optional(),
  phone: phoneSchema.allow("").optional(),
  address: addressSchema.required(),
  state: shortStateSchema.required(),
  city: citySchema.required(),
  pincode: pincodeSchema.required(),
  gstNumber: gstNumberSchema.required(),
  panCardNumber: panCardSchema.required(),
  role: Joi.string()
    .valid(...Object.values(ROLE))
    .optional(),
  isActive: Joi.boolean().optional(),
});

export const updateProfileSchema = Joi.object({
  name: nameSchema.optional(),
  medicalName: longNameSchema.optional(),
  email: emailSchema.optional(),
  signature: Joi.string().trim().allow("").optional(),
  phone: phoneSchema.allow("").optional(),
  address: addressSchema.optional(),
  state: shortStateSchema.optional(),
  city: citySchema.optional(),
  pincode: pincodeSchema.optional(),
  gstNumber: gstNumberSchema.optional(),
  panCardNumber: panCardSchema.optional(),
}).min(1);

export const updateUserSchema = Joi.object({
  name: nameSchema.optional(),
  medicalName: longNameSchema.optional(),
  email: emailSchema.optional(),
  signature: Joi.string().trim().allow("").optional(),
  phone: phoneSchema.allow("").optional(),
  address: addressSchema.optional(),
  state: shortStateSchema.optional(),
  city: citySchema.optional(),
  pincode: pincodeSchema.optional(),
  gstNumber: gstNumberSchema.optional(),
  panCardNumber: panCardSchema.optional(),
  role: Joi.string()
    .valid(...Object.values(ROLE))
    .optional(),
  isActive: Joi.boolean().optional(),
}).min(1);

export const idParamSchema = Joi.object({
  id: objectIdSchema.required(),
});
  
