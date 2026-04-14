import Joi from "joi";
import { isValidObjectId } from "../../middlewares/validationMiddleware";

const validCategories = ["rent", "utilities", "marketing", "salaries", "supplies", "maintenance", "shipping", "ads", "vodafone_cash", "other_operating"];
const validPaymentMethods = ["vodafone_cash", "cash", "bank"];

export const createExpenseSchema = Joi.object({
  description: Joi.string().trim().min(1).required(),
  amount: Joi.number().positive().required(),
  category: Joi.string().valid(...validCategories).required(),
  paymentMethod: Joi.string().valid(...validPaymentMethods).default("cash"),
  notes: Joi.string().trim().allow(""),
});

