import Joi from "joi";
import { ROLE } from "../common";

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);
const email = Joi.string().trim().lowercase().email();
const phone = Joi.string().trim().pattern(/^[0-9]{10}$/);
const nameField = Joi.string().trim().min(2).max(100);
const medicalName = Joi.string().trim().min(2).max(120);
const address = Joi.string().trim().min(3).max(500);
const state = Joi.string().trim().min(2).max(80);
const city = Joi.string().trim().min(2).max(80);
const pincode = Joi.string().trim().pattern(/^[0-9]{6}$/);
const gstNumber = Joi.string().trim().uppercase().pattern(/^[0-9A-Z]{15}$/);
const panCardNumber = Joi.string().trim().uppercase().pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/);

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
  name: nameField.required(),
  medicalName: medicalName.required(),
  email: email.required(),
  password: Joi.string().min(6).max(64).required(),
  phone: phone.allow("").optional(),
  address: address.required(),
  state: state.required(),
  city: city.required(),
  pincode: pincode.required(),
  gstNumber: gstNumber.required(),
  panCardNumber: panCardNumber.required(),
  role: Joi.string()
    .valid(...Object.values(ROLE))
    .optional(),
  isActive: Joi.boolean().optional(),
});

export const updateProfileSchema = Joi.object({
  name: nameField.optional(),
  medicalName: medicalName.optional(),
  email: email.optional(),
  phone: phone.allow("").optional(),
  address: address.optional(),
  state: state.optional(),
  city: city.optional(),
  pincode: pincode.optional(),
  gstNumber: gstNumber.optional(),
  panCardNumber: panCardNumber.optional(),
}).min(1);

export const updateUserSchema = Joi.object({
  name: nameField.optional(),
  medicalName: medicalName.optional(),
  email: email.optional(),
  phone: phone.allow("").optional(),
  address: address.optional(),
  state: state.optional(),
  city: city.optional(),
  pincode: pincode.optional(),
  gstNumber: gstNumber.optional(),
  panCardNumber: panCardNumber.optional(),
  role: Joi.string()
    .valid(...Object.values(ROLE))
    .optional(),
  isActive: Joi.boolean().optional(),
}).min(1);

export const idParamSchema = Joi.object({
  id: objectId.required(),
});
  
