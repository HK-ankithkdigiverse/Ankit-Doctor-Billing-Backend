import { Router } from "express";
import {
  createBill,
  getAllBills,
  getBillById,
  updateBill,
  deleteBill,
} from "../controllers/bill";
import { authMiddleware } from "../middleware/auth";
import { validate } from "../middleware/joi";
import { billIdParamSchema, createBillSchema, updateBillSchema } from "../validation";

const router = Router();
router.use(authMiddleware);

router.post("/", validate(createBillSchema), createBill);
router.get("/", getAllBills);
router.get("/:id", validate(billIdParamSchema, "params"), getBillById);
router.put("/:id", validate(billIdParamSchema, "params"), validate(updateBillSchema), updateBill);
router.delete("/:id", validate(billIdParamSchema, "params"), deleteBill);

export const billRouter = router;
