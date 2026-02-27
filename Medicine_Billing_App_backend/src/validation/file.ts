import Joi from "joi";
import { limit100Schema, pageSchema } from "./common";

export const getFilesValidator = Joi.object({
  page: pageSchema
    .default(1)
    .messages({
      "number.base": "Page must be a number",
      "number.min": "Page must be at least 1",
    }),

  limit: limit100Schema
    .default(10)
    .messages({
      "number.base": "Limit must be a number",
      "number.min": "Limit must be at least 1",
      "number.max": "Limit cannot exceed 100",
    }),

  type: Joi.string()
    .valid("image", "pdf")
    .optional()
    .messages({
      "any.only": "Type must be either 'image' or 'pdf'",
    }),
});
