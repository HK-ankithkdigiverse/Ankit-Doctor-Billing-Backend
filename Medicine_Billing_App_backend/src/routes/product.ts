import { Router } from "express";
import {
  createProduct,
  getProducts,
  updateProduct,
  deleteProduct,
  getProductById
,
} from "../controllers/Product/index";

import { authMiddleware } from "../middleware/auth";
import { validate } from "../middleware/joi";
import {
  createProductSchema,
  productIdParamSchema,
  productQuerySchema,
  updateProductSchema,
} from "../validation";

const router = Router();

router.use(authMiddleware)

router.post("/", validate(createProductSchema), createProduct);
router.get("/", validate(productQuerySchema, "query"), getProducts);
router.put("/:id", validate(productIdParamSchema, "params"), validate(updateProductSchema), updateProduct);
router.get("/:id", validate(productIdParamSchema, "params"), getProductById);

router.delete("/:id", validate(productIdParamSchema, "params"), deleteProduct);

export const productRouter = router;

