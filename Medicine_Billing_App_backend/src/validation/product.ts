import Joi from "joi";
import { limit1000Schema, nameSchema, objectIdSchema, pageSchema } from "./common";

export const createProductSchema = Joi.object({
  name: nameSchema.max(120).required(),
  category: nameSchema.max(120).required(),
  productType: nameSchema.max(120).required(),
  companyId: objectIdSchema.required(),
  mrp: Joi.number().positive().required(),
  price: Joi.number().positive().required(),
  stock: Joi.number().min(0).required(),
});

export const updateProductSchema = Joi.object({
  name: nameSchema.max(120).optional(),
  category: nameSchema.max(120).optional(),
  productType: nameSchema.max(120).optional(),
  companyId: objectIdSchema.optional(),
  mrp: Joi.number().positive().optional(),
  price: Joi.number().positive().optional(),
  stock: Joi.number().min(0).optional(),
}).min(1);

export const productIdParamSchema = Joi.object({
  id: objectIdSchema.required(),
});

export const productQuerySchema = Joi.object({
  category: Joi.string().trim().allow("").optional(),
  productType: Joi.string().trim().allow("").optional(),
  companyId: objectIdSchema.optional(),
  search: Joi.string().trim().allow("").optional(),
  page: pageSchema.optional(),
  limit: limit1000Schema.optional(),
});
