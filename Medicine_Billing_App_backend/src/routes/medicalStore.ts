import { Router } from "express";
import {
  createMedicalStore,
  deleteMedicalStore,
  getMedicalStoreById,
  getMedicalStores,
  updateMedicalStore,
} from "../controllers/medicalStore";
import { authMiddleware } from "../middleware/auth";
import { validate } from "../middleware/joi";
import { allowRoles } from "../middleware/role";
import {
  createMedicalStoreSchema,
  medicalStoreIdParamSchema,
  updateMedicalStoreSchema,
} from "../validation";

const router = Router();

router.post(
  "/",
  authMiddleware,
  allowRoles("ADMIN"),
  validate(createMedicalStoreSchema),
  createMedicalStore
);

router.get("/", authMiddleware, allowRoles("ADMIN"), getMedicalStores);

router.get(
  "/:id",
  authMiddleware,
  allowRoles("ADMIN"),
  validate(medicalStoreIdParamSchema, "params"),
  getMedicalStoreById
);

router.put(
  "/:id",
  authMiddleware,
  allowRoles("ADMIN"),
  validate(medicalStoreIdParamSchema, "params"),
  validate(updateMedicalStoreSchema),
  updateMedicalStore
);

router.delete(
  "/:id",
  authMiddleware,
  allowRoles("ADMIN"),
  validate(medicalStoreIdParamSchema, "params"),
  deleteMedicalStore
);

export const medicalStoreRouter = router;
