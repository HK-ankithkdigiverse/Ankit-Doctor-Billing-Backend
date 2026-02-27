import Joi from "joi";
import { objectIdSchema } from "./common";

/* =========================
   ITEM SCHEMA
========================= */
const billItemSchema = Joi.object({
  productId: objectIdSchema.required(),

  qty: Joi.number().positive().required(),
  freeQty: Joi.number().min(0).optional(),

  rate: Joi.number().positive().required(),
  mrp: Joi.number().positive().optional(),

  taxPercent: Joi.number().min(0).optional(),
  igst: Joi.number().min(0).optional(),
  discount: Joi.number().min(0).optional(),
});

/* =========================
   CREATE BILL
========================= */
export const createBillSchema = Joi.object({
  userId: objectIdSchema.optional(),
  companyId: objectIdSchema.required(),

  discount: Joi.number().min(0).optional(),

  items: Joi.array()
    .items(billItemSchema)
    .min(1)
    .required(),
});

/* =========================
   UPDATE BILL
========================= */
export const updateBillSchema = Joi.object({
  userId: objectIdSchema.optional(),
  companyId: objectIdSchema.optional(),
  discount: Joi.number().min(0).optional(),
  items: Joi.array().items(billItemSchema).min(1).optional(),
}).min(1);

/* =========================
   ID PARAM
========================= */
export const billIdParamSchema = Joi.object({
  id: objectIdSchema.required(),
});
