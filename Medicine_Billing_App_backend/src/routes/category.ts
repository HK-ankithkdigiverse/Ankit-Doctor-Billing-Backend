import { Router } from "express";
import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  getActiveCategoriesForDropdown,
} from "../controllers/category/index";
import { authMiddleware } from "../middleware/auth";
import { validate } from "../middleware/joi";
import {
  categoryIdParamSchema,
  categoryQuerySchema,
  createCategorySchema,
  updateCategorySchema,
} from "../validation";

const router = Router();


router.use(authMiddleware);

router.post("/", validate(createCategorySchema), createCategory);
router.get("/", validate(categoryQuerySchema, "query"), getCategories);
router.get("/dropdown", getActiveCategoriesForDropdown);
router.get("/:id", validate(categoryIdParamSchema, "params"), getCategoryById);
router.put("/:id", validate(categoryIdParamSchema, "params"), validate(updateCategorySchema), updateCategory);
router.delete("/:id", validate(categoryIdParamSchema, "params"), deleteCategory);

export const categoryRouter = router;
