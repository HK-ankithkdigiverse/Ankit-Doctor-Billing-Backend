import Joi from "joi";
import {
  addressSchema,
  emailSchema,
  gstNumberSchema,
  longNameSchema,
  objectIdSchema,
  phoneSchema,
} from "./common";

export const createCompanySchema = Joi.object({
  name: longNameSchema.optional(),
  companyName: longNameSchema.optional(),
  gstNumber: gstNumberSchema.required(),
  email: emailSchema.allow("").optional(),
  phone: phoneSchema.allow("").optional(),
  state: Joi.string().trim().max(80).allow("").optional(),
  address: addressSchema.allow("").optional(),
}).or("name", "companyName");

export const updateCompanySchema = Joi.object({
  name: longNameSchema.optional(),
  companyName: longNameSchema.optional(),
  gstNumber: gstNumberSchema.optional(),
  email: emailSchema.allow("").optional(),
  phone: phoneSchema.allow("").optional(),
  state: Joi.string().trim().max(80).allow("").optional(),
  address: addressSchema.allow("").optional(),
}).min(1);

export const companyIdParamSchema = Joi.object({
  id: objectIdSchema.required(),
});
