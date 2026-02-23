import Joi from "joi";

const email = Joi.string().trim().lowercase().email();
const phone = Joi.string().trim().pattern(/^[0-9]{10}$/);
const gst = Joi.string().trim().uppercase().pattern(/^[0-9A-Z]{15}$/);

export const createCompanySchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).optional(),
  companyName: Joi.string().trim().min(2).max(120).optional(),
  gstNumber: gst.required(),
  email: email.allow("").optional(),
  phone: phone.allow("").optional(),
  state: Joi.string().trim().max(80).allow("").optional(),
  address: Joi.string().trim().max(500).allow("").optional(),
}).or("name", "companyName");

export const updateCompanySchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).optional(),
  companyName: Joi.string().trim().min(2).max(120).optional(),
  gstNumber: gst.optional(),
  email: email.allow("").optional(),
  phone: phone.allow("").optional(),
  state: Joi.string().trim().max(80).allow("").optional(),
  address: Joi.string().trim().max(500).allow("").optional(),
}).min(1);

export const companyIdParamSchema = Joi.object({
  id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
});
