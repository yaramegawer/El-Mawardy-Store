import joi from "joi";
import { isValidObjectId } from "../../middlewares/validationMiddleware.js";

export const createOrder = joi.object({
  products: joi.array().items(
    joi.object({
      productId: joi.string().custom(isValidObjectId).required(),
      quantity:  joi.number().integer().min(1).optional(), // optional — falls back to product default
      color:     joi.string().optional(),
      size:      joi.string().optional(),
      customPrice: joi.number().min(0).optional(), // Custom selling price for this specific order item
      customDiscount: joi.number().min(0).max(100).optional(), // Custom discount percentage (0-100)
    })
  ).min(1).required(),
  customerName:         joi.string().required(),
  phone:                joi.string().required(),
  email:                joi.string().email().optional(),
  address:              joi.string().required(),
  government:           joi.string().required(),
  shippingCost:         joi.number().min(0).required(),
  depositPaymentMethod: joi.string().valid("vodafone_cash").required(),
  duePaymentMethod:     joi.string().valid("vodafone_cash", "cash_on_delivery").required(),
  source:               joi.string().valid("online", "store").optional(),
  notes:                joi.string().optional(), // FIX: was missing — controller destructures and saves it
});

export const updateOrderStatus = joi.object({
  id: joi.string().custom(isValidObjectId).optional(),
  // FIX: "delivered" and "cancelled" were missing.
  // The controller sets paymentStatus = "completed" on "delivered",
  // so blocking it here would silently prevent that transition.
  status: joi.string()
    .valid("pending", "confirmed", "shipped", "delivered", "cancelled")
    .required(),
  paymentStatus: joi.string()
    .valid("pending", "deposit_sent", "completed", "deposit_returned")
    .optional(), // Allow manual override of payment status
  notes: joi.string().optional(),
});

export const confirmDeposit = joi.object({
  id: joi.string().custom(isValidObjectId).optional(),
});

export const financeAnalytics = joi.object({
  id:        joi.any().forbidden(),
  startDate: joi.date().optional(),
  endDate:   joi.date().optional(),
});

export const deleteOrder = joi.object({
  id: joi.string().custom(isValidObjectId).optional(),
});

export const returnOrder = joi.object({
  id: joi.string().custom(isValidObjectId).optional(),
  returnReason: joi.string().trim().min(1).required(),
});

export const exchangeOrderProducts = joi.object({
  id: joi.string().custom(isValidObjectId).optional(),
  exchangeItems: joi.array().items(
    joi.object({
      // FIX: was joi.number().integer() — the controller now looks up line items
      // by their Mongoose subdocument _id (a MongoDB ObjectId string), not by
      // array index. An integer would always fail the order.products.id() lookup.
      originalLineItemId: joi.string().custom(isValidObjectId).required(),
      newProductId:       joi.string().custom(isValidObjectId).required(),
      quantity:           joi.number().integer().min(1).required(),
      newColor:           joi.string().optional(),
      newSize:            joi.string().optional(),
    })
  ).min(1).required(),
  exchangeReason: joi.string().trim().min(1).required(),
});

export const returnOrderItems = joi.object({
  id: joi.string().custom(isValidObjectId).optional(),
  returnItems: joi.array().items(
    joi.object({
      originalLineItemId: joi.string().custom(isValidObjectId).required(),
      quantity:           joi.number().integer().min(1).required(),
    })
  ).min(1).required(),
  returnReason: joi.string().trim().min(1).required(),
});

export const approveReturn = joi.object({
  id: joi.string().custom(isValidObjectId).optional(),
  returnId: joi.string().custom(isValidObjectId).required(),
});

export const rejectReturn = joi.object({
  id: joi.string().custom(isValidObjectId).optional(),
  returnId: joi.string().custom(isValidObjectId).required(),
  rejectionReason: joi.string().optional(),
});

export const completeReturn = joi.object({
  id: joi.string().custom(isValidObjectId).optional(),
  returnId: joi.string().custom(isValidObjectId).required(),
});

export const approveExchange = joi.object({
  id: joi.string().custom(isValidObjectId).optional(),
  exchangeId: joi.string().custom(isValidObjectId).required(),
});

export const rejectExchange = joi.object({
  id: joi.string().custom(isValidObjectId).optional(),
  exchangeId: joi.string().custom(isValidObjectId).required(),
  rejectionReason: joi.string().optional(),
});

export const completeExchange = joi.object({
  id: joi.string().custom(isValidObjectId).optional(),
  exchangeId: joi.string().custom(isValidObjectId).required(),
});