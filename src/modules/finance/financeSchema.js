import joi from "joi";
import { isValidObjectId } from "../../middlewares/validationMiddleware.js";

const dateRangeQuery = {
  startDate: joi.date().optional(),
  endDate: joi.date().optional(),
};

export const financeOverview = joi.object(dateRangeQuery);

export const updateFinanceSettings = joi
  .object({
    cashBaseline: joi.number().min(0).optional(),
    capitalMoney: joi.number().min(0).optional(),
  })
  .or("cashBaseline", "capitalMoney");

export const createInventoryPurchase = joi.object({
  description: joi.string().trim().min(1).required(),
  amount: joi.number().positive().required(),
  date: joi.date().optional(),
  supplier: joi.string().trim().allow("").optional(),
  paymentMethod: joi.string().valid("cash", "vodafone_cash", "bank").optional(),
  notes: joi.string().trim().allow("").optional(),
});

export const updateInventoryPurchase = joi.object({
  id: joi.string().custom(isValidObjectId).required(),
  description: joi.string().trim().min(1).optional(),
  amount: joi.number().positive().optional(),
  date: joi.date().optional(),
  supplier: joi.string().trim().allow("").optional(),
  paymentMethod: joi.string().valid("cash", "vodafone_cash", "bank").optional(),
  notes: joi.string().trim().allow("").optional(),
});

export const inventoryById = joi.object({
  id: joi.string().custom(isValidObjectId).required(),
});

export const listInventory = joi.object({
  ...dateRangeQuery,
  page: joi.number().integer().min(1).optional(),
  limit: joi.number().integer().min(1).max(100).optional(),
});
