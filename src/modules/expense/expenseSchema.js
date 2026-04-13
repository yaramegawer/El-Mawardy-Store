import Joi from "joi";

export const createExpenseSchema = Joi.object({
  description: Joi.string().required(),
  amount: Joi.number().positive().required(),
  category: Joi.string().required(),
  paymentMethod: Joi.string().valid("vodafone_cash", "cash", "bank").default("cash"),
  notes: Joi.string(),
});

export const updateExpenseSchema = Joi.object({
  description: Joi.string(),
  amount: Joi.number().positive(),
  category: Joi.string(),
  paymentMethod: Joi.string().valid("vodafone_cash", "cash", "bank"),
  notes: Joi.string(),
});