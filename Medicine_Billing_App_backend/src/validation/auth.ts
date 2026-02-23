import Joi from "joi";
import { ROLE } from "../common";

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);
const email = Joi.string().trim().lowercase().email();
const phone = Joi.string().trim().pattern(/^[0-9]{10}$/);

export const loginSchema = Joi.object({
  email: email.required(),
  password: Joi.string().min(6).required(),
});

export const verifyOtpSchema = Joi.object({
  email: email.required(),
  otp: Joi.string().trim().pattern(/^[0-9]{6}$/).required(),
});

export const forgotPasswordSchema = Joi.object({
  email: email.required(),
});

export const resetPasswordSchema = Joi.object({
  email: email.required(),
  otp: Joi.string().trim().pattern(/^[0-9]{6}$/).required(),
  newPassword: Joi.string().min(6).max(64).required(),
});

export const changePasswordSchema = Joi.object({
  oldPassword: Joi.string().min(6).required(),
  newPassword: Joi.string().min(6).max(64).required(),
});

export const createUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: email.required(),
  password: Joi.string().min(6).max(64).required(),
  phone: phone.allow("").optional(),
  address: Joi.string().trim().max(500).allow("").optional(),
  role: Joi.string()
    .valid(...Object.values(ROLE))
    .optional(),
});

export const updateProfileSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  email: email.optional(),
  phone: phone.allow("").optional(),
  address: Joi.string().trim().max(500).allow("").optional(),
}).min(1);

export const updateUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  email: email.optional(),
  phone: phone.allow("").optional(),
  address: Joi.string().trim().max(500).allow("").optional(),
  role: Joi.string()
    .valid(...Object.values(ROLE))
    .optional(),
}).min(1);

export const idParamSchema = Joi.object({
  id: objectId.required(),
});
  
