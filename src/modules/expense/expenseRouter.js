import { Router } from "express";
import {
  createExpense,
  getAllExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
} from "./expenseController.js";
import { validation } from "../../middlewares/validationMiddleware.js";
import { createExpenseSchema, updateExpenseSchema } from "./expenseSchema.js";

const router = Router();

router.post("/", validation(createExpenseSchema), createExpense);
router.get("/", getAllExpenses);
router.get("/:id", getExpenseById);
router.patch("/:id",  updateExpense);
router.delete("/:id", deleteExpense);

export default router;