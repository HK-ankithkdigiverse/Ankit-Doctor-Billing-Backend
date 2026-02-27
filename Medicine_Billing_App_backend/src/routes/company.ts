import { Router } from "express";
import {
  createCompany,
  getAllCompanies,
  getSingleCompany,
  updateCompany,
  deleteCompany,
} from "../controllers/company";
import { authMiddleware } from "../middleware/auth";
import { handleUploadError, upload } from "../middleware/upload";
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
  upload.array("logo", 1),
  handleUploadError,
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
  upload.array("logo", 1),
  handleUploadError,
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

export const companyRouter = router;
