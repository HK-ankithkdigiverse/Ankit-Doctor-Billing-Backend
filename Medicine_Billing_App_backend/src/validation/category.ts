import Joi from "joi";
import { descriptionSchema, limit100Schema, nameSchema, objectIdSchema, pageSchema } from "./common";

export const createCategorySchema = Joi.object({
  name: nameSchema.required(),
  description: descriptionSchema.optional(),
});

export const updateCategorySchema = Joi.object({
  name: nameSchema.optional(),
  description: descriptionSchema.optional(),
}).min(1);

export const categoryIdParamSchema = Joi.object({
  id: objectIdSchema.required(),
});

export const categoryQuerySchema = Joi.object({
  page: pageSchema.optional(),
  limit: limit100Schema.optional(),
  search: Joi.string().trim().allow("").optional(),
});
