import Joi from "joi";

export const createCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  description: Joi.string().trim().max(500).allow("").optional(),
});

export const updateCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  description: Joi.string().trim().max(500).allow("").optional(),
}).min(1);

export const categoryIdParamSchema = Joi.object({
  id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
});

export const categoryQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  search: Joi.string().trim().allow("").optional(),
});
