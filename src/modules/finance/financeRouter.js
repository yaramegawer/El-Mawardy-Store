import { Router } from "express";
import * as financeController from "./financeController.js";
import * as financeSchema from "./financeSchema.js";
import { validation } from "../../middlewares/validationMiddleware.js";

const router = Router();

router.get(
  "/overview",
  validation(financeSchema.financeOverview),
  financeController.getFinanceOverview
);
router.get("/settings", financeController.getFinanceSettings);
router.put(
  "/settings",
  validation(financeSchema.updateFinanceSettings),
  financeController.updateFinanceSettings
);

router.post(
  "/inventory",
  validation(financeSchema.createInventoryPurchase),
  financeController.createInventoryPurchase
);
router.get(
  "/inventory",
  validation(financeSchema.listInventory),
  financeController.getInventoryPurchases
);
router.patch(
  "/inventory/:id",
  validation(financeSchema.updateInventoryPurchase),
  financeController.updateInventoryPurchase
);
router.delete(
  "/inventory/:id",
  validation(financeSchema.inventoryById),
  financeController.deleteInventoryPurchase
);

export default router;
