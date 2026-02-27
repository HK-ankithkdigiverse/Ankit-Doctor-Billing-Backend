import { Router } from "express";
import {authRouter} from "./auth";
import {uploadRouter} from "./upload";
import {companyRouter} from "./company";
import {productRouter} from "./product";
import {billRouter} from "./bill";
import {userRouter} from "./user";
import {categoryRouter} from "./category";

const router = Router();

router.use("/auth", authRouter);
router.use("/upload", uploadRouter);
router.use("/companies", companyRouter);
router.use("/products", productRouter);
router.use("/bills", billRouter);
router.use("/users", userRouter);
router.use("/categories", categoryRouter);

export default router;

