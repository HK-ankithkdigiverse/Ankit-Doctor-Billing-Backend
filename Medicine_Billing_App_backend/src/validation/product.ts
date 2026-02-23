import Joi from "joi";

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);

export const createProductSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  category: Joi.string().trim().min(2).max(120).required(),
  productType: Joi.string().trim().min(2).max(120).required(),
  companyId: objectId.required(),
  mrp: Joi.number().positive().required(),
  price: Joi.number().positive().required(),
  taxPercent: Joi.number().min(0).max(100).required(),
  stock: Joi.number().min(0).required(),
});

export const updateProductSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).optional(),
  category: Joi.string().trim().min(2).max(120).optional(),
  productType: Joi.string().trim().min(2).max(120).optional(),
  companyId: objectId.optional(),
  mrp: Joi.number().positive().optional(),
  price: Joi.number().positive().optional(),
  taxPercent: Joi.number().min(0).max(100).optional(),
  stock: Joi.number().min(0).optional(),
}).min(1);

export const productIdParamSchema = Joi.object({
  id: objectId.required(),
});

export const productQuerySchema = Joi.object({
  category: Joi.string().trim().allow("").optional(),
  productType: Joi.string().trim().allow("").optional(),
  companyId: objectId.optional(),
  search: Joi.string().trim().allow("").optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(1000).optional(),
});
