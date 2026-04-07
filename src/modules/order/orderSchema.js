import joi from "joi";
import { isValidObjectId } from "../../middlewares/validationMiddleware.js";

export const createOrder = joi.object({
  products: joi.array().items(
    joi.object({
        productId: joi.string().custom(isValidObjectId).required(),
        quantity: joi.number().optional(),  // Optional - will use product default
        color: joi.string().optional(),
        size: joi.string().optional()
        // price removed - calculated automatically from product
    })
  ).min(1).required(),
  customerName: joi.string().required(),
    phone: joi.string().required(),
    email: joi.string().email().required(),
    address: joi.string().required(),
    government: joi.string().required(),
    shippingCost: joi.number().required(),
    depositPaymentMethod: joi.string().valid("vodafone_cash").required(),
    duePaymentMethod: joi.string().valid("vodafone_cash").required(),
    orderDate: joi.date().default(Date.now),
    paymentStatus: joi.string().valid("pending", "deposit_sent", "confirmed").default("pending"),
    paymentProof: joi.string().uri().optional(),
    status: joi.string().valid("pending", "confirmed", "shipped").default("pending")
});

export const updateOrderStatus = joi.object({
    id: joi.string().custom(isValidObjectId).required(),
    status: joi.string().valid("pending", "confirmed", "shipped").required()
});

export const confirmDeposit = joi.object({
    id: joi.string().custom(isValidObjectId).required()
});

export const deleteOrder = joi.object({
    id: joi.string().custom(isValidObjectId).required(),
});


