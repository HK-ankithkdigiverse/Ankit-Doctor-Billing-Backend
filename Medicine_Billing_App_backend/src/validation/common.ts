import Joi from "joi";

export const objectIdSchema = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);
export const emailSchema = Joi.string().trim().lowercase().email();
export const phoneSchema = Joi.string().trim().pattern(/^[0-9]{10}$/);
export const pincodeSchema = Joi.string().trim().pattern(/^[0-9]{6}$/);
export const gstNumberSchema = Joi.string().trim().uppercase().pattern(/^[0-9A-Z]{15}$/);
export const panCardSchema = Joi.string()
  .trim()
  .uppercase()
  .pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/);

export const nameSchema = Joi.string().trim().min(2).max(100);
export const longNameSchema = Joi.string().trim().min(2).max(120);
export const shortStateSchema = Joi.string().trim().min(2).max(80);
export const citySchema = Joi.string().trim().min(2).max(80);
export const addressSchema = Joi.string().trim().min(3).max(500);
export const descriptionSchema = Joi.string().trim().max(500).allow("");

export const pageSchema = Joi.number().integer().min(1);
export const limit100Schema = Joi.number().integer().min(1).max(100);
export const limit1000Schema = Joi.number().integer().min(1).max(1000);
