import Joi from "joi";
import { GST_TYPE } from "../common";
import {
  addressSchema,
  citySchema,
  gstNumberSchema,
  longNameSchema,
  objectIdSchema,
  panCardSchema,
  phoneSchema,
  pincodeSchema,
  shortStateSchema,
} from "./common";

const gstTypeSchema = Joi.string()
  .trim()
  .uppercase()
  .valid(GST_TYPE.IGST, GST_TYPE.CGST_SGST, "CGST & SGST");

export const createMedicalStoreSchema = Joi.object({
  name: longNameSchema.required(),
  phone: phoneSchema.required(),
  address: addressSchema.required(),
  state: shortStateSchema.required(),
  city: citySchema.required(),
  pincode: pincodeSchema.required(),
  gstNumber: gstNumberSchema.required(),
  gstType: gstTypeSchema.required(),
  panCardNumber: panCardSchema.required(),
  isActive: Joi.boolean().optional(),
});

export const updateMedicalStoreSchema = Joi.object({
  name: longNameSchema.optional(),
  phone: phoneSchema.optional(),
  address: addressSchema.optional(),
  state: shortStateSchema.optional(),
  city: citySchema.optional(),
  pincode: pincodeSchema.optional(),
  gstNumber: gstNumberSchema.optional(),
  gstType: gstTypeSchema.optional(),
  panCardNumber: panCardSchema.optional(),
  isActive: Joi.boolean().optional(),
}).min(1);

export const medicalStoreIdParamSchema = Joi.object({
  id: objectIdSchema.required(),
});
