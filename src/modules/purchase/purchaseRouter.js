import { Router } from "express";
import {
  createPurchase,
  getAllPurchases,
  getPurchaseById,
  updatePurchase,
  deletePurchase,
} from "./purchaseController.js";
import { validation } from "../../middlewares/validationMiddleware.js";
import { createPurchaseSchema, updatePurchaseSchema } from "./purchaseSchema.js";

const router = Router();

router.post("/", validation(createPurchaseSchema), createPurchase);
router.get("/", getAllPurchases);
router.get("/:id", getPurchaseById);
router.patch("/:id", validation(updatePurchaseSchema), updatePurchase);
router.delete("/:id", deletePurchase);

export default router;