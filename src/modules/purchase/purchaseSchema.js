import Joi from "joi";

export const createPurchaseSchema = Joi.object({
  supplier: Joi.string().required(),
  products: Joi.array().items(
    Joi.object({
      productId: Joi.string().required(),

    })
  ).required(),
  paymentMethod: Joi.string().valid("cash", "vodafone_cash", "bank").default("cash"),
  notes: Joi.string(),
});

export const updatePurchaseSchema = Joi.object({
  supplier: Joi.string(),
  paymentMethod: Joi.string().valid("cash", "vodafone_cash", "bank"),
  notes: Joi.string(),
});