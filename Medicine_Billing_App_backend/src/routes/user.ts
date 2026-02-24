import { Router } from "express";
import {
  getProfile,
  updateUser,
  deleteUser,
  getAllUsers,
  adminUpdateUser,
} from "../controllers/user";
import { adminCreateUser, changePassword } from "../controllers/auth/index";
import { authMiddleware } from "../middleware/auth";
import { allowRoles } from "../middleware/role";
import { validate } from "../middleware/joi";
import {
  changePasswordSchema,
  createUserSchema,
  idParamSchema,
  updateProfileSchema,
  updateUserSchema,
} from "../validation";

const router = Router();

/* ================= USER (login required) ================= */
router.get("/me", authMiddleware, getProfile);
router.put("/me", authMiddleware, validate(updateProfileSchema), updateUser);
router.put("/me/password", authMiddleware, validate(changePasswordSchema), changePassword);

/* ================= ADMIN ONLY ================= */
router.get("/", authMiddleware, allowRoles("ADMIN"), getAllUsers);
router.post("/", authMiddleware, allowRoles("ADMIN"), validate(createUserSchema), adminCreateUser);
router.put("/:id", authMiddleware, allowRoles("ADMIN"), validate(idParamSchema, "params"), validate(updateUserSchema), adminUpdateUser);
router.delete("/:id", authMiddleware, allowRoles("ADMIN"), validate(idParamSchema, "params"), deleteUser);

export default router;
