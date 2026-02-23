import { Router } from "express";
import {
  createCompany,
  getAllCompanies,
  getSingleCompany,
  updateCompany,
  deleteCompany,
} from "../controllers/company";
import { authMiddleware } from "../middleware/auth";
import { upload } from "../middleware/upload";
import { validate } from "../middleware/joi";
import {
  companyIdParamSchema,
  createCompanySchema,
  updateCompanySchema,
} from "../validation";

const router = Router();

router.post(
  "/",
  authMiddleware,
  upload.single("logo"),
  validate(createCompanySchema),
  createCompany
);

router.get("/", authMiddleware, getAllCompanies);

router.get(
  "/:id",
  authMiddleware,
  validate(companyIdParamSchema, "params"),
  getSingleCompany
);

router.put(
  "/:id",
  authMiddleware,
  upload.single("logo"),
  validate(companyIdParamSchema, "params"),
  validate(updateCompanySchema),
  updateCompany
);

router.delete(
  "/:id",
  authMiddleware,
  validate(companyIdParamSchema, "params"),
  deleteCompany
);

export default router;
