import Joi from "joi";

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);

/* =========================
   ITEM SCHEMA
========================= */
const billItemSchema = Joi.object({
  productId: objectId.required(),

  qty: Joi.number().positive().required(),
  freeQty: Joi.number().min(0).optional(),

  rate: Joi.number().positive().required(),
  mrp: Joi.number().positive().optional(),

  taxPercent: Joi.number().min(0).optional(),
  discount: Joi.number().min(0).optional(),
});

/* =========================
   CREATE BILL
========================= */
export const createBillSchema = Joi.object({
  companyId: objectId.required(),

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
  companyId: objectId.optional(),
  discount: Joi.number().min(0).optional(),
  items: Joi.array().items(billItemSchema).min(1).optional(),
}).min(1);

/* =========================
   ID PARAM
========================= */
export const billIdParamSchema = Joi.object({
  id: objectId.required(),
});
